# FastMCP Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone Python FastMCP service (`mcp/`) in a2ui_concierge that ports the commerce/credential tools from agentic_ai_commerce, then wire the GiftAgent to use it via Anthropic's native MCP beta.

**Architecture:** A new `mcp/` directory at the repo root holds a self-contained Python FastMCP service (port 3001) with four tools: `prepare_checkout`, `prepare_cart_checkout`, `request_checkout_verification`, and `submit_credential`. The `catalog.json` is extended with credential fields and three age-gated gift products. `agent.py` switches to `client.beta.messages.create` and adds `mcp_servers`.

**Tech Stack:** Python 3.12, FastMCP 2.x, uvicorn, pytest, Anthropic Python SDK (>=0.40)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `mcp/pyproject.toml` | FastMCP service project config |
| Create | `mcp/dcql.py` | DCQL query assembler |
| Create | `mcp/sessions.py` | In-memory checkout session store |
| Create | `mcp/data.py` | Credential definitions + catalog loader |
| Create | `mcp/server.py` | FastMCP app + 4 @mcp.tool decorators |
| Create | `mcp/tests/__init__.py` | Test package marker |
| Create | `mcp/tests/test_dcql.py` | DCQL builder tests |
| Create | `mcp/tests/test_sessions.py` | Session store tests |
| Create | `mcp/tests/test_data.py` | Data layer tests |
| Create | `mcp/tests/test_server.py` | MCP tool integration tests |
| Modify | `backend/src/concierge/catalog.json` | Add credential fields + 3 age-gated products |
| Modify | `backend/src/concierge/agent.py` | Switch to beta client + mcp_servers |

---

## Task 1: Bootstrap `mcp/` project

**Files:**
- Create: `mcp/pyproject.toml`
- Create: `mcp/tests/__init__.py`

- [ ] **Step 1: Create `mcp/pyproject.toml`**

```toml
[project]
name = "a2ui-mcp"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastmcp>=2.0",
  "uvicorn[standard]>=0.30",
]

[project.optional-dependencies]
dev = ["pytest>=8.3", "pytest-asyncio>=0.24", "httpx>=0.27"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
pythonpath = ["."]
```

- [ ] **Step 2: Create `mcp/tests/__init__.py`** (empty file)

- [ ] **Step 3: Install dependencies**

Run from `mcp/`:
```bash
cd mcp && pip install -e ".[dev]"
```

Expected: installs fastmcp, uvicorn, pytest, pytest-asyncio

- [ ] **Step 4: Commit**

```bash
git add mcp/pyproject.toml mcp/tests/__init__.py
git commit -m "feat(mcp): bootstrap FastMCP service project"
```

---

## Task 2: Update `catalog.json` with credential fields

**Files:**
- Modify: `backend/src/concierge/catalog.json`

- [ ] **Step 1: Add credential fields to all existing products**

Run this script from the repo root:
```python
import json
from pathlib import Path

p = Path("backend/src/concierge/catalog.json")
catalog = json.loads(p.read_text())
for product in catalog:
    product.setdefault("required_credentials", ["payment_credential"])
    product.setdefault("optional_credentials", ["loyalty_membership"])
p.write_text(json.dumps(catalog, indent=2) + "\n")
```

- [ ] **Step 2: Append 3 age-gated gift products**

Run this script from the repo root (appends after the last product):
```python
import json
from pathlib import Path

p = Path("backend/src/concierge/catalog.json")
catalog = json.loads(p.read_text())
catalog.extend([
    {
        "id": "lum-bev-001",
        "name": "Champagne Gift Set",
        "category": "home",
        "vibe_tags": ["warm", "playful"],
        "price": 89,
        "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
        "description": "A curated selection of fine champagne, perfect for celebrations.",
        "variants": {"size": ["750ml", "1.5L"]},
        "required_credentials": ["age_verification", "payment_credential"],
        "optional_credentials": ["loyalty_membership"]
    },
    {
        "id": "lum-bev-002",
        "name": "Whiskey Collection",
        "category": "home",
        "vibe_tags": ["bold", "warm"],
        "price": 124,
        "image_url": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&q=80",
        "description": "Three single-malt expressions, hand-selected by our spirits curator.",
        "variants": {"size": ["200ml", "375ml"]},
        "required_credentials": ["age_verification", "payment_credential"],
        "optional_credentials": ["loyalty_membership"]
    },
    {
        "id": "lum-bev-003",
        "name": "Craft Beer Sampler",
        "category": "home",
        "vibe_tags": ["playful", "natural"],
        "price": 48,
        "image_url": "https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=600&q=80",
        "description": "Twelve craft beers from independent breweries — a different discovery every sip.",
        "variants": {"count": ["12-pack", "24-pack"]},
        "required_credentials": ["age_verification", "payment_credential"],
        "optional_credentials": ["loyalty_membership"]
    }
])
p.write_text(json.dumps(catalog, indent=2) + "\n")
```

