from __future__ import annotations

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class TextSplitterService:
    """Split documents into overlapping chunks while preserving metadata."""

    def __init__(self, chunk_size: int = 1500, chunk_overlap: int = 300) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        # Use RecursiveCharacterTextSplitter with larger chunk size and overlap
        self._splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    def split_documents(self, documents: list[Document]) -> list[Document]:
        """Split a list of documents and keep metadata attached to every chunk."""

        if not documents:
            return []
        return self._splitter.split_documents(documents)

    def split_text(self, text: str, metadata: dict | None = None) -> list[Document]:
        """Split a raw text string into chunked LangChain documents."""

        document = Document(page_content=text, metadata=metadata or {})
        return self.split_documents([document])
