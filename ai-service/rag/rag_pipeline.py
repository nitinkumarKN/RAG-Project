from __future__ import annotations
import json
import os
import shutil
import uuid
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from langchain_core.documents import Document

from config import settings
from .chains import ChainFactory
from .llm import generate_text
from .prompt import (
    format_chat_prompt,
    format_summary_prompt,
    format_compare_prompt,
    format_flashcards_prompt,
    format_quiz_prompt,
    build_context_block,
)
from .loader import DocumentLoaderService
from .memory import ConversationMemoryStore
from .prompt import build_context_block
from .retriever import RetrievalResult, RetrieverService
from .splitter import TextSplitterService
from .utils import RetrievedChunk, clean_text, format_source_metadata, safe_filename, serialize_json_safe, utc_now_iso
from .vector_store import VectorStoreManager


class RAGPipeline:
    """High-level orchestration for ingestion, retrieval, and grounded generation."""

    def __init__(self, settings_obj=settings):
        self.settings = settings_obj
        self.loader = DocumentLoaderService()
        self.splitter = TextSplitterService(chunk_size=self.settings.chunk_size, chunk_overlap=self.settings.chunk_overlap)
        self.vector_store = VectorStoreManager(self.settings)
        self.retriever = RetrieverService(self.vector_store, self.settings)
        self.memory = ConversationMemoryStore(self.settings.vector_db_dir / 'chat_sessions.json')
        self._chain_factory: ChainFactory | None = None
        self._document_manifest_path = self.settings.vector_db_dir / 'manifest.json'
        self._cache_dir = self.settings.vector_db_dir
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self.settings.upload_dir.mkdir(parents=True, exist_ok=True)
        self._document_cache: list[dict[str, Any]] = self._load_manifest()
        import logging
        self.logger = logging.getLogger('ai-service.rag')

    def _llm_available(self) -> bool:
        """Return True if an LLM provider key is configured (OpenAI or Gemini)."""

        return bool(os.getenv('OPENAI_API_KEY') or os.getenv('GEMINI_API_KEY'))

    @staticmethod
    def _configuration_answer() -> str:
        return (
            'I found relevant text in the uploaded papers, but the AI model is not configured. '
            'Set GEMINI_API_KEY in the AI service environment and redeploy.'
        )

    @staticmethod
    def _generation_failure_answer() -> str:
        return (
            'I found relevant text in the uploaded papers, but the AI model could not generate an answer. '
            'Check the Gemini API key, model access, and AI service logs.'
        )

    @property
    def chain_factory(self) -> ChainFactory:
        """Provide a simple ChainFactory for prompt formatting when needed."""

        if self._chain_factory is None:
            self._chain_factory = ChainFactory()
        return self._chain_factory

    def _load_manifest(self) -> list[dict[str, Any]]:
        """Load the persisted document manifest from disk."""

        if not self._document_manifest_path.exists():
            return []
        try:
            data = json.loads(self._document_manifest_path.read_text(encoding='utf-8'))
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []

    def _save_manifest(self) -> None:
        """Persist the current document manifest."""

        self._document_manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self._document_manifest_path.write_text(json.dumps(self._document_cache, indent=2), encoding='utf-8')

    def _store_file(self, source_path: str, original_name: str, document_id: str) -> Path:
        """Copy an uploaded file into the service-managed uploads directory."""

        target_name = f'{document_id}-{safe_filename(original_name)}'
        target_path = self.settings.upload_dir / target_name
        shutil.copyfile(source_path, target_path)
        return target_path

    def _build_document_record(
        self,
        *,
        document_id: str,
        workspace_id: str | None,
        title: str,
        original_name: str,
        stored_path: Path,
        author: str | None,
        file_size: int,
        mime_type: str | None,
        pages_count: int,
        created_date: str,
    ) -> dict[str, Any]:
        """Create the serializable document record used by the manifest."""

        return {
            'id': document_id,
            'document_id': document_id,
            'workspace_id': workspace_id,
            'title': title,
            'original_name': original_name,
            'filename': stored_path.name,
            'file_path': str(stored_path),
            'author': author,
            'created_date': created_date,
            'file_size': file_size,
            'mime_type': mime_type,
            'pages': pages_count,
            'upload_status': 'ready',
            'processed_at': utc_now_iso(),
        }

    def _rehydrate_documents(self) -> list[Document]:
        """Load, clean, split, and annotate every stored document for indexing."""

        indexed_documents: list[Document] = []
        for record in self._document_cache:
            file_path = Path(record['file_path'])
            if not file_path.exists():
                continue

            loaded_documents = self.loader.load(
                str(file_path),
                metadata={
                    'document_id': record['document_id'],
                    'workspace_id': record.get('workspace_id'),
                    'document_name': record['original_name'],
                    'title': record['title'],
                    'author': record.get('author'),
                    'created_date': record.get('created_date'),
                },
            )
            cleaned_documents = [
                Document(page_content=clean_text(document.page_content), metadata=document.metadata or {})
                for document in loaded_documents
            ]
            chunked_documents = self.splitter.split_documents(cleaned_documents)
            for chunk_index, chunk in enumerate(chunked_documents):

             old_metadata = chunk.metadata or {}

            chunk.metadata = {
            **old_metadata,

        # Document information
        "document_id": record["document_id"],
        "workspace_id": record.get("workspace_id"),
        "document_name": record["original_name"],
        "title": record["title"],
        "filename": record["filename"],

        # Preserve page number from loader
        "page_number": (
            old_metadata.get("page_number")
            or old_metadata.get("page")
            or old_metadata.get("pageNumber")
            or 1
        ),

        # Preserve source if available
        "source": old_metadata.get("source", record["original_name"]),

        # Chunk information
        "chunk_index": chunk_index,
        "chunk_id": f"{record['document_id']}-{chunk_index}",
    }

            indexed_documents.append(chunk)

            return indexed_documents

    def _refresh_index(self) -> None:
        """Rebuild the vector index from the current manifest."""

        indexed_documents = self._rehydrate_documents()
        self.vector_store.rebuild(indexed_documents)

    def _format_document_response(self, record: dict[str, Any]) -> dict[str, Any]:
        """Shape the manifest record for API responses."""

        return {
            'id': record['document_id'],
            'documentId': record['document_id'],
            'workspaceId': record.get('workspace_id'),
            'title': record['title'],
            'filename': record['filename'],
            'originalName': record['original_name'],
            'author': record.get('author'),
            'createdDate': record.get('created_date'),
            'fileSize': record.get('file_size', 0),
            'pages': record.get('pages', 0),
            'mimeType': record.get('mime_type'),
            'filePath': record.get('file_path'),
            'uploadStatus': record.get('upload_status', 'ready'),
        }

    def status(self) -> dict[str, Any]:
        """Return a quick service status snapshot."""

        return {
            'documents': len(self._document_cache),
            'indexReady': self.vector_store.ready(),
            'storageReady': self.settings.vector_db_dir.exists(),
        }

    def upload_file(
        self,
        file_path: str,
        original_name: str,
        *,
        workspace_id: str | None = None,
        title: str | None = None,
        author: str | None = None,
        mime_type: str | None = None,
        file_size: int = 0,
    ) -> dict[str, Any]:
        """Ingest a file into the local manifest and rebuild the vector index."""

        source_path = Path(file_path)
        if not source_path.exists():
            raise HTTPException(status_code=400, detail='Uploaded file was not found on disk')

        document_id = str(uuid.uuid4())
        stored_path = self._store_file(str(source_path), original_name, document_id)

        loaded_documents = self.loader.load(
            str(stored_path),
            metadata={
                'document_id': document_id,
                'workspace_id': workspace_id,
                'document_name': original_name,
                'title': title or Path(original_name).stem,
                'author': author,
            },
        )
        pages_count = len(loaded_documents)
        self.logger.info('[RAG][UPLOAD] PDF loaded pages=%d', pages_count)
        if pages_count:
            try:
                first_text = (loaded_documents[0].page_content or '')[:500]
                self.logger.info('[RAG][UPLOAD] First page text (first 500 chars): %s', first_text)
            except Exception:
                self.logger.exception('[RAG][UPLOAD] Unable to log first page text')

        try:
            chunked_documents = self.splitter.split_documents(loaded_documents)
            self.logger.info('[RAG][UPLOAD] Split into chunks=%d', len(chunked_documents))
            try:
                lengths = [len(c.page_content or '') for c in chunked_documents]
                self.logger.info('[RAG][UPLOAD] Chunk sizes (chars) sample=%s', lengths[:10])
            except Exception:
                self.logger.exception('[RAG][UPLOAD] Unable to log chunk sizes')
        except Exception:
            self.logger.exception('[RAG][UPLOAD] Error during splitting documents')
            raise
        created_date = utc_now_iso()
        record = self._build_document_record(
            document_id=document_id,
            workspace_id=workspace_id,
            title=title or Path(original_name).stem.replace('_', ' ').replace('-', ' ').strip(),
            original_name=original_name,
            stored_path=stored_path,
            author=author,
            file_size=file_size,
            mime_type=mime_type,
            pages_count=pages_count,
            created_date=created_date,
        )
        self._document_cache.append(record)
        self._save_manifest()
        try:
            # Rebuild index from manifest (will include this new record)
            self._refresh_index()
            self.logger.info('[RAG][UPLOAD] Index refreshed successfully')
        except Exception:
            self.logger.exception('[RAG][UPLOAD] Failed to refresh FAISS index')
            raise

        return {
            'message': 'Document uploaded successfully',
            'document': {
                **self._format_document_response(record),
                'downloadUrl': f'/uploads/{stored_path.name}',
                'fileSizeLabel': self._human_file_size(file_size),
            },
        }

    def _human_file_size(self, file_size: int) -> str:
        """Format bytes as a readable file size for UI responses."""

        if file_size <= 0:
            return '0 B'
        units = ['B', 'KB', 'MB', 'GB']
        unit_index = 0
        value = float(file_size)
        while value >= 1024 and unit_index < len(units) - 1:
            value /= 1024
            unit_index += 1
        return f'{value:.1f} {units[unit_index]}' if value < 10 else f'{value:.0f} {units[unit_index]}'

    def list_documents(self, workspace_id: str | None = None) -> list[dict[str, Any]]:
        """Return manifest records filtered by workspace."""

        records = self._document_cache
        if workspace_id:
            records = [record for record in records if str(record.get('workspace_id')) == str(workspace_id)]
        return [
            {
                **self._format_document_response(record),
                'downloadUrl': f"/uploads/{record['filename']}",
                'fileSizeLabel': self._human_file_size(record.get('file_size', 0)),
            }
            for record in records
        ]

    def delete_document(self, document_id: str) -> dict[str, Any] | None:
        """Delete a stored document and rebuild the index."""

        record = next((item for item in self._document_cache if item['document_id'] == document_id), None)
        if record is None:
            return None

        file_path = Path(record['file_path'])
        if file_path.exists():
            file_path.unlink()

        self._document_cache = [item for item in self._document_cache if item['document_id'] != document_id]
        self._save_manifest()
        self._refresh_index()
        return record

    def chat_from_documents(
        self,
        question: str,
        documents: list[dict[str, Any]],
        *,
        session_id: str = 'default',
    ) -> dict[str, Any]:
        """Answer a question using documents supplied directly in the request payload."""

        if not question.strip():
            raise HTTPException(status_code=400, detail='Question is required')

        chunks: list[RetrievedChunk] = []
        for index, document in enumerate(documents):
            text = clean_text(document.get('extractedText') or '')
            if not text:
                continue

            metadata = {
                'document_id': str(document.get('documentId') or document.get('id') or index),
                'workspace_id': document.get('workspaceId') or document.get('workspace_id'),
                'document_name': document.get('originalName') or document.get('title') or 'Unknown document',
                'title': document.get('title') or document.get('originalName') or 'Unknown document',
                'filename': document.get('filename'),
                'page_number': document.get('pageNumber') or document.get('page'),
            }
            chunks.append(RetrievedChunk(page_content=text, metadata=metadata, score=1.0))

        if not chunks:
            answer = 'I could not find this information in the uploaded documents.'
            confidence_message = 'Low confidence: no supporting evidence was provided.'
            sources: list[dict[str, Any]] = []
        else:
            selected_chunks = chunks[: self.settings.retriever_top_k]
            context = build_context_block(selected_chunks)
            if self._llm_available():
                history = self.memory.as_text(session_id, window_size=self.settings.history_window)
                prompt_text = format_chat_prompt(question, history, context)
                try:
                    answer = generate_text(prompt_text).strip() or 'I could not find this information in the uploaded documents.'
                except Exception:
                    self.logger.exception('[RAG][CHAT] Direct-document LLM generation failed')
                    answer = self._generation_failure_answer()
            else:
                answer = self._configuration_answer()
            confidence_message = f'Medium confidence based on {len(selected_chunks)} supplied document(s).'
            sources = [
                {
                    'documentName': format_source_metadata(chunk.metadata)['documentName'],
                    'pageNumber': format_source_metadata(chunk.metadata)['pageNumber'],
                    'chunkScore': round(chunk.score, 3),
                    'metadata': serialize_json_safe(chunk.metadata),
                    'excerpt': chunk.page_content[:280],
                }
                for chunk in selected_chunks
            ]

        self.memory.append(session_id, 'user', question)
        self.memory.append(session_id, 'assistant', answer, metadata={'sources': sources})

        return {
            'answer': answer,
            'confidenceMessage': confidence_message,
            'sources': sources,
            'sessionId': session_id,
            'rewrittenQuestion': question,
        }

    def search(
        self,
        query: str,
        *,
        workspace_id: str | None = None,
        document_ids: list[str] | None = None,
        search_type: str = "mmr",
        top_k: int =10,
    ) -> dict[str, Any]:
        """Search documents without generating an answer."""

        result = self.retriever.retrieve(
            query,
            workspace_id=workspace_id,
            document_ids=document_ids,
            top_k=top_k,
        )
        return {
            'query': result.query,
            'results': [
                {
                    'content': chunk.page_content,
                    'score': chunk.score,
                    **format_source_metadata(chunk.metadata),
                }
                for chunk in result.chunks
            ],
        }

    def chat(
        self,
        question: str,
        *,
        session_id: str = 'default',
        workspace_id: str | None = None,
        document_ids: list[str] | None = None,
        search_type: str = "mmr",
        top_k: int = 10,
    ) -> dict[str, Any]:
        """Answer a question with retrieval, memory, and grounded citations."""

        if not question.strip():
            raise HTTPException(status_code=400, detail='Question is required')

        retrieval: RetrievalResult = self.retriever.retrieve(
            question,
            workspace_id=workspace_id,
            document_ids=document_ids,
            top_k=top_k,
        )

        if not retrieval.chunks:
            answer = 'I could not find this information in the uploaded documents.'
            confidence_message = 'Low confidence: no relevant evidence was retrieved.'
            sources: list[dict[str, Any]] = []
        else:
            # Log retrieved chunks for debugging
            try:
                for i, chunk in enumerate(retrieval.chunks):
                    self.logger.info('[RAG][CHAT] Retrieved chunk %d score=%.4f metadata=%s', i, float(chunk.score), chunk.metadata)
            except Exception:
                self.logger.exception('[RAG][CHAT] Error logging retrieved chunks')

            history = self.memory.as_text(session_id, window_size=6)
            context = build_context_block(retrieval.chunks)
            if self._llm_available():
                prompt_text = format_chat_prompt(question, history, context)
                try:
                    self.logger.info('[RAG][CHAT] Prompt sent to LLM: %s', prompt_text[:1000])
                    answer = generate_text(prompt_text).strip() or 'I could not find this information in the uploaded documents.'
                    self.logger.info('[RAG][CHAT] LLM response: %s', answer[:1000])
                except Exception:
                    self.logger.exception('[RAG][CHAT] LLM generation failed')
                    answer = self._generation_failure_answer()
            else:
                answer = self._configuration_answer()
            confidence_message = f'{retrieval.confidence} confidence based on {len(retrieval.chunks)} supporting chunks.'
            sources = [
                {
                    'documentName': format_source_metadata(chunk.metadata)['documentName'],
                    'pageNumber': format_source_metadata(chunk.metadata)['pageNumber'],
                    'chunkScore': round(chunk.score, 3),
                    'metadata': serialize_json_safe(chunk.metadata),
                    'excerpt': chunk.page_content[:280],
                }
                for chunk in retrieval.chunks
            ]

        self.memory.append(session_id, 'user', question, metadata={'workspace_id': workspace_id})
        self.memory.append(session_id, 'assistant', answer, metadata={'workspace_id': workspace_id, 'sources': sources})

        return {
            'answer': answer,
            'confidenceMessage': confidence_message,
            'sources': sources,
            'sessionId': session_id,
            'rewrittenQuestion': question,
        }

    def summarize(
        self,
        *,
        topic: str,
        session_id: str = 'default',
        workspace_id: str | None = None,
        document_ids: list[str] | None = None,
        page_number: int | None = None,
        top_k: int = 10,
    ) -> dict[str, Any]:
        """Summarize one or more documents for a topic or selected page."""

        retrieval = self.search(topic, workspace_id=workspace_id, document_ids=document_ids, top_k=top_k)
        chunks = [RetrievedChunk(page_content=item['content'], metadata=item['metadata'], score=float(item['score'])) for item in retrieval['results']]
        context = build_context_block(chunks)
        if self._llm_available():
            prompt_text = format_summary_prompt(topic, context)
            try:
                answer = generate_text(prompt_text).strip() or 'I could not find this information in the uploaded documents.'
            except Exception:
                answer = 'I could not find this information in the uploaded documents.'
        else:
            answer = 'I could not find this information in the uploaded documents.'

        return {
            'topic': topic,
            'answer': answer,
            'sources': retrieval['results'],
            'pageNumber': page_number,
            'sessionId': session_id,
        }

    def compare(
        self,
        *,
        question: str,
        session_id: str = 'default',
        workspace_id: str | None = None,
        document_ids: list[str] | None = None,
        top_k: int = 10,
    ) -> dict[str, Any]:
        """Compare multiple documents using the retrieved evidence."""

        retrieval = self.search(question, workspace_id=workspace_id, document_ids=document_ids, top_k=top_k)
        chunks = [RetrievedChunk(page_content=item['content'], metadata=item['metadata'], score=float(item['score'])) for item in retrieval['results']]
        context = build_context_block(chunks)
        if self._llm_available():
            prompt_text = format_compare_prompt(question, context)
            try:
                answer = generate_text(prompt_text).strip() or 'I could not find this information in the uploaded documents.'
            except Exception:
                answer = 'I could not find this information in the uploaded documents.'
        else:
            answer = 'I could not find this information in the uploaded documents.'

        return {
            'question': question,
            'answer': answer,
            'sources': retrieval['results'],
            'sessionId': session_id,
        }

    def flashcards(
        self,
        *,
        topic: str,
        workspace_id: str | None = None,
        document_ids: list[str] | None = None,
        top_k: int = 10,
    ) -> dict[str, Any]:
        """Generate revision flashcards from the retrieved context."""

        retrieval = self.search(topic, workspace_id=workspace_id, document_ids=document_ids, top_k=top_k)
        chunks = [RetrievedChunk(page_content=item['content'], metadata=item['metadata'], score=float(item['score'])) for item in retrieval['results']]
        context = build_context_block(chunks)
        if self._llm_available():
            prompt_text = format_flashcards_prompt(topic, context)
            try:
                answer = generate_text(prompt_text).strip() or 'I could not find this information in the uploaded documents.'
            except Exception:
                answer = 'I could not find this information in the uploaded documents.'
        else:
            answer = 'I could not find this information in the uploaded documents.'
        return {'topic': topic, 'flashcards': answer, 'sources': retrieval['results']}

    def quiz(
        self,
        *,
        topic: str,
        workspace_id: str | None = None,
        document_ids: list[str] | None = None,
        top_k: int = 10,
    ) -> dict[str, Any]:
        """Generate a quiz from the retrieved context."""

        retrieval = self.search(topic, workspace_id=workspace_id, document_ids=document_ids, top_k=top_k)
        chunks = [RetrievedChunk(page_content=item['content'], metadata=item['metadata'], score=float(item['score'])) for item in retrieval['results']]
        context = build_context_block(chunks)
        if self._llm_available():
            prompt_text = format_quiz_prompt(topic, context)
            try:
                answer = generate_text(prompt_text).strip() or 'I could not find this information in the uploaded documents.'
            except Exception:
                answer = 'I could not find this information in the uploaded documents.'
        else:
            answer = 'I could not find this information in the uploaded documents.'
        return {'topic': topic, 'quiz': answer, 'sources': retrieval['results']}


_pipeline: RAGPipeline | None = None


def get_pipeline() -> RAGPipeline:
    """Return a lazily created singleton pipeline so app startup stays lightweight."""

    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline(settings)
    return _pipeline
