from __future__ import annotations

from dataclasses import dataclass

from config import settings
from .utils import RetrievedChunk
from .vector_store import VectorStoreManager
import logging
from typing import List
from collections import OrderedDict
from .embeddings import EmbeddingService
from .vector_store import VectorStoreManager

logger = logging.getLogger('ai-service.retriever')


@dataclass(slots=True)
class RetrievalResult:
    """A normalized retrieval result used throughout the pipeline."""

    query: str
    chunks: list[RetrievedChunk]
    confidence: str


class RetrieverService:
    """Provide a small similarity-based retriever with metadata filtering."""

    def __init__(self, vector_store: VectorStoreManager, settings_obj=settings):
        self.vector_store = vector_store
        self.settings = settings_obj

    def retrieve(
        self,
        query: str,
        *,
        workspace_id: str | None = None,
        document_ids: list[str] | None = None,
        top_k: int | None = None,
        search_type: str = "mmr",
    ) -> RetrievalResult:
        """Search the vector store and filter results by workspace or document."""

        top_k = top_k or self.settings.retriever_top_k

        # Multi-query expansion (simple implementation: split query into sentences)
        queries = [query]
        if self.settings.multi_query_enabled:
            parts = [q.strip() for q in query.replace('?', '.').split('.') if q.strip()]
            if len(parts) > 1:
                queries = list(OrderedDict.fromkeys([query] + parts))

        # Run search across multiple queries and merge results
        all_results: List[RetrievedChunk] = []
        for q in queries:
            try:
                if search_type == 'mmr':
                    res = self.vector_store.mmr_search(q, k=self.settings.mmr_k, fetch_k=self.settings.mmr_fetch_k)
                else:
                    res = self.vector_store.search(q, top_k=self.settings.mmr_fetch_k)
                logger.info('[RETRIEVER] query_part="%s" results=%d', (q[:200] + '...') if len(q) > 200 else q, len(res))
            except Exception:
                logger.exception('[RETRIEVER] Error searching for query part')
                res = []
            all_results.extend(res)

        # Deduplicate by page content + metadata
        deduped = []
        seen = set()
        for chunk in all_results:
            key = (chunk.page_content[:500], str(chunk.metadata.get('chunk_id') or chunk.metadata.get('chunkIndex') or chunk.metadata.get('chunk_index')))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(chunk)

        # If using MMR search type, fetch_k returned already re-ranked results, else re-rank top candidates
        candidates = deduped[: max(self.settings.mmr_fetch_k, top_k)]

        # If too few high-sim results, lower threshold: ensure we return at least top_k
        final = candidates[: top_k * 10]

              # Log retrieval summary for debugging
        try:
            logger.info(
                '[RETRIEVER] Combined queries=%d total_candidates=%d returning=%d',
                len(queries),
                len(all_results),
                len(final),
            )
        except Exception:
            pass

        filtered = self._apply_filters(
            final,
            workspace_id=workspace_id,
            document_ids=document_ids,
        )

        return RetrievalResult(
            query=query,
            chunks=filtered[:top_k],
            confidence=self.vector_store.confidence_label(filtered[:top_k]),
        )

    def _apply_filters(
        self,
        chunks: list[RetrievedChunk],
        *,
        workspace_id: str | None = None,
        document_ids: list[str] | None = None,
    ) -> list[RetrievedChunk]:
        if not workspace_id and not document_ids:
            return chunks

        filtered: list[RetrievedChunk] = []
        target_document_ids = {document_id for document_id in (document_ids or []) if document_id}
        for chunk in chunks:
            metadata = chunk.metadata or {}
            chunk_workspace = metadata.get('workspace_id') or metadata.get('workspaceId')
            chunk_document = metadata.get('document_id') or metadata.get('documentId')
            if workspace_id and chunk_workspace and str(chunk_workspace) != str(workspace_id):
                continue
            if target_document_ids and chunk_document and str(chunk_document) not in target_document_ids:
                continue
            filtered.append(chunk)
        return filtered