- [ ] **Step 3: Verify existing catalog tests still pass**

Run from `backend/`:
```bash
cd backend && python -m pytest tests/test_catalog.py -v
```
Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/concierge/catalog.json
git commit -m "feat(catalog): add credential fields and age-gated gift products"
```

---

## Task 3: Create `mcp/dcql.py`

**Files:**
- Create: `mcp/dcql.py`
- Create: `mcp/tests/test_dcql.py`

- [ ] **Step 1: Write the failing tests**

Create `mcp/tests/test_dcql.py`:
```python
from dcql import CredentialDefinition, CredentialOption, build_checkout_verification_dcql


def _payment_def() -> CredentialDefinition:
    return CredentialDefinition(
        key="payment_credential",
        label="Digital payment credential",
        dcql_purpose="Payment authorization for {amount}",
        dcql_options=[
            CredentialOption(
                id="payment",
                format="mso_mdoc",
                meta={"doctype_value": "org.multipaz.payment.sca.1"},
                claims=[{"id": "holder_name", "path": ["org.multipaz.payment.sca.1", "holder_name"]}],
                claim_sets=[["holder_name"]],
            )
        ],
    )


def _age_def() -> CredentialDefinition:
    return CredentialDefinition(
        key="age_verification",
        label="Age verification",
        dcql_purpose="Age verification for restricted purchase",
        dcql_options=[
            CredentialOption(
                id="mdl",
                format="mso_mdoc",
                meta={"doctype_value": "org.iso.18013.5.1.mDL"},
                claims=[{"id": "age_over_21", "path": ["org.iso.18013.5.1", "age_over_21"]}],
                claim_sets=[["age_over_21"]],
            )
        ],
    )


def test_single_credential_builds_correct_structure():
    defs = [_payment_def()]
    result = build_checkout_verification_dcql(49.99, ["payment_credential"], defs)
    assert len(result["credentials"]) == 1
    assert result["credentials"][0]["id"] == "payment"
    assert result["credentials"][0]["format"] == "mso_mdoc"
    assert len(result["credential_sets"]) == 1
    assert result["credential_sets"][0]["purpose"] == "Payment authorization for 49.99"


def test_amount_placeholder_replaced():
    defs = [_payment_def()]
    result = build_checkout_verification_dcql(123.45, ["payment_credential"], defs)
    assert "123.45" in result["credential_sets"][0]["purpose"]


def test_multiple_credentials_produce_multiple_sets():
    defs = [_payment_def(), _age_def()]
    result = build_checkout_verification_dcql(50.00, ["payment_credential", "age_verification"], defs)
    assert len(result["credentials"]) == 2
    assert len(result["credential_sets"]) == 2


def test_unknown_credential_key_is_skipped():
    defs = [_payment_def()]
    result = build_checkout_verification_dcql(10.00, ["payment_credential", "nonexistent"], defs)
    assert len(result["credentials"]) == 1


