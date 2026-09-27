from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class RetrievedChunk:
    """A scored chunk returned by retrieval."""

    page_content: str
    metadata: dict[str, Any]
    score: float = 0.0


@dataclass(slots=True)
class QueryCacheItem:
    """Cached search or generation output with a TTL."""

    value: Any
    expires_at: float


class QueryCache:
    """A tiny thread-safe TTL cache for repeated queries."""

    def __init__(self, ttl_seconds: int = 300):
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._items: dict[str, QueryCacheItem] = {}

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._items.get(key)
            if not item:
                return None
            if time.time() > item.expires_at:
                self._items.pop(key, None)
                return None
            return item.value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._items[key] = QueryCacheItem(value=value, expires_at=time.time() + self.ttl_seconds)


def utc_now_iso() -> str:
    """Return the current time in ISO-8601 UTC format."""

    return datetime.now(timezone.utc).isoformat()


def make_document_id(file_path: str, workspace_id: str | None = None) -> str:
    """Build a stable document id from path and workspace metadata."""

    digest = hashlib.sha1()
    digest.update(file_path.encode('utf-8'))
    if workspace_id:
        digest.update(workspace_id.encode('utf-8'))
    return digest.hexdigest()


def safe_filename(name: str) -> str:
    """Remove path separators and unsafe characters from a filename."""

    base_name = Path(name).name
    base_name = re.sub(r'[^A-Za-z0-9._-]+', '-', base_name)
    return base_name.strip('-._') or 'document'


def normalize_whitespace(text: str) -> str:
    """Collapse repeated spaces without flattening paragraphs."""

    lines = []
    for line in text.splitlines():
        stripped = re.sub(r'[ \t]+', ' ', line.rstrip())
        lines.append(stripped)
    return '\n'.join(lines)


def dedupe_consecutive_lines(text: str) -> str:
    """Remove repeated adjacent lines while preserving headings and page breaks."""

    result: list[str] = []
    previous: str | None = None
    for line in text.splitlines():
        current = line.strip()
        if not current:
            result.append('')
            previous = None
            continue
        if current == previous:
            continue
        result.append(line.rstrip())
        previous = current
    return '\n'.join(result)


def clean_text(text: str) -> str:
    """Apply lightweight cleaning that keeps layout meaning intact."""

    normalized = normalize_whitespace(text)
    normalized = dedupe_consecutive_lines(normalized)
    normalized = re.sub(r'\n{3,}', '\n\n', normalized)
    return normalized.strip()


def metadata_page_number(metadata: dict[str, Any]) -> int | None:
    """Extract a 1-based page number from any metadata shape we receive."""

    page = metadata.get('page')
    if isinstance(page, int):
        return page + 1

    page_number = metadata.get('page_number') or metadata.get('pageNumber')
    if isinstance(page_number, int):
        return page_number

    row_number = metadata.get('row')
    if isinstance(row_number, int):
        return row_number + 1

    return None


def chunk_key(metadata: dict[str, Any], page_content: str) -> str:
    """Build a stable key for deduplicating retrieved chunks."""

    digest = hashlib.sha1()
    digest.update((metadata.get('document_id') or metadata.get('documentId') or '').encode('utf-8'))
    digest.update(str(metadata_page_number(metadata) or '').encode('utf-8'))
    digest.update(page_content[:250].encode('utf-8'))
    return digest.hexdigest()


def chunk_score_to_label(score: float | None, fallback_count: int = 0) -> str:
    """Convert a retrieval score and evidence count into a confidence label."""

    if fallback_count == 0:
        return 'Low'
    if score is None:
        return 'Medium' if fallback_count >= 3 else 'Low'
    if score >= 0.8:
        return 'High'
    if score >= 0.55:
        return 'Medium'
    return 'Low'


def merge_scored_chunks(chunks: list[RetrievedChunk], limit: int = 5) -> list[RetrievedChunk]:
    """Deduplicate chunks while preserving the best score for each source chunk."""

    merged: dict[str, RetrievedChunk] = {}
    for chunk in chunks:
        key = chunk_key(chunk.metadata, chunk.page_content)
        existing = merged.get(key)
        if existing is None or chunk.score > existing.score:
            merged[key] = chunk
    ordered = sorted(merged.values(), key=lambda item: item.score, reverse=True)
    return ordered[:limit]


def format_source_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    """Return a compact metadata payload for API responses."""

    return {
        'documentId': metadata.get('document_id') or metadata.get('documentId'),
        'documentName': metadata.get('document_name') or metadata.get('documentName') or metadata.get('title') or 'Unknown document',
        'filename': metadata.get('filename'),
        'workspaceId': metadata.get('workspace_id') or metadata.get('workspaceId'),
        'author': metadata.get('author'),
        'createdDate': metadata.get('created_date') or metadata.get('createdDate'),
        'pageNumber': metadata_page_number(metadata),
        'chunkIndex': metadata.get('chunk_index'),
        'chunkId': metadata.get('chunk_id'),
    }


def serialize_json_safe(data: Any) -> Any:
    """Best-effort JSON-safe conversion for metadata-rich objects."""

    if isinstance(data, (str, int, float, bool)) or data is None:
        return data
    if isinstance(data, dict):
        return {str(key): serialize_json_safe(value) for key, value in data.items()}
    if isinstance(data, list):
        return [serialize_json_safe(item) for item in data]
    return str(data)


def build_cache_key(*parts: Any) -> str:
    """Create a deterministic cache key for request inputs."""

    payload = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha1(payload.encode('utf-8')).hexdigest()
