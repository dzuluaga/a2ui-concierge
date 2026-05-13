from __future__ import annotations
from typing import Any
from datetime import date, timedelta
import json
import os
from concierge import catalog, a2ui, payments

MCP_URL = os.environ.get("MCP_URL", "http://localhost:3001/mcp")


async def _call_mcp(tool: str, args: dict[str, Any]) -> dict[str, Any]:
    """Call a single MCP tool and return its parsed JSON result."""
    from fastmcp import Client as McpClient
    from fastmcp.exceptions import ToolError
    try:
        async with McpClient(MCP_URL) as mcp:
            result = await mcp.call_tool(tool, args)
        items = result.content if hasattr(result, "content") else result
        parts = [item.text if hasattr(item, "text") else str(item) for item in items]
        return json.loads("\n".join(parts) if parts else "{}")
    except ToolError as exc:
        return {"success": False, "error": str(exc)}

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "search_catalog",
        "description": "Search the Lumen Goods catalog by category, price ceiling, and vibe tags.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string",
                             "enum": ["jewelry", "home", "stationery", "skincare", "beverages"]},
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
        "description": (
            "Stage an order and return an x402 USDC payment challenge as the "
            "next agent bubble. The user signs and pays from their on-device "
            "wallet, then the client emits `[ui-action] payment-completed` "
            "with the tx hash. Only after that does the agent call "
            "present_confirmation."
        ),
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
            "paragraph between sections.\n\n"
            "Items: pass ONLY the `id` (must be from search_catalog results) and "
            "optionally a one-sentence `why` for that pick. All product display "
            "data (name, price, image, vendor) comes from the catalog — never "
            "supply it."
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
                            "why": {"type": "string"},
                        },
                        "required": ["id"],
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
        "description": (
            "Render the final order confirmation bubble. Pass `order_id`, "
            "`tx_hash`, and `explorer_url` from the `[ui-action] payment-completed` "
            "payload. Order line items, total, and ship date come from the "
            "server-side order record — do not supply them."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "tx_hash": {"type": "string"},
                "explorer_url": {"type": "string"},
            },
            "required": ["order_id"],
        },
    },
]


async def run_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Execute a tool. Returns either tool output (for state-changing tools)
    or an A2UI fragment (for present_* tools, prefixed with `_a2ui`)."""
    if name == "search_catalog":
        return {"results": catalog.search(**args)}
    if name == "get_product":
        try:
            return catalog.get(args["product_id"])
        except KeyError:
            # Return error inline so the agent can self-correct instead of the
            # whole turn aborting on KeyError. The model should call
            # search_catalog and pick a real id.
            return {"error": "unknown product_id", "product_id": args["product_id"]}
    if name == "place_order":
        product = catalog.get(args["product_id"])
        product_price = float(product.get("sale_price") or product["price"])
        gift_wrap_fee = 8.0 if args.get("gift_wrap") else 0.0
        total = round(product_price + gift_wrap_fee, 2)
        line_items: list[tuple[str, float]] = [(product["name"], product_price)]
        if gift_wrap_fee:
            line_items.append(("Gift wrap", gift_wrap_fee))
        # Demo cap: when running the on-chain x402 path against a testnet
        # faucet drip, real cart totals quickly exceed available USDC. Set
        # X402_DEMO_MAX_PRICE=<dollars> to clamp the settled amount; we
        # replace the line items with a single placeholder so the payment
        # sheet still balances. Off by default — mock-settle keeps real
        # prices intact.
        if payments.DEMO_MAX_PRICE is not None and total > payments.DEMO_MAX_PRICE:
            total = payments.DEMO_MAX_PRICE
            line_items = [(f"Lumen Concierge (demo) — {product['name']}", total)]
        ship_date = (date.today() + timedelta(days=4)).strftime("%a, %b %d")
        challenge = payments.build_challenge(
            total_dollars=total,
            label=f"Lumen Goods — {product['name']}",
        )
        # Stash the order details so the confirmation bubble (after settle)
        # can be rebuilt deterministically.
        record = payments.get_order(challenge["order_id"])
        if record is not None:
            record["line_items"] = line_items
            record["total"] = total
            record["ship_date"] = ship_date
            record["product_id"] = product["id"]
        dcql = await _call_mcp("get_payment_dcql", {
            "product_id": product["id"],
            "total_amount": total,
        })
        return {"_a2ui": a2ui.payment_challenge(
            challenge=challenge,
            line_items=line_items,
            requires_age_verification=dcql.get("requires_age_verification", False),
            age_dcql_query_json=dcql.get("age_dcql_query_json"),
            dpc_dcql_query_json=dcql.get("dpc_dcql_query_json"),
            loyalty_discount_pct=dcql.get("loyalty_discount_pct", 0),
            loyalty_dcql_query_json=dcql.get("loyalty_dcql_query_json"),
        )}
    if name == "present_chips":
        return {"_a2ui": a2ui.chips(
            question=args["question"],
            options=[(o["value"], o["label"]) for o in args["options"]],
        )}
    if name == "present_products":
        # Strict hydration: drop items whose IDs aren't in the catalog. The
        # alternative (keeping the model's fabricated entry) renders cards the
        # agent can't navigate from — `get_product` immediately fails. Better
        # to skip and let the agent recover by re-searching.
        hydrated: list[dict[str, Any]] = []
        dropped: list[str] = []
        for item in args["items"]:
            try:
                full = catalog.get(item["id"])
            except KeyError:
                dropped.append(item.get("id", "<no id>"))
                continue
            hydrated.append({**full, "why": item.get("why", "")})
        if not hydrated:
            return {
                "error": "no valid product ids",
                "hint": "Call search_catalog first and only use ids returned in its results.",
                "dropped": dropped,
            }
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
        order_id = args["order_id"]
        record = payments.get_order(order_id)
        if record is None:
            return {"error": "unknown order_id", "order_id": order_id}
        return {"_a2ui": a2ui.confirmation(
            order_id=order_id,
            line_items=record["line_items"],
            total=record["total"],
            ship_date=record["ship_date"],
            tx_hash=args.get("tx_hash") or record.get("tx_hash"),
            explorer_url=args.get("explorer_url"),
        )}
    raise ValueError(f"Unknown tool: {name}")