def test_duplicate_keys_deduplicated():
    defs = [_payment_def()]
    result = build_checkout_verification_dcql(10.00, ["payment_credential", "payment_credential"], defs)
    assert len(result["credentials"]) == 1
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd mcp && python -m pytest tests/test_dcql.py -v
```
Expected: ImportError or ModuleNotFoundError for `dcql`

- [ ] **Step 3: Create `mcp/dcql.py`**

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any


@dataclass
class CredentialOption:
    id: str
    format: str
    meta: dict[str, str]
    claims: list[dict[str, Any]]
    claim_sets: list[list[str]]


@dataclass
class CredentialDefinition:
    key: str
    label: str
    dcql_purpose: str
    dcql_options: list[CredentialOption]
    discount_percentage: float | None = None


def build_checkout_verification_dcql(
    amount: float,
    requested_credentials: list[str],
    credential_definitions: list[CredentialDefinition],
) -> dict[str, Any]:
    seen: set[str] = set()
    unique = [k for k in requested_credentials if not (k in seen or seen.add(k))]  # type: ignore[func-returns-value]

    credentials: list[dict[str, Any]] = []
    credential_sets: list[dict[str, Any]] = []

    for key in unique:
        defn = next((d for d in credential_definitions if d.key == key), None)
        if defn is None:
            continue
        purpose = defn.dcql_purpose.replace("{amount}", f"{amount:.2f}")
        option_ids: list[str] = []
        for opt in defn.dcql_options:
            credentials.append({
                "id": opt.id,
                "format": opt.format,
                "meta": opt.meta,
                "claims": opt.claims,
                "claim_sets": opt.claim_sets,
            })
            option_ids.append(opt.id)
        credential_sets.append({
            "purpose": purpose,
            "options": [[oid] for oid in option_ids],
        })

    return {"credentials": credentials, "credential_sets": credential_sets}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd mcp && python -m pytest tests/test_dcql.py -v
```
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add mcp/dcql.py mcp/tests/test_dcql.py
git commit -m "feat(mcp): add DCQL query builder"
```

---

## Task 4: Create `mcp/sessions.py`

**Files:**
- Create: `mcp/sessions.py`
- Create: `mcp/tests/test_sessions.py`

- [ ] **Step 1: Write the failing tests**

Create `mcp/tests/test_sessions.py`:
```python
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
        "required_credentials": ["payment_credential"],
        "optional_credentials": ["loyalty_membership"],
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd mcp && python -m pytest tests/test_sessions.py -v
```
Expected: ImportError for `sessions`

- [ ] **Step 3: Create `mcp/sessions.py`**

```python
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd mcp && python -m pytest tests/test_sessions.py -v
```
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add mcp/sessions.py mcp/tests/test_sessions.py
git commit -m "feat(mcp): add in-memory session store"
```

---

## Task 5: Create `mcp/data.py`

**Files:**
- Create: `mcp/data.py`
- Create: `mcp/tests/test_data.py`

- [ ] **Step 1: Write the failing tests**

Create `mcp/tests/test_data.py`:
```python
from data import CREDENTIAL_DEFINITIONS, get_product


def test_three_credential_definitions_defined():
    keys = {d.key for d in CREDENTIAL_DEFINITIONS}
    assert keys == {"age_verification", "payment_credential", "loyalty_membership"}


def test_loyalty_membership_has_discount():
    loyalty = next(d for d in CREDENTIAL_DEFINITIONS if d.key == "loyalty_membership")
    assert loyalty.discount_percentage == 10.0


def test_payment_credential_has_no_discount():
    payment = next(d for d in CREDENTIAL_DEFINITIONS if d.key == "payment_credential")
    assert payment.discount_percentage is None


def test_get_product_returns_existing_product():
    p = get_product("lum-jewel-001")
    assert p is not None
    assert p["name"] == "Bar Pendant Necklace"
    assert "required_credentials" in p
    assert "payment_credential" in p["required_credentials"]


def test_get_product_returns_none_for_unknown():
    assert get_product("nonexistent-id") is None


def test_age_gated_products_have_age_verification():
    for pid in ("lum-bev-001", "lum-bev-002", "lum-bev-003"):
        p = get_product(pid)
        assert p is not None, f"{pid} missing from catalog"
        assert "age_verification" in p["required_credentials"], f"{pid} missing age_verification"


def test_all_products_have_payment_credential():
    from data import _load_catalog
    for p in _load_catalog():
        assert "payment_credential" in p["required_credentials"], \
            f"{p['id']} missing payment_credential"


def test_all_products_have_loyalty_as_optional():
    from data import _load_catalog
    for p in _load_catalog():
        assert "loyalty_membership" in p["optional_credentials"], \
            f"{p['id']} missing loyalty_membership optional"
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd mcp && python -m pytest tests/test_data.py -v
```
Expected: ImportError for `data`

- [ ] **Step 3: Create `mcp/data.py`**

