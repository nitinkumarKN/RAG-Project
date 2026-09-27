from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


@dataclass(slots=True)
class Settings:
    project_dir: Path = field(default_factory=lambda: Path(__file__).resolve().parent)
    upload_dir: Path = field(init=False)
    vector_db_dir: Path = field(init=False)
    manifest_path: Path = field(init=False)
    log_level: str = field(default_factory=lambda: os.getenv('LOG_LEVEL', 'INFO'))
    chunk_size: int = field(default_factory=lambda: int(os.getenv('CHUNK_SIZE', '1500')))
    chunk_overlap: int = field(default_factory=lambda: int(os.getenv('CHUNK_OVERLAP', '300')))
    retriever_top_k: int = field(default_factory=lambda: int(os.getenv('RETRIEVER_TOP_K', '5')))
    # Retrieval tuning
    mmr_fetch_k: int = field(default_factory=lambda: int(os.getenv('MMR_FETCH_K', '30')))
    mmr_k: int = field(default_factory=lambda: int(os.getenv('MMR_K', '10')))
    retrieval_threshold: float = field(default_factory=lambda: float(os.getenv('RETRIEVAL_THRESHOLD', '0.10')))
    multi_query_enabled: bool = field(default_factory=lambda: os.getenv('MULTI_QUERY_ENABLED', 'true').lower() == 'true')
    embedding_provider: str = field(default_factory=lambda: os.getenv('EMBEDDING_PROVIDER', 'huggingface').lower())
    embedding_model: str = field(default_factory=lambda: os.getenv('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2'))
    vector_store_type: str = field(default_factory=lambda: os.getenv('VECTOR_STORE_TYPE', 'faiss').lower())
    llm_provider: str = field(default_factory=lambda: os.getenv('LLM_PROVIDER', 'gemini').lower())
    gemini_model: str = field(default_factory=lambda: os.getenv('GEMINI_MODEL', 'gemini-2.5-flash'))
    reranker_model: str = field(default_factory=lambda: os.getenv('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-6-v2'))
    history_window: int = field(default_factory=lambda: int(os.getenv('HISTORY_WINDOW', '6')))
    gemini_api_key: str | None = field(default_factory=lambda: os.getenv('GEMINI_API_KEY'))
    api_cors_origins: list[str] = field(
        default_factory=lambda: [origin.strip() for origin in os.getenv('CORS_ORIGINS', '*').split(',') if origin.strip()]
    )
    enable_query_cache: bool = field(default_factory=lambda: os.getenv('ENABLE_QUERY_CACHE', 'true').lower() == 'true')
    cache_ttl_seconds: int = field(default_factory=lambda: int(os.getenv('CACHE_TTL_SECONDS', '300')))
    use_reranker: bool = field(default_factory=lambda: os.getenv('USE_RERANKER', 'false').lower() == 'true')
    allowed_file_types: tuple[str, ...] = ('.pdf', '.docx', '.txt', '.md', '.csv', '.html', '.htm')

    def __post_init__(self) -> None:
        self.upload_dir = self.project_dir / 'uploads'
        self.vector_db_dir = self.project_dir / 'vector_db'
        self.manifest_path = self.vector_db_dir / 'manifest.json'


settings = Settings()
