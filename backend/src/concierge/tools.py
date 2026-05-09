from __future__ import annotations
from typing import Any
import uuid
from datetime import date, timedelta
from concierge import catalog, a2ui

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "search_catalog",
        "description": "Search the Lumen Goods catalog by category, price ceiling, and vibe tags.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string",
                             "enum": ["jewelry", "home", "stationery", "skincare"]},
                "price_max": {"type": "number"},
                "vibe_tags": {"type": "array", "items": {"type": "string"}},
            },
        },
    },
    {
        "name": "get_product",
        "description": "Get full detail for a single product by id.",
        "input_schema": {
            "type": "object",
            "properties": {"product_id": {"type": "string"}},
            "required": ["product_id"],
        },
    },
    {
        "name": "place_order",
        "description": "Place a (mock) order for a configured product.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"},
                "variant_options": {"type": "object", "additionalProperties": {"type": "string"}},
                "gift_wrap": {"type": "boolean"},
                "note": {"type": "string"},
                "address": {"type": "string"},
            },
            "required": ["product_id", "variant_options", "gift_wrap", "address"],
        },
    },
    {
        "name": "present_chips",
        "description": "Render a single-select chip group as the next agent bubble.",
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "options": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "value": {"type": "string"},
                            "label": {"type": "string"},
                        },
                        "required": ["value", "label"],
                    },
                },
            },
            "required": ["question", "options"],
        },
    },
    {
        "name": "present_products",
        "description": (
            "Render a horizontal rail of product cards as the next agent bubble. "
            "Use a short `section` heading (e.g., 'Cozy & Self-Care') when this is "
            "one of several themed rails in the same response. Pass 4-6 items per "
            "section. Re-call this tool for each themed group, with a short text "
            "paragraph between sections."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "section": {"type": "string"},
                "reasoning": {"type": "string"},
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "price": {"type": "number"},
                            "sale_price": {"type": "number"},
                            "vendor": {"type": "string"},
                            "image_url": {"type": "string"},
                            "why": {"type": "string"},
                        },
                        "required": ["id", "name", "price", "image_url"],
                    },
                },
            },
            "required": ["reasoning", "items"],
        },
    },
    {
        "name": "present_product_detail",
        "description": "Render an expanded product detail bubble with variant pickers.",
        "input_schema": {
            "type": "object",
            "properties": {"product_id": {"type": "string"}},
            "required": ["product_id"],
        },
    },
    {
        "name": "present_form",
        "description": "Render a form bubble for note + gift wrap + address.",
        "input_schema": {
            "type": "object",
            "properties": {
                "include_gift_wrap": {"type": "boolean"},
                "include_note": {"type": "boolean"},
            },
        },
    },
    {
        "name": "present_confirmation",
        "description": "Render the final order confirmation bubble.",
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "line_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"label": {"type": "string"}, "amount": {"type": "number"}},
                        "required": ["label", "amount"],
                    },
                },
                "total": {"type": "number"},
                "ship_date": {"type": "string"},
            },
            "required": ["order_id", "line_items", "total", "ship_date"],
        },
    },
]


def run_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Execute a tool. Returns either tool output (for state-changing tools)
    or an A2UI fragment (for present_* tools, prefixed with `_a2ui`)."""
    if name == "search_catalog":
        return {"results": catalog.search(**args)}
    if name == "get_product":
        return catalog.get(args["product_id"])
    if name == "place_order":
        order_id = f"A2UI-{str(uuid.uuid4())[:4].upper()}"
        ship_date = (date.today() + timedelta(days=4)).strftime("%a, %b %d")
        return {"order_id": order_id, "ship_date": ship_date}
    if name == "present_chips":
        return {"_a2ui": a2ui.chips(
            question=args["question"],
            options=[(o["value"], o["label"]) for o in args["options"]],
        )}
    if name == "present_products":
        # Hydrate items from the catalog so vendor/sale_price/images stay
        # authoritative even if the model under-specifies fields.
        hydrated = []
        for item in args["items"]:
            try:
                full = catalog.get(item["id"])
                hydrated.append({**full, "why": item.get("why", "")})
            except KeyError:
                hydrated.append(item)
        return {"_a2ui": a2ui.products(
            section=args.get("section"),
            reasoning=args["reasoning"],
            items=hydrated,
        )}
    if name == "present_product_detail":
        product = catalog.get(args["product_id"])
        return {"_a2ui": a2ui.product_detail(
            product=product, variants=product["variants"],
        )}
    if name == "present_form":
        fields = []
        if args.get("include_gift_wrap", True):
            fields.append({"type": "toggle", "name": "gift_wrap", "label": "Gift wrap (+$8)"})
        if args.get("include_note", True):
            fields.append({"type": "text", "name": "note", "label": "Gift note", "max_length": 120})
        fields.append({"type": "address", "name": "ship_to", "label": "Ship to"})
        return {"_a2ui": a2ui.form(fields=fields)}
    if name == "present_confirmation":
        return {"_a2ui": a2ui.confirmation(
            order_id=args["order_id"],
            line_items=[(li["label"], li["amount"]) for li in args["line_items"]],
            total=args["total"],
            ship_date=args["ship_date"],
        )}
    raise ValueError(f"Unknown tool: {name}")