```python
from __future__ import annotations
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from dcql import CredentialDefinition, CredentialOption

_CATALOG_PATH = Path(__file__).parent.parent / "backend" / "src" / "concierge" / "catalog.json"


@lru_cache(maxsize=1)
def _load_catalog() -> list[dict[str, Any]]:
    return json.loads(_CATALOG_PATH.read_text())


def get_product(product_id: str) -> dict[str, Any] | None:
    return next((p for p in _load_catalog() if p["id"] == product_id), None)


CREDENTIAL_DEFINITIONS: list[CredentialDefinition] = [
    CredentialDefinition(
        key="age_verification",
        label="Age verification (required for restricted products)",
        dcql_purpose="Age verification for restricted purchase",
        dcql_options=[
            CredentialOption(
                id="mdl",
                format="mso_mdoc",
                meta={"doctype_value": "org.iso.18013.5.1.mDL"},
                claims=[
                    {"id": "given_name", "path": ["org.iso.18013.5.1", "given_name"]},
                    {"id": "family_name", "path": ["org.iso.18013.5.1", "family_name"]},
                    {"id": "age_over_21", "path": ["org.iso.18013.5.1", "age_over_21"]},
                    {"id": "age_over_18", "path": ["org.iso.18013.5.1", "age_over_18"]},
                ],
                claim_sets=[["age_over_21"], ["age_over_18"]],
            ),
            CredentialOption(
                id="eupid",
                format="mso_mdoc",
                meta={"doctype_value": "eu.europa.ec.eudi.pid.1"},
                claims=[
                    {"id": "given_name", "path": ["eu.europa.ec.eudi.pid.1", "given_name"]},
                    {"id": "family_name", "path": ["eu.europa.ec.eudi.pid.1", "family_name"]},
                    {"id": "age_over_18", "path": ["eu.europa.ec.eudi.pid.1", "age_over_18"]},
                ],
                claim_sets=[["age_over_18"]],
            ),
        ],
    ),
    CredentialDefinition(
        key="payment_credential",
        label="Digital payment credential (required to pay)",
        dcql_purpose="Payment authorization for {amount}",
        dcql_options=[
            CredentialOption(
                id="payment",
                format="mso_mdoc",
                meta={"doctype_value": "org.multipaz.payment.sca.1"},
                claims=[
                    {"id": "issuer_name", "path": ["org.multipaz.payment.sca.1", "issuer_name"]},
                    {"id": "holder_name", "path": ["org.multipaz.payment.sca.1", "holder_name"]},
                    {"id": "masked_account_reference", "path": ["org.multipaz.payment.sca.1", "masked_account_reference"]},
                ],
                claim_sets=[["issuer_name"], ["holder_name"], ["masked_account_reference"]],
            ),
        ],
    ),
    CredentialDefinition(
        key="loyalty_membership",
        label="Loyalty membership (optional — 10% discount)",
        discount_percentage=10.0,
        dcql_purpose="Loyalty membership discount eligibility",
        dcql_options=[
            CredentialOption(
                id="membership",
                format="mso_mdoc",
                meta={"doctype_value": "org.multipaz.loyalty.1"},
                claims=[
                    {"id": "membership_number", "path": ["org.multipaz.loyalty.1", "membership_number"]},
                    {"id": "tier", "path": ["org.multipaz.loyalty.1", "tier"]},
                ],
                claim_sets=[["membership_number"], ["tier"]],
            ),
        ],
    ),
]
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd mcp && python -m pytest tests/test_data.py -v
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add mcp/data.py mcp/tests/test_data.py
git commit -m "feat(mcp): add credential definitions and catalog loader"
```

---

## Task 6: Create `mcp/server.py`

**Files:**
- Create: `mcp/server.py`
- Create: `mcp/tests/test_server.py`

- [ ] **Step 1: Write the failing tests**

