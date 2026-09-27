from langchain_huggingface import HuggingFaceEmbeddings


def build_embeddings():
    """Create the shared embedding model used for document chunks and retrieval."""

    return HuggingFaceEmbeddings(model_name='sentence-transformers/all-MiniLM-L6-v2')