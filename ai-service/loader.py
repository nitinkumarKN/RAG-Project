from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader


def load_pdf_documents(file_path: str):
    """Load a PDF into LangChain documents, preserving page metadata for citations."""

    pdf_path = Path(file_path)
    loader = PyPDFLoader(str(pdf_path))
    return loader.load()