Create `mcp/tests/test_server.py`:
```python
import pytest
from unittest.mock import patch
from server import prepare_checkout, prepare_cart_checkout, request_checkout_verification, submit_credential
from sessions import SessionStore


@pytest.fixture(autouse=True)
def fresh_store(monkeypatch):
    """Replace module-level store with a fresh one for each test."""
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


def test_prepare_checkout_non_age_gated_product_no_age_credential():
    result = prepare_checkout("ord-1", "lum-jewel-001", 1)
    assert "age_verification" not in result["checkout_summary"]["required_credentials"]


def test_prepare_checkout_age_gated_product_requires_age():
    result = prepare_checkout("ord-1", "lum-bev-001", 1)
    assert result["success"] is True
    assert "age_verification" in result["checkout_summary"]["required_credentials"]


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
    result = request_checkout_verification("no-draft", 50.0, True)
    assert result["success"] is False


def test_request_checkout_verification_creates_session():
    prepare_checkout("ord-5", "lum-jewel-001", 1)
    result = request_checkout_verification("ord-5", 124.0, True)
    assert result["success"] is True
    assert result["session_id"] is not None
    assert "dcql_query" in result


# ── submit_credential ─────────────────────────────────────────────────────────

def test_submit_credential_unknown_session():
    with pytest.raises(ValueError, match="Session not found"):
        submit_credential("nonexistent", "checkout_verification", {})


def test_submit_credential_required_missing_blocks_purchase():
    prepare_checkout("ord-6", "lum-jewel-001", 1)
    vr = request_checkout_verification("ord-6", 124.0, False)
    result = submit_credential(vr["session_id"], "checkout_verification", {
        "payment_credential": False,
    })
    assert result["can_complete_purchase"] is False


def test_submit_credential_all_required_allows_purchase():
    prepare_checkout("ord-7", "lum-jewel-001", 1)
    vr = request_checkout_verification("ord-7", 124.0, False)
    result = submit_credential(vr["session_id"], "checkout_verification", {
        "payment_credential": True,
    })
    assert result["can_complete_purchase"] is True


def test_submit_credential_loyalty_applies_discount():
    prepare_checkout("ord-8", "lum-jewel-001", 1)
    vr = request_checkout_verification("ord-8", 124.0, True)
    result = submit_credential(vr["session_id"], "checkout_verification", {
        "payment_credential": True,
        "loyalty_membership": True,
    })
    assert result["can_complete_purchase"] is True
    assert result["total_discount_amount"] == round(124.0 * 0.10, 2)
    assert result["final_amount"] == round(124.0 * 0.90, 2)
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd mcp && python -m pytest tests/test_server.py -v
```
Expected: ImportError for `server`

- [ ] **Step 3: Create `mcp/server.py`**

