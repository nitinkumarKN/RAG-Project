from __future__ import annotations

from functools import lru_cache
from typing import Iterable, List

import numpy as np

from config import settings
import logging

logger = logging.getLogger('ai-service.embeddings')


@lru_cache(maxsize=1)
def _load_model(model_name: str):
    try:
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer(model_name)
    except Exception as exc:  # pragma: no cover - optional dependency
        raise ImportError('sentence-transformers is required for the embedding backend') from exc


class EmbeddingService:
    """Thin wrapper around `sentence-transformers` to produce vector embeddings.

    Use `build()` to get an object with `embed(texts: Iterable[str]) -> List[List[float]]`
    and `dim` attribute.
    """

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.embedding_model
        self._model = None

    def build(self):
        if self._model is None:
            self._model = _load_model(self.model_name)
        return _EmbeddingWrapper(self._model)


class _EmbeddingWrapper:
    def __init__(self, model):
        self._model = model
        # sentence-transformers returns numpy arrays
        self.dim = self._model.get_sentence_embedding_dimension()

    def embed(self, texts: Iterable[str]) -> List[List[float]]:
        texts_list = list(texts)
        if not texts_list:
            return []
        logger.info('[EMBEDDINGS] Creating embeddings for %d chunks using model %s', len(texts_list), getattr(self._model, 'name', '<model>'))
        embeddings = self._model.encode(texts_list, convert_to_numpy=True, show_progress_bar=False)
        # Ensure float32 for faiss
        return [emb.astype('float32').tolist() for emb in np.asarray(embeddings)]
