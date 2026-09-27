from typing import Any

from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter

from embeddings import build_embeddings


SYSTEM_PROMPT = (
    'You are a medical research assistant. Answer only from the provided context. '
    'If the answer is not in the context, reply exactly: '
    '"I could not find this information in the uploaded medical papers."'
)


def _build_documents_from_texts(documents: list[dict[str, Any]]):
    """Convert uploaded paper text into simple chunk-ready documents."""

    built_documents = []

    for document in documents:
        text = (document.get('extractedText') or '').strip()
        if not text:
          continue

        built_documents.append(
            {
                'page_content': text,
                'metadata': {
                    'documentId': str(document.get('documentId') or ''),
                    'documentName': document.get('originalName') or document.get('title') or 'Unknown document',
                    'title': document.get('title') or document.get('originalName') or 'Unknown document',
                    'pages': document.get('pages') or 0,
                },
            }
        )

    return built_documents


def answer_question(question: str, documents: list[dict[str, Any]], gemini_api_key: str | None):
    """Run a basic RAG flow: split text, retrieve top chunks, then ask Gemini with that context."""

    usable_documents = _build_documents_from_texts(documents)
    if not usable_documents:
        return {
            'answer': 'I could not find this information in the uploaded medical papers.',
            'confidenceMessage': 'No supporting evidence was retrieved from the uploaded documents.',
            'sources': [],
        }

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.create_documents(
        [document['page_content'] for document in usable_documents],
        metadatas=[document['metadata'] for document in usable_documents],
    )

    embeddings = build_embeddings()
    vector_store = FAISS.from_documents(chunks, embeddings)
    retrieved_chunks = vector_store.similarity_search(question, k=4)

    sources = _format_sources(retrieved_chunks)
    context = _build_context(retrieved_chunks)

    if not gemini_api_key:
        return {
            'answer': 'I could not find this information in the uploaded medical papers.',
            'confidenceMessage': 'Retrieved from uploaded document.',
            'sources': sources,
        }

    llm = ChatGoogleGenerativeAI(
        model='gemini-1.5-flash',
        google_api_key=gemini_api_key,
        temperature=0.1,
    )

    prompt = (
        f'{SYSTEM_PROMPT}\n\n'
        f'Context:\n{context}\n\n'
        f'Question: {question}\n\n'
        'Answer in one short paragraph. Include the document name and page number when possible.'
    )

    response = llm.invoke(prompt)
    answer_text = getattr(response, 'content', str(response)).strip()

    if not answer_text:
        answer_text = 'I could not find this information in the uploaded medical papers.'

    return {
        'answer': answer_text,
        'confidenceMessage': 'Retrieved from uploaded document.',
        'sources': sources,
    }


def _build_context(retrieved_chunks):
    context_parts = []

    for chunk in retrieved_chunks:
        metadata = getattr(chunk, 'metadata', {}) or {}
        document_name = metadata.get('documentName') or metadata.get('title') or 'Unknown document'
        page_number = metadata.get('page')
        page_label = page_number + 1 if isinstance(page_number, int) else metadata.get('pageNumber')
        context_parts.append(f"Source: {document_name} | Page: {page_label}\n{chunk.page_content}")

    return '\n\n'.join(context_parts)


def _format_sources(retrieved_chunks):
    sources = []

    for chunk in retrieved_chunks[:4]:
        metadata = getattr(chunk, 'metadata', {}) or {}
        page_number = metadata.get('page')
        sources.append(
            {
                'documentName': metadata.get('documentName') or metadata.get('title') or 'Unknown document',
                'pageNumber': (page_number + 1) if isinstance(page_number, int) else metadata.get('pageNumber'),
                'excerpt': chunk.page_content[:240],
            }
        )

    return sources