```python
from __future__ import annotations
from typing import Any

from fastmcp import FastMCP

from data import CREDENTIAL_DEFINITIONS, get_product
from dcql import build_checkout_verification_dcql
from sessions import Session, SessionStore

mcp = FastMCP("a2ui_concierge")

_store = SessionStore()
_drafts: dict[str, dict[str, Any]] = {}


# ── prepare_checkout ──────────────────────────────────────────────────────────

@mcp.tool()
def prepare_checkout(order_id: str, product_id: str, quantity: int = 1) -> dict[str, Any]:
    """Prepares a checkout for a single product — total price, required credentials, optional discount credentials."""
    product = get_product(product_id)
    if product is None:
        return {"success": False, "error": f"Product not found: {product_id}"}

    total_amount = round(product["price"] * quantity, 2)
    required = product.get("required_credentials", [])
    optional = product.get("optional_credentials", [])

    _drafts[order_id] = {
        "order_id": order_id,
        "items": [{"product_id": product_id, "quantity": quantity}],
        "amount": total_amount,
        "required_credentials": required,
        "optional_credentials": optional,
    }

    requires_prompt = len(required) + len(optional) > 0

    def label_for(key: str) -> str:
        defn = next((d for d in CREDENTIAL_DEFINITIONS if d.key == key), None)
        return defn.label if defn else key

    return {
        "success": True,
        "order_id": order_id,
        "product": {
            "id": product["id"],
            "name": product["name"],
            "unit_price": product["price"],
            "quantity": quantity,
            "total_amount": total_amount,
        },
        "checkout_summary": {
            "requires_credential_prompt": requires_prompt,
            "required_credentials": required,
            "optional_credentials": optional,
            "required_credential_descriptions": [label_for(k) for k in required],
            "optional_credential_descriptions": [label_for(k) for k in optional],
            "next_step_prompt": (
                "Please ask user if they want to proceed with credential presentation."
                if requires_prompt
                else "No credentials required. Proceed to final confirmation."
            ),
        },
    }


# ── prepare_cart_checkout ─────────────────────────────────────────────────────

@mcp.tool()
def prepare_cart_checkout(order_id: str, items: list[dict[str, Any]]) -> dict[str, Any]:
    """Prepares a single checkout for a multi-product cart. Always use this instead of calling prepare_checkout per item when the user is buying more than one product."""
    required_set: set[str] = set()
    optional_set: set[str] = set()
    cart: list[dict[str, Any]] = []
    total_amount = 0.0
    not_found: list[str] = []

    for item in items:
        pid = item["product_id"]
        qty = item.get("quantity", 1)
        product = get_product(pid)
        if product is None:
            not_found.append(pid)
            continue
        item_total = round(product["price"] * qty, 2)
        total_amount = round(total_amount + item_total, 2)
        required_set.update(product.get("required_credentials", []))
        optional_set.update(product.get("optional_credentials", []))
        cart.append({
            "id": product["id"],
            "name": product["name"],
            "unit_price": product["price"],
            "quantity": qty,
            "item_total": item_total,
        })

    if not_found:
        return {"success": False, "error": f"Products not found: {', '.join(not_found)}"}

    required = list(required_set)
    optional = list(optional_set - required_set)  # a required cred must not also appear as optional

    _drafts[order_id] = {
        "order_id": order_id,
        "items": [{"product_id": i["id"], "quantity": i["quantity"]} for i in cart],
        "amount": total_amount,
        "required_credentials": required,
        "optional_credentials": optional,
    }

    def label_for(key: str) -> str:
        defn = next((d for d in CREDENTIAL_DEFINITIONS if d.key == key), None)
        return defn.label if defn else key

    requires_prompt = len(required) + len(optional) > 0

    return {
        "success": True,
        "order_id": order_id,
        "cart": cart,
        "total_amount": total_amount,
        "checkout_summary": {
            "requires_credential_prompt": requires_prompt,
            "required_credentials": required,
            "optional_credentials": optional,
            "required_credential_descriptions": [label_for(k) for k in required],
            "optional_credential_descriptions": [label_for(k) for k in optional],
            "next_step_prompt": (
                "Please ask user if they want to proceed with credential presentation."
                if requires_prompt
                else "No credentials required. Proceed to final confirmation."
            ),
        },
    }


# ── request_checkout_verification ─────────────────────────────────────────────

@mcp.tool()
def request_checkout_verification(
    order_id: str, amount: float, include_optional_credentials: bool = True
) -> dict[str, Any]:
    """After user confirms checkout, assembles a DCQL credential request and opens a verification session."""
    draft = _drafts.get(order_id)
    if draft is None:
        return {
            "success": False,
            "error": "No checkout draft found. Call prepare_checkout or prepare_cart_checkout first.",
        }

    required = draft["required_credentials"]
    optional = draft["optional_credentials"]
    requested = list(dict.fromkeys(
        required + (optional if include_optional_credentials else [])
    ))

    dcql_query = build_checkout_verification_dcql(amount, requested, CREDENTIAL_DEFINITIONS)

    session = _store.create({
        "order_id": order_id,
        "items": draft["items"],
        "amount": amount,
        "dcql_query": dcql_query,
        "required_credentials": required,
        "optional_credentials": optional,
        "credential_definitions": CREDENTIAL_DEFINITIONS,
    })

    return {
        "success": True,
        "session_id": session.id,
        "order_id": order_id,
        "amount": amount,
        "required_credentials": required,
        "optional_credentials": optional,
        "credentials_requested": requested,
        "dcql_query": dcql_query,
    }


# ── submit_credential ─────────────────────────────────────────────────────────

@mcp.tool()
def submit_credential(
    session_id: str,
    credential_type: str,
    credentials: dict[str, bool],
) -> dict[str, Any]:
    """Submits verified credential flags. Required credentials gate the purchase; optional credentials apply discounts."""
    session = _store.get(session_id)
    if session is None:
        raise ValueError(f"Session not found: {session_id}")

    missing_required = [k for k in session.required_credentials if not credentials.get(k)]
    optional_applied = [k for k in session.optional_credentials if credentials.get(k)]
    optional_not_applied = [k for k in session.optional_credentials if not credentials.get(k)]

    success = len(missing_required) == 0
    subtotal = session.amount

    discount_breakdown = [
        {
            "credential": defn.key,
            "percentage": defn.discount_percentage,
            "amount": round(subtotal * defn.discount_percentage / 100, 2),
        }
        for defn in session.credential_definitions
        if defn.key in optional_applied and defn.discount_percentage is not None
    ]

    total_discount = round(sum(d["amount"] for d in discount_breakdown), 2)
    final_amount = round(subtotal - total_discount, 2)

    _store.update(session_id, {
        "status": "complete" if success else "denied",
        "result": {
            "credentials_verified": credentials,
            "blocked_by_required_credentials": missing_required,
            "optional_discounts_applied": optional_applied,
            "optional_discounts_not_applied": optional_not_applied,
            "can_complete_purchase": success,
            "subtotal_amount": subtotal,
            "total_discount_amount": total_discount,
            "final_amount": final_amount,
            "discount_breakdown": discount_breakdown,
        },
    })

    return {
        "success": success,
        "can_complete_purchase": success,
        "blocked_by_required_credentials": missing_required,
        "optional_discounts_applied": optional_applied,
        "optional_discounts_not_applied": optional_not_applied,
        "subtotal_amount": subtotal,
        "total_discount_amount": total_discount,
        "final_amount": final_amount,
        "discount_breakdown": discount_breakdown,
        "credentials_verified": credentials,
    }


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=3001)
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd mcp && python -m pytest tests/test_server.py -v
```
Expected: all tests PASS

