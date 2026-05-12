from __future__ import annotations
import time
import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Session:
    id: str
    order_id: str
    items: list[dict[str, Any]]
    amount: float
    dcql_query: Any
    required_credentials: list[str]
    optional_credentials: list[str]
    credential_definitions: list[Any]
    status: str = "pending"
    result: dict[str, Any] | None = None
    created_at: float = field(default_factory=time.time)


class SessionStore:
    def __init__(self) -> None:
        self._store: dict[str, Session] = {}

    def create(self, data: dict[str, Any]) -> Session:
        session = Session(id=str(uuid.uuid4()), **data)
        self._store[session.id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        return self._store.get(session_id)

    def update(self, session_id: str, updates: dict[str, Any]) -> Session | None:
        s = self._store.get(session_id)
        if s is None:
            return None
        for k, v in updates.items():
            setattr(s, k, v)
        return s
