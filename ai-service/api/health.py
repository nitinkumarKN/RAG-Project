from __future__ import annotations

from fastapi import APIRouter

from rag.rag_pipeline import get_pipeline

router = APIRouter(tags=['health'])


@router.get('/health')
def health_check():
    """Return a simple liveness response."""

    return {'status': 'ok', 'service': 'ai-service'}


@router.get('/status')
def status():
    """Return the service status and vector store readiness."""

    pipeline = get_pipeline()
    status = pipeline.status()
    # Include whether an LLM key/provider appears configured
    try:
        status['llmAvailable'] = pipeline._llm_available()
    except Exception:
        status['llmAvailable'] = False
    return {'status': 'ok', **status}
