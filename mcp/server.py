from __future__ import annotations
import json
from typing import Any

from fastmcp import FastMCP

from data import CREDENTIAL_DEFINITIONS, get_product
from dcql import build_checkout_verification_dcql
from sessions import SessionStore

mcp = FastMCP("a2ui_concierge")

_store = SessionStore()
_drafts: dict[str, dict[str, Any]] = {}


def _label_for(key: str) -> str:
    defn = next((d for d in CREDENTIAL_DEFINITIONS if d.key == key), None)
    return defn.label if defn else key


# ── get_payment_dcql ─────────────────────────────────────────────────────────

@mcp.tool()
def get_payment_dcql(product_id: str, total_amount: float) -> dict[str, Any]:
    """Returns all DCQL queries needed for the payment sheet of a product:
    age verification (if the product requires it), loyalty membership (if the
    product offers a discount), and DPC payment credential (always). The
    backend embeds these JSON strings directly into the payment-challenge A2UI
    fragment so the Android client can drive each credential request."""
    product = get_product(product_id)
    if product is None:
        return {"success": False, "error": f"Product not found: {product_id}"}

    required = product.get("required_credentials", [])
    requires_age = "age_verification" in required
    loyalty_discount_pct = product.get("loyalty_discount_pct", 0)

    result: dict[str, Any] = {
        "success": True,
        "requires_age_verification": requires_age,
        "loyalty_discount_pct": loyalty_discount_pct,
        "dpc_dcql_query_json": json.dumps(
            build_checkout_verification_dcql(total_amount, ["dpc_payment"], CREDENTIAL_DEFINITIONS)
        ),
    }

    if requires_age:
        result["age_dcql_query_json"] = json.dumps(
            build_checkout_verification_dcql(total_amount, ["age_verification"], CREDENTIAL_DEFINITIONS)
        )

    if loyalty_discount_pct:
        result["loyalty_dcql_query_json"] = json.dumps(
            build_checkout_verification_dcql(total_amount, ["loyalty_membership"], CREDENTIAL_DEFINITIONS)
        )

    return result


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
            "required_credential_descriptions": [_label_for(k) for k in required],
            "optional_credential_descriptions": [_label_for(k) for k in optional],
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
            "required_credential_descriptions": [_label_for(k) for k in required],
            "optional_credential_descriptions": [_label_for(k) for k in optional],
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
    order_id: str, include_optional_credentials: bool = True
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

    dcql_query = build_checkout_verification_dcql(draft["amount"], requested, CREDENTIAL_DEFINITIONS)

    session = _store.create({
        "order_id": order_id,
        "items": draft["items"],
        "amount": draft["amount"],
        "dcql_query": dcql_query,
        "required_credentials": required,
        "optional_credentials": optional,
        "credential_definitions": CREDENTIAL_DEFINITIONS,
    })

    return {
        "success": True,
        "session_id": session.id,
        "order_id": order_id,
        "amount": draft["amount"],
        "required_credentials": required,
        "optional_credentials": optional,
        "credentials_requested": requested,
        "dcql_query": dcql_query,
    }


# ── submit_credential ─────────────────────────────────────────────────────────

@mcp.tool()
def submit_credential(
    session_id: str,
    credentials: dict[str, bool],
) -> dict[str, Any]:
    """Submits verified credential flags. Required credentials gate the purchase; optional credentials apply discounts."""
    session = _store.get(session_id)
    if session is None:
        raise ValueError(f"Session not found: {session_id}")

    if session.status != "pending":
        raise ValueError(f"Session {session_id} already finalized (status={session.status})")

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
