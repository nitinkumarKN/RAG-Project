from __future__ import annotations

import json
import threading
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

from .utils import utc_now_iso


@dataclass(slots=True)
class MemoryMessage:
    """A single stored chat turn."""

    role: str
    content: str
    timestamp: str
    metadata: dict[str, Any] | None = None


class ConversationMemoryStore:
    """Persist lightweight conversation history on disk by session id."""

    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self._lock = threading.Lock()
        self._sessions: dict[str, list[MemoryMessage]] = {}
        self._load()

    def _load(self) -> None:
        if not self.storage_path.exists():
            self._sessions = {}
            return

        try:
            raw_sessions = json.loads(self.storage_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            raw_sessions = {}

        loaded: dict[str, list[MemoryMessage]] = {}
        for session_id, messages in raw_sessions.items():
            loaded[session_id] = [MemoryMessage(**message) for message in messages]
        self._sessions = loaded

    def _save(self) -> None:
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        serializable = {session_id: [asdict(message) for message in messages] for session_id, messages in self._sessions.items()}
        self.storage_path.write_text(json.dumps(serializable, indent=2), encoding='utf-8')

    def append(self, session_id: str, role: str, content: str, metadata: dict[str, Any] | None = None) -> None:
        """Store a conversation turn and persist it immediately."""

        with self._lock:
            session = self._sessions.setdefault(session_id, [])
            session.append(MemoryMessage(role=role, content=content, timestamp=utc_now_iso(), metadata=metadata))
            self._save()

    def recent(self, session_id: str, window_size: int = 6) -> list[MemoryMessage]:
        """Return the most recent turns for a session."""

        session = self._sessions.get(session_id, [])
        return session[-window_size:]

    def as_text(self, session_id: str, window_size: int = 6) -> str:
        """Serialize recent history into a prompt-friendly plain text block."""

        turns = self.recent(session_id, window_size=window_size)
        if not turns:
            return 'No prior conversation.'

        lines = []
        for turn in turns:
            lines.append(f"{turn.role.title()}: {turn.content}")
        return '\n'.join(lines)

    def clear(self, session_id: str) -> None:
        """Remove all history for one session."""

        with self._lock:
            self._sessions.pop(session_id, None)
            self._save()
