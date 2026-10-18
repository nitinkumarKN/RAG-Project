from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field
import logging

from rag.rag_pipeline import get_pipeline

router = APIRouter(tags=['chat'])
logger = logging.getLogger('ai-service.api.chat')


class ChatDocument(BaseModel):
    """Document payload compatible with the Node backend."""

    documentId: str | None = None
    title: str = Field(default='Unknown document')
    filename: str = Field(default='')
    originalName: str | None = None
    pages: int = 0
    extractedText: str = ''
    workspaceId: str | None = None
    pageNumber: int | None = None


class ChatRequest(BaseModel):
    """Chat input for either direct-document or indexed-workspace retrieval."""

    question: str
    sessionId: str = 'default'
    workspaceId: str | None = None
    documentIds: list[str] = Field(default_factory=list)
    documents: list[ChatDocument] = Field(default_factory=list)
    searchType: str = 'similarity'
    topK: int = Field(default=5, ge=1, le=20)


class SummarizeRequest(BaseModel):
    """Summarize a topic, document, or page."""

    topic: str
    sessionId: str = 'default'
    workspaceId: str | None = None
    documentIds: list[str] = Field(default_factory=list)
    pageNumber: int | None = None
    topK: int = Field(default=5, ge=1, le=20)


class CompareRequest(BaseModel):
    """Compare selected documents."""

    question: str
    sessionId: str = 'default'
    workspaceId: str | None = None
    documentIds: list[str] = Field(default_factory=list)
    topK: int = Field(default=5, ge=1, le=20)


class TopicRequest(BaseModel):
    """Topic-based generation payload for flashcards and quizzes."""

    topic: str
    workspaceId: str | None = None
    documentIds: list[str] = Field(default_factory=list)
    topK: int = Field(default=5, ge=1, le=20)


@router.post('/chat')
def chat(payload: ChatRequest):
    """Answer a user question using either direct docs or the indexed workspace."""

    logger.info('[API] /api/chat request received: question_len=%d documents=%d workspaceId=%s', len(payload.question or ''), len(payload.documents or []), payload.workspaceId)

    pipeline = get_pipeline()
    has_document_text = any(document.extractedText.strip() for document in payload.documents)
    if payload.documents and has_document_text:
        return pipeline.chat_from_documents(
            payload.question,
            [document.model_dump() for document in payload.documents],
            session_id=payload.sessionId,
        )

    if payload.documents and not payload.workspaceId:
        payload.workspaceId = next(
            (document.workspaceId for document in payload.documents if document.workspaceId),
            None,
        )

    return pipeline.chat(
        payload.question,
        session_id=payload.sessionId,
        workspace_id=payload.workspaceId,
        document_ids=payload.documentIds or None,
        search_type=payload.searchType,
        top_k=payload.topK,
    )


@router.post('/summarize')
def summarize(payload: SummarizeRequest):
    """Generate a grounded summary from indexed content."""

    pipeline = get_pipeline()
    return pipeline.summarize(
        topic=payload.topic,
        session_id=payload.sessionId,
        workspace_id=payload.workspaceId,
        document_ids=payload.documentIds or None,
        page_number=payload.pageNumber,
        top_k=payload.topK,
    )


@router.post('/compare')
def compare(payload: CompareRequest):
    """Compare multiple uploaded papers."""

    pipeline = get_pipeline()
    return pipeline.compare(
        question=payload.question,
        session_id=payload.sessionId,
        workspace_id=payload.workspaceId,
        document_ids=payload.documentIds or None,
        top_k=payload.topK,
    )


@router.post('/flashcards')
def flashcards(payload: TopicRequest):
    """Generate revision flashcards."""

    pipeline = get_pipeline()
    return pipeline.flashcards(
        topic=payload.topic,
        workspace_id=payload.workspaceId,
        document_ids=payload.documentIds or None,
        top_k=payload.topK,
    )


@router.post('/quiz')
def quiz(payload: TopicRequest):
    """Generate a quiz from the retrieved medical documents."""

    pipeline = get_pipeline()
    return pipeline.quiz(
        topic=payload.topic,
        workspace_id=payload.workspaceId,
        document_ids=payload.documentIds or None,
        top_k=payload.topK,
    )
