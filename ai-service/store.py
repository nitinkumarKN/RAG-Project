import json
import shutil
import uuid
from pathlib import Path

from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

from embeddings import build_embeddings
from loader import load_pdf_documents


BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / 'storage'
UPLOAD_DIR = STORAGE_DIR / 'uploads'
INDEX_DIR = STORAGE_DIR / 'faiss_index'
MANIFEST_FILE = STORAGE_DIR / 'documents.json'


def ensure_storage():
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def load_manifest():
    ensure_storage()
    if not MANIFEST_FILE.exists():
        return []

    return json.loads(MANIFEST_FILE.read_text(encoding='utf-8'))


def save_manifest(documents):
    ensure_storage()
    MANIFEST_FILE.write_text(json.dumps(documents, indent=2), encoding='utf-8')


def _document_to_chunks(document_record):
    pages = document_record.get('pagesData', [])
    chunks = []

    for page in pages:
        page_text = (page.get('text') or '').strip()
        if not page_text:
          continue

        chunks.append(
            Document(
                page_content=page_text,
                metadata={
                    'documentId': document_record['id'],
                    'documentName': document_record['originalName'],
                    'title': document_record['title'],
                    'pageNumber': page.get('pageNumber'),
                },
            )
        )

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return splitter.split_documents(chunks)


def rebuild_index(documents=None):
    ensure_storage()
    documents = documents if documents is not None else load_manifest()

    if not documents:
        if INDEX_DIR.exists():
            shutil.rmtree(INDEX_DIR)
        return None

    chunks = []
    for document in documents:
        chunks.extend(_document_to_chunks(document))

    if not chunks:
        return None

    embeddings = build_embeddings()
    vector_store = FAISS.from_documents(chunks, embeddings)
    vector_store.save_local(str(INDEX_DIR))
    return vector_store


def add_document_from_upload(file_path, original_name, title=None, file_size=0):
    ensure_storage()
    documents = load_manifest()
    document_id = str(uuid.uuid4())
    stored_name = f'{document_id}-{Path(original_name).name}'
    stored_path = UPLOAD_DIR / stored_name

    shutil.copyfile(file_path, stored_path)
    pages = load_pdf_documents(str(stored_path))

    pages_data = [
        {
            'pageNumber': (page.metadata.get('page', index) + 1) if isinstance(page.metadata.get('page', index), int) else index + 1,
            'text': page.page_content,
        }
        for index, page in enumerate(pages)
    ]

    extracted_text = '\n\n'.join(page['text'] for page in pages_data)
    document = {
        'id': document_id,
        'title': title or Path(original_name).stem.replace('_', ' ').replace('-', ' ').strip(),
        'filename': stored_name,
        'originalName': original_name,
        'filePath': str(stored_path),
        'fileSize': file_size,
        'pages': len(pages_data),
        'pagesData': pages_data,
        'extractedText': extracted_text,
    }

    documents.append(document)
    save_manifest(documents)
    rebuild_index(documents)
    return document


def search_documents(query, top_k=4):
    documents = load_manifest()
    if not documents:
        return []

    if not INDEX_DIR.exists():
        rebuild_index(documents)

    embeddings = build_embeddings()
    vector_store = FAISS.load_local(str(INDEX_DIR), embeddings, allow_dangerous_deserialization=True)
    matches = vector_store.similarity_search(query, k=top_k)

    results = []
    for match in matches:
        metadata = match.metadata or {}
        results.append(
            {
                'documentId': metadata.get('documentId'),
                'documentName': metadata.get('documentName'),
                'title': metadata.get('title'),
                'pageNumber': metadata.get('pageNumber'),
                'excerpt': match.page_content[:280],
            }
        )

    return results


def delete_document(document_id):
    documents = load_manifest()
    remaining = [document for document in documents if document['id'] != document_id]
    removed = next((document for document in documents if document['id'] == document_id), None)

    if not removed:
        return None

    file_path = Path(removed['filePath'])
    if file_path.exists():
        file_path.unlink()

    save_manifest(remaining)
    rebuild_index(remaining)
    return removed


def get_status():
    documents = load_manifest()
    return {
        'documents': len(documents),
        'indexReady': INDEX_DIR.exists(),
        'storageReady': STORAGE_DIR.exists(),
    }
