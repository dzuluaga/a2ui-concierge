"""A2UI v0.8 message builders.

Each builder returns a list of v0.8 protocol messages — typically a
``surfaceUpdate`` followed by a ``beginRendering`` — so each agent bubble
is a self-contained surface with a fresh ``surfaceId``.

Two catalogs are used:

* **Standard v0.8 catalog** (``STANDARD_CATALOG_ID``) — simple bubbles that
  compose ``Text``, ``Image``, ``Row``, ``Column``, ``Card``, ``Button``,
  ``CheckBox``, ``TextField``, ``MultipleChoice``. Used by :func:`chips`,
  :func:`form`, and :func:`confirmation`.
* **Custom catalog** ``lumen.com:concierge/v1`` (``CATALOG_ID``) — composite
  components that bundle interaction logic the standard primitives can't
  express: :func:`products` (``CardGrid``), :func:`product_detail`
  (``ProductDetail``), :func:`payment_challenge` (``PaymentChallenge`` —
  the x402 signing UI).

Wire shape (v0.8, server-to-client) for a standard-catalog chip group::

    {"surfaceUpdate": {"surfaceId": "s-...", "components": [
        {"id": "col", "component": {"Column": {
            "children": {"explicitList": ["q", "chips"]}}}},
        {"id": "q", "component": {"Text": {"text": {"literalString": "..."}}}},
        {"id": "chips", "component": {"Row": {
            "children": {"explicitList": ["b1", ...]}}}},
        {"id": "b1", "component": {"Button": {
            "child": "b1-label",
            "action": {"name": "chip-group",
                       "context": [{"key": "value", "value": {"literalString": "v1"}}]}}}},
        {"id": "b1-label", "component": {"Text": {"text": {"literalString": "..."}}}}
    ]}}
    {"beginRendering": {"surfaceId": "s-...", "root": "col",
                         "catalogId": STANDARD_CATALOG_ID}}
"""
from __future__ import annotations
from typing import Any, Iterable
import uuid

CATALOG_ID = "lumen.com:concierge/v1"
STANDARD_CATALOG_ID = (
    "https://a2ui.org/specification/v0_8/standard_catalog_definition.json"
)

A2uiMessage = dict[str, Any]


