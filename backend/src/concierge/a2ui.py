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
    return {
        "component": "product-detail",
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
) -> dict[str, Any]:
    return {
        "component": "confirmation-card",
        "order_id": order_id,
        "items": [{"label": label, "amount": amount} for label, amount in line_items],
        "total": total,
        "ship_date": ship_date,
    }
