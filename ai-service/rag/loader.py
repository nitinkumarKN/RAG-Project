from __future__ import annotations

import csv
import html
import re
from pathlib import Path
from typing import Callable

from langchain_core.documents import Document

from .utils import clean_text, safe_filename, utc_now_iso
import logging

logger = logging.getLogger('ai-service.loader')


LoaderFactory = Callable[[str], object]


class DocumentLoaderService:
    """Load supported file types into LangChain documents with shared metadata."""

    def __init__(self) -> None:
        self._registry: dict[str, LoaderFactory] = {
            '.pdf': self._load_pdf,
            '.docx': self._load_docx,
            '.txt': self._load_text,
            '.md': self._load_text,
            '.csv': self._load_csv,
            '.html': self._load_html,
            '.htm': self._load_html,
        }

    def _load_pdf(self, file_path: str) -> list[Document]:
        try:
            from langchain_community.document_loaders import PyPDFLoader

            docs = PyPDFLoader(file_path).load()
            logger.debug('[LOADER] PDF loaded: %s pages=%d', file_path, len(docs or []))
            return docs
        except Exception:
            logger.exception('[LOADER] Failed to load PDF with PyPDFLoader')
            raise

    def _load_docx(self, file_path: str) -> list[Document]:
        try:
            import docx2txt
        except ImportError as exc:
            raise ImportError('DOCX support requires the optional docx2txt package') from exc

        text = docx2txt.process(file_path) or ''
        return [Document(page_content=text, metadata={'page': 1})]

    def _load_text(self, file_path: str) -> list[Document]:
        text = Path(file_path).read_text(encoding='utf-8', errors='ignore')
        return [Document(page_content=text, metadata={'page': 1})]

    def _load_csv(self, file_path: str) -> list[Document]:
        documents: list[Document] = []
        with Path(file_path).open('r', encoding='utf-8', errors='ignore', newline='') as handle:
            reader = csv.DictReader(handle)
            for row_index, row in enumerate(reader, start=1):
                row_text = '\n'.join(f'{key}: {value}' for key, value in row.items())
                documents.append(Document(page_content=row_text, metadata={'page': row_index, 'row': row_index}))
        return documents or [Document(page_content=Path(file_path).read_text(encoding='utf-8', errors='ignore'), metadata={'page': 1})]

    def _load_html(self, file_path: str) -> list[Document]:
        raw_html = Path(file_path).read_text(encoding='utf-8', errors='ignore')
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(raw_html, 'html.parser')
            text = soup.get_text('\n')
        except ImportError:
            text = re.sub(r'<[^>]+>', ' ', raw_html)
        return [Document(page_content=html.unescape(text), metadata={'page': 1})]

    def load(self, file_path: str, metadata: dict | None = None) -> list[Document]:
        """Load a file and enrich the resulting documents with common metadata."""

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f'File not found: {file_path}')

        file_extension = path.suffix.lower()
        loader_factory = self._registry.get(file_extension, self._load_text)
        loaded = loader_factory(str(path))
        documents = loaded if isinstance(loaded, list) else loaded.load()

        common_metadata = {
            'filename': safe_filename(path.name),
            'original_name': path.name,
            'file_extension': file_extension,
            'source_path': str(path),
            'created_date': utc_now_iso(),
        }
        if metadata:
            common_metadata.update(metadata)

        enriched_documents: list[Document] = []
        for index, document in enumerate(documents):
            enriched_metadata = dict(common_metadata)
            enriched_metadata.update(document.metadata or {})
            enriched_metadata.setdefault('page', enriched_metadata.get('page', index))
            enriched_metadata.setdefault('page_number', enriched_metadata.get('page_number'))
            enriched_metadata.setdefault('document_name', metadata.get('document_name') if metadata else path.stem)
            enriched_metadata.setdefault('title', metadata.get('title') if metadata else path.stem)
            enriched_documents.append(
                Document(
                    page_content=clean_text(document.page_content),
                    metadata=enriched_metadata,
                )
            )

        logger.info('[LOADER] Loaded %d page-level documents from %s', len(enriched_documents), file_path)
        return enriched_documents

    def supported_extensions(self) -> tuple[str, ...]:
        """Return the extensions supported by the loader registry."""

        return tuple(self._registry.keys())
