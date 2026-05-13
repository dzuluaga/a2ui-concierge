from __future__ import annotations
from typing import Any, Iterable

# NOTE: field names here should match the fixtures captured in Task A2.
# Read backend/tests/fixtures/a2ui_*.json before changing field names —
# they are the contract Task B2 (Lit components) and Task A4 tests rely on.

def chips(*, question: str, options: Iterable[tuple[str, str]]) -> dict[str, Any]:
    return {
        "component": "chip-group",
        "question": question,
        "select": "single",
        "options": [{"value": v, "label": l} for v, l in options],
    }

def products(
    *, reasoning: str, items: list[dict[str, Any]], section: str | None = None,
) -> dict[str, Any]:
    return {
        "component": "card-grid",
        "section": section,
        "reasoning": reasoning,
        "items": [
            {
                "id": p["id"],
                "name": p["name"],
                "price": p["price"],
                "sale_price": p.get("sale_price"),
                "vendor": p.get("vendor"),
                "image_url": p["image_url"],
                "why": p.get("why", ""),
            }
            for p in items
        ],
    }

def product_detail(*, product: dict[str, Any], variants: dict[str, list[str]]) -> dict[str, Any]:
    requires_age = "age_verification" in product.get("required_credentials", [])
    return {
        "component": "product-detail",
        "requires_age_verification": requires_age,
        "product": {
            "id": product["id"],
            "name": product["name"],
            "price": product["price"],
            "sale_price": product.get("sale_price"),
            "vendor": product.get("vendor"),
            "in_stock": product.get("in_stock", True),
            "image_url": product["image_url"],
            "images": product.get("images") or [product["image_url"]],
            "description": product.get("description", ""),
        },
        "variant_groups": [
            {"name": name, "options": values, "select": "single"}
            for name, values in variants.items()
        ],
    }

def form(*, fields: list[dict[str, Any]]) -> dict[str, Any]:
    return {"component": "form", "fields": fields}

def confirmation(
    *,
    order_id: str,
    line_items: Iterable[tuple[str, float]],
    total: float,
    ship_date: str,
    tx_hash: str | None = None,
    explorer_url: str | None = None,
) -> dict[str, Any]:
    out: dict[str, Any] = {
        "component": "confirmation-card",
        "order_id": order_id,
        "items": [{"label": label, "amount": amount} for label, amount in line_items],
        "total": total,
        "ship_date": ship_date,
    }
    if tx_hash:
        out["tx_hash"] = tx_hash
    if explorer_url:
        out["explorer_url"] = explorer_url
    return out


def payment_challenge(
    *,
    challenge: dict[str, Any],
    line_items: Iterable[tuple[str, float]],
    requires_age_verification: bool = False,
    age_dcql_query_json: str | None = None,
    dpc_dcql_query_json: str | None = None,
    loyalty_discount_pct: int = 0,
    loyalty_dcql_query_json: str | None = None,
) -> dict[str, Any]:
    """Render an x402 payment sheet. The Android client reads ``challenge``
    fields to build an EIP-3009 transferWithAuthorization, biometric-signs it,
    and POSTs to /x402/settle. ``line_items`` is shown as the order summary."""
    out: dict[str, Any] = {
        "component": "payment-challenge",
        "order_id": challenge["order_id"],
        "label": challenge["label"],
        "amount_display": challenge["amount_display"],
        "items": [{"label": label, "amount": amount} for label, amount in line_items],
        "challenge": challenge,
        "dpc_dcql_query_json": dpc_dcql_query_json or "",
    }
    if requires_age_verification:
        out["requires_age_verification"] = True
        out["age_dcql_query_json"] = age_dcql_query_json or ""
    if loyalty_discount_pct:
        out["loyalty_discount_pct"] = loyalty_discount_pct
        out["loyalty_dcql_query_json"] = loyalty_dcql_query_json or ""
    return out
