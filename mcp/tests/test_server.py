import pytest
from server import prepare_checkout, prepare_cart_checkout, request_checkout_verification, submit_credential
from sessions import SessionStore


@pytest.fixture(autouse=True)
def fresh_store(monkeypatch):
    import server
    store = SessionStore()
    monkeypatch.setattr(server, "_store", store)
    monkeypatch.setattr(server, "_drafts", {})
    return store


# ── prepare_checkout ──────────────────────────────────────────────────────────

def test_prepare_checkout_known_product():
    result = prepare_checkout("ord-1", "lum-jewel-001", 1)
    assert result["success"] is True
    assert result["order_id"] == "ord-1"
    assert result["product"]["id"] == "lum-jewel-001"
    assert result["product"]["total_amount"] == 124.0


def test_prepare_checkout_unknown_product():
    result = prepare_checkout("ord-1", "nonexistent", 1)
    assert result["success"] is False
    assert "not found" in result["error"]


def test_prepare_checkout_quantity_multiplies_price():
    result = prepare_checkout("ord-1", "lum-jewel-001", 2)
    assert result["product"]["total_amount"] == 248.0


def test_prepare_checkout_non_age_gated_no_credentials():
    result = prepare_checkout("ord-1", "lum-jewel-001", 1)
    assert result["checkout_summary"]["required_credentials"] == []
    assert result["checkout_summary"]["optional_credentials"] == []
    assert result["checkout_summary"]["requires_credential_prompt"] is False


def test_prepare_checkout_age_gated_product_requires_age():
    result = prepare_checkout("ord-1", "lum-bev-001", 1)
    assert result["success"] is True
    assert "age_verification" in result["checkout_summary"]["required_credentials"]
    assert result["checkout_summary"]["requires_credential_prompt"] is True


# ── prepare_cart_checkout ─────────────────────────────────────────────────────

def test_prepare_cart_checkout_two_items():
    result = prepare_cart_checkout("ord-2", [
        {"product_id": "lum-jewel-001", "quantity": 1},
        {"product_id": "lum-home-001", "quantity": 2},
    ])
    assert result["success"] is True
    assert len(result["cart"]) == 2
    assert result["total_amount"] == round(124 + 68 * 2, 2)


def test_prepare_cart_checkout_age_gated_item_adds_age_credential():
    result = prepare_cart_checkout("ord-3", [
        {"product_id": "lum-jewel-001", "quantity": 1},
        {"product_id": "lum-bev-001", "quantity": 1},
    ])
    assert "age_verification" in result["checkout_summary"]["required_credentials"]


def test_prepare_cart_checkout_unknown_product():
    result = prepare_cart_checkout("ord-4", [{"product_id": "bad-id", "quantity": 1}])
    assert result["success"] is False


# ── request_checkout_verification ─────────────────────────────────────────────

def test_request_checkout_verification_no_draft():
    result = request_checkout_verification("no-draft", True)
    assert result["success"] is False


def test_request_checkout_verification_creates_session():
    prepare_checkout("ord-5", "lum-bev-001", 1)
    result = request_checkout_verification("ord-5", True)
    assert result["success"] is True
    assert result["session_id"] is not None
    assert "dcql_query" in result


# ── submit_credential ─────────────────────────────────────────────────────────

def test_submit_credential_unknown_session():
    with pytest.raises(ValueError, match="Session not found"):
        submit_credential("nonexistent", {})


def test_submit_credential_required_missing_blocks_purchase():
    prepare_checkout("ord-6", "lum-bev-001", 1)
    vr = request_checkout_verification("ord-6", False)
    result = submit_credential(vr["session_id"], {"age_verification": False})
    assert result["can_complete_purchase"] is False


def test_submit_credential_age_verified_allows_purchase():
    prepare_checkout("ord-7", "lum-bev-001", 1)
    vr = request_checkout_verification("ord-7", False)
    result = submit_credential(vr["session_id"], {"age_verification": True})
    assert result["can_complete_purchase"] is True
    assert result["total_discount_amount"] == 0.0


def test_submit_credential_cannot_be_called_twice():
    prepare_checkout("ord-9", "lum-bev-001", 1)
    vr = request_checkout_verification("ord-9", True)
    submit_credential(vr["session_id"], {"age_verification": True})
    with pytest.raises(ValueError, match="already finalized"):
        submit_credential(vr["session_id"], {"age_verification": True})