- [ ] **Step 5: Smoke-test the server starts**

```bash
cd mcp && python server.py &
sleep 2
curl -s http://localhost:3001/mcp | head -c 200
kill %1
```
Expected: server starts without errors, curl returns a response (may be 4xx without a proper MCP handshake — that's fine)

- [ ] **Step 6: Commit**

```bash
git add mcp/server.py mcp/tests/test_server.py
git commit -m "feat(mcp): add FastMCP server with checkout and credential tools"
```

---

## Task 7: Wire `agent.py` to the MCP server

**Files:**
- Modify: `backend/src/concierge/agent.py`
- Modify: `backend/tests/test_app.py` (update mock expectations)

- [ ] **Step 1: Read the current agent test to understand mock structure**

```bash
cat backend/tests/test_app.py
```

- [ ] **Step 2: Write the failing test**

Add to `backend/tests/test_app.py` (adjust existing mock structure as needed):
```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from concierge.agent import GiftAgent


@pytest.mark.asyncio
async def test_agent_uses_beta_client_with_mcp_servers():
    """agent.turn() must call client.beta.messages.create with mcp_servers."""
    agent = GiftAgent()

    mock_response = MagicMock()
    mock_response.content = []
    mock_response.stop_reason = "end_turn"

    with patch.object(agent.client.beta.messages, "create", new=AsyncMock(return_value=mock_response)) as mock_create:
        async for _ in agent.turn("hello"):
            pass

    call_kwargs = mock_create.call_args.kwargs
    assert "mcp_servers" in call_kwargs
    assert call_kwargs["mcp_servers"][0]["name"] == "a2ui_concierge"
    assert "mcp-client-2025-04-04" in call_kwargs["betas"]
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd backend && python -m pytest tests/test_app.py::test_agent_uses_beta_client_with_mcp_servers -v
```
Expected: FAIL — `create` called on `client.messages`, not `client.beta.messages`

- [ ] **Step 4: Update `backend/src/concierge/agent.py`**

Change the `while True:` block — replace `self.client.messages.create(` with `self.client.beta.messages.create(` and add the two new parameters:

```python
            response = await self.client.beta.messages.create(
                model=MODEL,
                max_tokens=2048,
                system=[{
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }],
                tools=TOOL_SCHEMAS,
                mcp_servers=[{
                    "type": "url",
                    "url": "http://localhost:3001/mcp",
                    "name": "a2ui_concierge",
                }],
                betas=["mcp-client-2025-04-04"],
                messages=self.history,
            )
```

- [ ] **Step 5: Run the new test — expect PASS**

```bash
cd backend && python -m pytest tests/test_app.py::test_agent_uses_beta_client_with_mcp_servers -v
```
Expected: PASS

- [ ] **Step 6: Run the full backend test suite**

```bash
cd backend && python -m pytest -v
```
Expected: all tests PASS (existing tests may need mock updates if they assert on `client.messages.create` — update them to `client.beta.messages.create` with the same return value pattern)

- [ ] **Step 7: Commit**

```bash
git add backend/src/concierge/agent.py backend/tests/test_app.py
git commit -m "feat(agent): connect to FastMCP server via Anthropic native MCP beta"
```

---

## Running the Full Stack

After all tasks are done, start both services:

```bash
# Terminal 1 — FastMCP server
cd mcp && python server.py

# Terminal 2 — FastAPI backend
cd backend && uvicorn concierge.app:app --reload --port 8000
```

The concierge agent now has access to all 12 tools (8 local + 4 MCP).
