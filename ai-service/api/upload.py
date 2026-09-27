from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from config import settings
from rag.rag_pipeline import get_pipeline
import logging

logger = logging.getLogger('ai-service.upload')

router = APIRouter(tags=['documents'])


@router.post('/upload')
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(default=''),
    workspace_id: str | None = Form(default=None),
    author: str | None = Form(default=None),
):
    """Upload and index a document for later retrieval."""

    suffix = Path(file.filename or '').suffix.lower()
    if suffix and suffix not in settings.allowed_file_types:
        raise HTTPException(status_code=400, detail='Unsupported file type')

    pipeline = get_pipeline()

    logger.info('[UPLOAD] Received upload request: filename=%s content_type=%s workspace_id=%s', file.filename, file.content_type, workspace_id)

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix or '.bin') as temp_file:
        temp_file.write(await file.read())
        temp_path = temp_file.name

    try:
        result = pipeline.upload_file(
            temp_path,
            file.filename or 'document',
            workspace_id=workspace_id,
            title=title or None,
            author=author,
            mime_type=file.content_type,
            file_size=Path(temp_path).stat().st_size,
        )
        stored_fp = result.get('document', {}).get('filePath')
        logger.info('[UPLOAD] Upload processed successfully: document_id=%s stored_path=%s', result.get('document', {}).get('id'), stored_fp)
        # Additional helpful logs for debug
        try:
            logger.info('[UPLOAD] Stored file absolute path: %s', stored_fp)
        except Exception:
            logger.exception('[UPLOAD] Error logging stored file path')
        return result
    except Exception as exc:
        logger.exception('[UPLOAD] Error during upload processing')
        raise HTTPException(status_code=500, detail=f'Upload failed: {exc}')
    finally:
        Path(temp_path).unlink(missing_ok=True)


@router.delete('/document/{document_id}')
def delete_document(document_id: str):
    """Delete one stored document and rebuild the index."""

    pipeline = get_pipeline()
    removed = pipeline.delete_document(document_id)
    if not removed:
        raise HTTPException(status_code=404, detail='Document not found')
    return {'message': 'Document deleted successfully', 'documentId': document_id}


@router.delete('/delete/{document_id}')
def delete_document_alias(document_id: str):
    """Compatibility alias for older clients."""

    return delete_document(document_id)


@router.get('/document')
def list_documents(workspace_id: str | None = None):
    """Return indexed documents, optionally filtered by workspace."""

    pipeline = get_pipeline()
    return {'documents': pipeline.list_documents(workspace_id=workspace_id)}