def _bind_str(value: str | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return {"literalString": value}


def _bind_bool(value: bool | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return {"literalBoolean": value}


def _bind_num(value: float | int | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return {"literalNumber": value}


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def _wrap_surface(component_type: str, props: dict[str, Any]) -> list[A2uiMessage]:
    """Bundle a single custom-catalog component as the root of a fresh surface."""
    surface_id = _new_id("s")
    root_id = _new_id("c")
    cleaned = {k: v for k, v in props.items() if v is not None}
    return [
        {"surfaceUpdate": {
            "surfaceId": surface_id,
            "components": [
                {"id": root_id, "component": {component_type: cleaned}}
            ],
        }},
        {"beginRendering": {
            "surfaceId": surface_id,
            "root": root_id,
            "catalogId": CATALOG_ID,
        }},
    ]


def _std_surface(components: list[dict[str, Any]], root_id: str) -> list[A2uiMessage]:
    """Bundle a standard-catalog component graph as a fresh surface."""
    surface_id = _new_id("s")
    return [
        {"surfaceUpdate": {"surfaceId": surface_id, "components": components}},
        {"beginRendering": {
            "surfaceId": surface_id,
            "root": root_id,
            "catalogId": STANDARD_CATALOG_ID,
        }},
    ]


def _std_text(text: str, *, usage_hint: str | None = None) -> tuple[str, dict[str, Any]]:
    """Return (id, component-def) for a Text component."""
    cid = _new_id("c")
    props: dict[str, Any] = {"text": _bind_str(text)}
    if usage_hint:
        props["usageHint"] = usage_hint
    return cid, {"id": cid, "component": {"Text": props}}


def _std_button(
    *, label: str, action_name: str,
    context: list[dict[str, Any]] | None = None,
    primary: bool = False,
) -> tuple[str, list[dict[str, Any]]]:
    """Return (root-id, [button-def, label-def])."""
    label_id, label_def = _std_text(label)
    btn_id = _new_id("c")
    action: dict[str, Any] = {"name": action_name}
    if context:
        action["context"] = context
    btn_def = {"id": btn_id, "component": {"Button": {
        "child": label_id,
        "action": action,
        **({"primary": True} if primary else {}),
    }}}
    return btn_id, [btn_def, label_def]


# ── builders ─────────────────────────────────────────────────────────────


def chips(*, question: str, options: Iterable[tuple[str, str]]) -> list[A2uiMessage]:
    """Single-select chip group rendered with standard-catalog primitives.

    Each chip is a Button whose action emits ``chip-group`` with the value
    bound as a literal — so tapping a chip fires the agent action in one
    tap (no separate "Continue" button needed)."""
    col_id = _new_id("c")
    q_id, q_def = _std_text(question, usage_hint="h4")
    chip_defs: list[dict[str, Any]] = []
    chip_ids: list[str] = []
    for value, label in options:
        btn_id, defs = _std_button(
            label=label,
            action_name="chip-group",
            context=[{"key": "value", "value": _bind_str(value)}],
        )
        chip_ids.append(btn_id)
        chip_defs.extend(defs)
    row_id = _new_id("c")
    row_def = {"id": row_id, "component": {"Row": {
        "children": {"explicitList": chip_ids},
    }}}
    col_def = {"id": col_id, "component": {"Column": {
        "children": {"explicitList": [q_id, row_id]},
        "alignment": "stretch",
    }}}
    return _std_surface([col_def, q_def, row_def, *chip_defs], col_id)


def products(
    *, reasoning: str, items: list[dict[str, Any]], section: str | None = None,
) -> list[A2uiMessage]:
    return _wrap_surface("CardGrid", {
        "section": _bind_str(section),
        "reasoning": _bind_str(reasoning),
        "items": [
            {
                "id": p["id"],
                "name": p["name"],
                "price": p["price"],
                "salePrice": p.get("sale_price"),
                "vendor": p.get("vendor"),
                "imageUrl": p["image_url"],
                "why": p.get("why", ""),
            }
            for p in items
        ],
        "action": {"name": "card-grid"},
    })


def product_detail(
    *, product: dict[str, Any], variants: dict[str, list[str]],
) -> list[A2uiMessage]:
    requires_age = "age_verification" in product.get("required_credentials", [])
    return _wrap_surface("ProductDetail", {
        "requiresAgeVerification": _bind_bool(requires_age),
        "product": {
            "id": product["id"],
            "name": product["name"],
            "price": product["price"],
            "salePrice": product.get("sale_price"),
            "vendor": product.get("vendor"),
            "inStock": product.get("in_stock", True),
            "imageUrl": product["image_url"],
            "images": product.get("images") or [product["image_url"]],
            "description": product.get("description", ""),
        },
        "variantGroups": [
            {"name": name, "options": values, "select": "single"}
            for name, values in variants.items()
        ],
        "action": {"name": "product-detail"},
    })


def form(*, fields: list[dict[str, Any]]) -> list[A2uiMessage]:
    """Order form composed from standard-catalog primitives.

    Each field's value lives at ``/<name>`` in the surface data model;
    interactive components (``CheckBox``/``TextField``) two-way bind to
    those paths. The submit button emits the ``form`` action with
    ``values`` resolved from path ``/`` so the agent receives the full
    field bag in one shot.
    """
    components: list[dict[str, Any]] = []
    column_children: list[str] = []
    for f in fields:
        name = f["name"]
        label = f["label"]
        type_ = f["type"]
        cid = _new_id("c")
        if type_ == "toggle":
            components.append({"id": cid, "component": {"CheckBox": {
                "label": _bind_str(label),
                "value": {"path": f"/{name}"},
            }}})
        elif type_ == "text":
            tf_props: dict[str, Any] = {
                "label": _bind_str(label),
                "text": {"path": f"/{name}"},
                "textFieldType": "longText",
            }
            components.append({"id": cid, "component": {"TextField": tf_props}})
        else:
            # `address` and any other field type render as a shortText
            # input; saved-address autocomplete UI lived in the custom
            # component and isn't expressible in the standard catalog.
            components.append({"id": cid, "component": {"TextField": {
                "label": _bind_str(label),
                "text": {"path": f"/{name}"},
                "textFieldType": "shortText",
            }}})
        column_children.append(cid)

    submit_id, submit_defs = _std_button(
        label="Place order",
        action_name="form",
        context=[{"key": "values", "value": {"path": "/"}}],
        primary=True,
    )
    components.extend(submit_defs)
    column_children.append(submit_id)

    col_id = _new_id("c")
    col_def = {"id": col_id, "component": {"Column": {
        "children": {"explicitList": column_children},
        "alignment": "stretch",
    }}}
    return _std_surface([col_def, *components], col_id)


def confirmation(
    *,
    order_id: str,
    line_items: Iterable[tuple[str, float]],
    total: float,
    ship_date: str,
    tx_hash: str | None = None,
    explorer_url: str | None = None,
) -> list[A2uiMessage]:
    """Order-confirmation card composed from standard-catalog primitives.

    Layout: Card → Column with a header Text, one Row per line item, a
    total Text, the ship date, and (when a tx hash is present) a Button
    that fires ``tx-detail-open`` so the host can pop a transaction sheet.
    """
    components: list[dict[str, Any]] = []
    column_children: list[str] = []

    title_id, title_def = _std_text(f"Order {order_id} confirmed", usage_hint="h3")
    components.append(title_def)
    column_children.append(title_id)

    for label, amount in line_items:
        label_id, label_def = _std_text(label)
        amount_id, amount_def = _std_text(f"${amount:.2f}")
        row_id = _new_id("c")
        row_def = {"id": row_id, "component": {"Row": {
            "children": {"explicitList": [label_id, amount_id]},
            "distribution": "spaceBetween",
        }}}
        components.extend([row_def, label_def, amount_def])
        column_children.append(row_id)

    total_id, total_def = _std_text(f"Total: ${total:.2f}", usage_hint="h4")
    components.append(total_def)
    column_children.append(total_id)

    if ship_date:
        ship_id, ship_def = _std_text(f"Ships: {ship_date}", usage_hint="caption")
        components.append(ship_def)
        column_children.append(ship_id)

    if tx_hash:
        ctx: list[dict[str, Any]] = [
            {"key": "order_id", "value": _bind_str(order_id)},
            {"key": "tx_hash", "value": _bind_str(tx_hash)},
            {"key": "ship_date", "value": _bind_str(ship_date or "")},
            {"key": "total", "value": _bind_num(total)},
        ]
        if explorer_url:
            ctx.append({"key": "explorer_url", "value": _bind_str(explorer_url)})
        btn_id, btn_defs = _std_button(
            label="View transaction",
            action_name="tx-detail-open",
            context=ctx,
        )
        components.extend(btn_defs)
        column_children.append(btn_id)

    col_id = _new_id("c")
    col_def = {"id": col_id, "component": {"Column": {
        "children": {"explicitList": column_children},
        "alignment": "stretch",
    }}}
    card_id = _new_id("c")
    card_def = {"id": card_id, "component": {"Card": {"child": col_id}}}
    return _std_surface([card_def, col_def, *components], card_id)


def payment_challenge(
    *,
    challenge: dict[str, Any],
    line_items: Iterable[tuple[str, float]],
    requires_age_verification: bool = False,
    age_dcql_query_json: str | None = None,
    dpc_dcql_query_json: str | None = None,
    loyalty_discount_pct: int = 0,
    loyalty_dcql_query_json: str | None = None,
) -> list[A2uiMessage]:
    """x402 payment sheet. ``challenge`` carries the EIP-3009 fields the
    Android client uses to build a signed envelope; ``line_items`` is the
    order summary."""
    props: dict[str, Any] = {
        "orderId": challenge["order_id"],
        "label": _bind_str(challenge["label"]),
        "amountDisplay": _bind_str(challenge["amount_display"]),
        "items": [{"label": label, "amount": amount} for label, amount in line_items],
        "challenge": challenge,
        "dpcDcqlQueryJson": _bind_str(dpc_dcql_query_json or ""),
        "action": {"name": "payment-challenge"},
    }
    if requires_age_verification:
        props["requiresAgeVerification"] = _bind_bool(True)
        props["ageDcqlQueryJson"] = _bind_str(age_dcql_query_json or "")
    if loyalty_discount_pct:
        props["loyaltyDiscountPct"] = loyalty_discount_pct
        props["loyaltyDcqlQueryJson"] = _bind_str(loyalty_dcql_query_json or "")
    return _wrap_surface("PaymentChallenge", props)


def tx_detail(
    *,
    order_id: str,
    tx_hash: str | None,
    explorer_url: str | None,
    network: str | None,
    items: Iterable[tuple[str, float]],
    total: float | None,
    ship_date: str | None,
    pay_to: str | None = None,
    amount_display: str | None = None,
) -> list[A2uiMessage]:
    """Transaction-detail card composed from standard-catalog primitives.

    Mirrors the client-side synthesizer in the Android host. Each labelled
    field is a Row(Text label, Text value); items are listed inline; a
    Close button emits ``tx-detail-close`` so the host can dismiss the
    sheet.
    """
    components: list[dict[str, Any]] = []
    column_children: list[str] = []

    title_id, title_def = _std_text("Transaction details", usage_hint="h3")
    components.append(title_def)
    column_children.append(title_id)

    def _row(label: str, value: str) -> None:
        l_id, l_def = _std_text(label, usage_hint="caption")
        v_id, v_def = _std_text(value)
        row_id = _new_id("c")
        row_def = {"id": row_id, "component": {"Row": {
            "children": {"explicitList": [l_id, v_id]},
            "distribution": "spaceBetween",
        }}}
        components.extend([row_def, l_def, v_def])
        column_children.append(row_id)

    _row("Order", order_id)
    if network:
        _row("Network", network)
    if amount_display:
        _row("Amount", amount_display)
    elif total is not None:
        _row("Total", f"${total:.2f}")
    if tx_hash:
        _row("Tx hash", tx_hash)
    if pay_to:
        _row("Paid to", pay_to)
    if ship_date:
        _row("Ships", ship_date)
    for label, amount in items:
        _row(label, f"${amount:.2f}")

    close_id, close_defs = _std_button(label="Close", action_name="tx-detail-close")
    components.extend(close_defs)
    column_children.append(close_id)

    if explorer_url:
        explore_id, explore_defs = _std_button(
            label="Open in explorer",
            action_name="tx-detail-open",
            context=[{"key": "explorer_url", "value": _bind_str(explorer_url)}],
            primary=True,
        )
        components.extend(explore_defs)
        column_children.append(explore_id)

    col_id = _new_id("c")
    col_def = {"id": col_id, "component": {"Column": {
        "children": {"explicitList": column_children},
        "alignment": "stretch",
    }}}
    card_id = _new_id("c")
    card_def = {"id": card_id, "component": {"Card": {"child": col_id}}}
    return _std_surface([card_def, col_def, *components], card_id)
