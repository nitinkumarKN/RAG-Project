from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from rag.rag_pipeline import get_pipeline

router = APIRouter(tags=['search'])


class SearchRequest(BaseModel):
    """Search input for semantic retrieval."""

    query: str = Field(min_length=1)
    workspace_id: str | None = None
    document_ids: list[str] = Field(default_factory=list)
    search_type: str = 'similarity'
    top_k: int = Field(default=5, ge=1, le=20)


@router.get('/search')
def search_documents(
    query: str = Query(min_length=1),
    workspace_id: str | None = Query(default=None),
    top_k: int = Query(default=5, ge=1, le=20),
):
    """Compatibility GET endpoint for semantic search."""

    pipeline = get_pipeline()
    return pipeline.search(query, workspace_id=workspace_id, top_k=top_k)


@router.post('/search')
def search_documents_post(payload: SearchRequest):
    """POST version of semantic search for the new API contract."""

    pipeline = get_pipeline()
    return pipeline.search(
        payload.query,
        workspace_id=payload.workspace_id,
        document_ids=payload.document_ids or None,
        search_type=payload.search_type,
        top_k=payload.top_k,
    )
