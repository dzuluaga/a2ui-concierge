import pytest
from sessions import Session, SessionStore


@pytest.fixture()
def store() -> SessionStore:
    return SessionStore()


def _session_data() -> dict:
    return {
        "order_id": "ord-1",
        "items": [{"product_id": "p-1", "quantity": 1}],
        "amount": 49.99,
        "dcql_query": {"credentials": []},
        "required_credentials": ["age_verification"],
        "optional_credentials": [],
        "credential_definitions": [],
    }


def test_create_returns_session_with_id(store: SessionStore):
    s = store.create(_session_data())
    assert s.id
    assert s.status == "pending"
    assert s.order_id == "ord-1"


def test_get_returns_created_session(store: SessionStore):
    s = store.create(_session_data())
    found = store.get(s.id)
    assert found is not None
    assert found.id == s.id


def test_get_unknown_id_returns_none(store: SessionStore):
    assert store.get("nonexistent") is None


def test_update_changes_status(store: SessionStore):
    s = store.create(_session_data())
    updated = store.update(s.id, {"status": "complete"})
    assert updated is not None
    assert updated.status == "complete"


def test_update_unknown_id_returns_none(store: SessionStore):
    assert store.update("nonexistent", {"status": "complete"}) is None


def test_ids_are_unique(store: SessionStore):
    s1 = store.create(_session_data())
    s2 = store.create(_session_data())
    assert s1.id != s2.id
