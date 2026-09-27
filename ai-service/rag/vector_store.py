from __future__ import annotations

import faiss
import json
import numpy as np
import os
import shutil
from pathlib import Path
from typing import Any, List

from langchain_core.documents import Document

from config import settings
from .embeddings import EmbeddingService
from .utils import RetrievedChunk, chunk_score_to_label
import logging

logger = logging.getLogger('ai-service.vector_store')


class VectorStoreManager:
    """Direct FAISS manager using `sentence-transformers` embeddings.

    Stores a FAISS index at `index_dir/index.faiss` and metadata at
    `index_dir/metadata.json`.
    """

    INDEX_NAME = 'index.faiss'
    METADATA_NAME = 'metadata.json'

    def __init__(self, settings_obj=settings):
        self.settings = settings_obj
        self.embedding_backend = EmbeddingService().build()
        self.index_dir = self.settings.vector_db_dir / 'faiss_index'
        self._index: faiss.Index | None = None
        self._metadata: list[dict[str, Any]] | None = None

    def _ensure_dir(self) -> None:
        self.index_dir.parent.mkdir(parents=True, exist_ok=True)
        self.index_dir.mkdir(parents=True, exist_ok=True)

    def _index_path(self) -> Path:
        return self.index_dir / self.INDEX_NAME

    def _metadata_path(self) -> Path:
        return self.index_dir / self.METADATA_NAME

    def _load(self) -> None:
        if self._index is not None and self._metadata is not None:
            return

        if not self.ready():
            raise FileNotFoundError('No vector index exists yet')

        index_path = str(self._index_path())
        self._index = faiss.read_index(index_path)

        with self._metadata_path().open('r', encoding='utf-8') as fh:
            self._metadata = json.load(fh)

    def rebuild(self, documents: list[Document]) -> None:
        """Build a fresh FAISS index from cleaned document chunks.

        Each document becomes one vector. Metadata for each vector is stored
        as a JSON array in `metadata.json` in the same folder as the index.
        """

        self._ensure_dir()
        if not documents:
            self.delete_index()
            return

        texts: List[str] = [doc.page_content for doc in documents]
        metadata_list: List[dict[str, Any]] = [doc.metadata or {} for doc in documents]

        logger.info('[FAISS] Computing embeddings for %d documents', len(texts))
        # Compute embeddings as float32 numpy array
        embeddings = np.array(self.embedding_backend.embed(texts), dtype='float32')
        # Normalize to unit length for cosine similarity via inner product
        faiss.normalize_L2(embeddings)

        dim = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)

        # Save index and metadata
        index_path = self._index_path()
        faiss.write_index(index, str(index_path))

        with self._metadata_path().open('w', encoding='utf-8') as fh:
            json.dump([{'metadata': m, 'page_content': t} for m, t in zip(metadata_list, texts)], fh)

        # In-memory cache
        self._index = index
        self._metadata = [{'metadata': m, 'page_content': t} for m, t in zip(metadata_list, texts)]

        logger.info('[FAISS] Index rebuilt and saved to %s (dim=%d, vectors=%d)', index_path, dim, len(texts))

    def delete_index(self) -> None:
        """Delete the saved FAISS index from disk."""

        if self.index_dir.exists():
            shutil.rmtree(self.index_dir)
        self._index = None
        self._metadata = None

    def ready(self) -> bool:
        """Check whether a persisted index exists."""

        return self._index_path().exists() and self._metadata_path().exists()

    def search(self, query: str, top_k: int = 5) -> list[RetrievedChunk]:
        """Run a simple similarity search and return scored chunks."""
        if not self.ready():
            logger.info('[FAISS] Search called but index not ready')
            return []

        self._load()

        # Embed and normalize query
        try:
            q_emb = np.array(self.embedding_backend.embed([query]), dtype='float32')
            faiss.normalize_L2(q_emb)
        except Exception:
            logger.exception('[FAISS] Embedding generation failed for query')
            return []

        try:
            distances, indices = self._index.search(q_emb, top_k)
        except Exception:
            logger.exception('[FAISS] Error during index.search')
            return []

        distances = distances[0]
        indices = indices[0]

        chunks: list[RetrievedChunk] = []
        for idx, score in zip(indices, distances):
            if idx < 0 or idx >= len(self._metadata):
                continue
            item = self._metadata[int(idx)]
            page_content = item.get('page_content', '')
            metadata = item.get('metadata', {})
            # Score is cosine similarity in [-1,1]; clamp to [0,1] for UI
            sim = float(score)
            sim = max(min(sim, 1.0), -1.0)
            sim_norm = (sim + 1.0) / 2.0  # map [-1,1] -> [0,1]
            chunks.append(RetrievedChunk(page_content=page_content, metadata=metadata or {}, score=sim_norm))

        logger.info('[FAISS] Search query=%s top_k=%d results=%d', (query[:200] + '...') if len(query) > 200 else query, top_k, len(chunks))
        return chunks

    def mmr_search(self, query: str, k: int = 10, fetch_k: int = 30) -> list[RetrievedChunk]:
        """Perform MMR-style retrieval using FAISS nearest neighbors as candidates."""
        if not self.ready():
            logger.info('[FAISS] MMR search called but index not ready')
            return []

        self._load()
        try:
            q_emb = np.array(self.embedding_backend.embed([query]), dtype='float32')
            faiss.normalize_L2(q_emb)
        except Exception:
            logger.exception('[FAISS] Embedding generation failed for MMR query')
            return []

        try:
            distances, indices = self._index.search(q_emb, fetch_k)
        except Exception:
            logger.exception('[FAISS] Error during index.search for MMR')
            return []

        distances = distances[0]
        indices = indices[0]

        # Convert to RetrievedChunk list
        candidates: list[RetrievedChunk] = []
        for idx, score in zip(indices, distances):
            if idx < 0 or idx >= len(self._metadata):
                continue
            item = self._metadata[int(idx)]
            page_content = item.get('page_content', '')
            metadata = item.get('metadata', {})
            sim = float(score)
            sim = max(min(sim, 1.0), -1.0)
            sim_norm = (sim + 1.0) / 2.0
            candidates.append(RetrievedChunk(page_content=page_content, metadata=metadata or {}, score=sim_norm))

        # Simple heuristic for MMR: pick top-k by score spaced by diversity (naive)
        selected: list[RetrievedChunk] = []
        for c in sorted(candidates, key=lambda x: x.score, reverse=True):
            if len(selected) >= k:
                break
            # ensure some diversity: skip if same document and very similar content
            if any(existing.metadata.get('document_id') == c.metadata.get('document_id') and existing.page_content[:200] == c.page_content[:200] for existing in selected):
                continue
            selected.append(c)

        logger.info('[FAISS][MMR] query=%s fetch_k=%d candidates=%d selected=%d', (query[:200] + '...') if len(query) > 200 else query, fetch_k, len(candidates), len(selected))
        return selected

    def confidence_label(self, results: list[RetrievedChunk]) -> str:
        """Translate retrieved evidence into a simple confidence label."""

        if not results:
            return 'Low'
        return chunk_score_to_label(results[0].score, fallback_count=len(results))
