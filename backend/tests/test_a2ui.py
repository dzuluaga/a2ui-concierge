"""Tests for the v0.8 A2UI message builders in ``concierge.a2ui``.

The demo is now split across two catalogs:

* **Standard v0.8 catalog** — ``chips``, ``form``, ``confirmation``,
  ``tx_detail``. These compose ``Column``/``Row``/``Card``/``Button``/
  ``Text``/``CheckBox``/``TextField`` primitives, so assertions walk the
  component graph rather than expecting a single named root prop bag.
* **Custom catalog** ``lumen.com:concierge/v1`` — ``products``,
  ``product_detail``, ``payment_challenge``. These still produce a single
  composite root component with structured props.
"""
import json
from pathlib import Path
from concierge import a2ui

FIX = Path(__file__).parent / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIX / name).read_text())


def _surface_update(messages: list[dict]) -> dict:
    return next(m["surfaceUpdate"] for m in messages if "surfaceUpdate" in m)


def _begin(messages: list[dict]) -> dict:
    return next(m["beginRendering"] for m in messages if "beginRendering" in m)


def _components_by_id(messages: list[dict]) -> dict[str, dict]:
    return {c["id"]: c["component"] for c in _surface_update(messages)["components"]}


def _root_component(messages: list[dict]) -> tuple[str, dict]:
    by_id = _components_by_id(messages)
    root_id = _begin(messages)["root"]
    [(component_type, props)] = by_id[root_id].items()
    return component_type, props


def _all_of_type(messages: list[dict], type_name: str) -> list[dict]:
    """Return the props dicts of every component of the given type."""
    return [
        next(iter(c.values()))
        for c in _components_by_id(messages).values()
        if type_name in c
    ]


# ── envelope helpers ────────────────────────────────────────────────────


def _assert_standard_envelope(messages: list[dict]) -> None:
    assert len(messages) == 2
    su = _surface_update(messages)
    begin = _begin(messages)
    assert su["surfaceId"] == begin["surfaceId"]
    assert begin["catalogId"] == a2ui.STANDARD_CATALOG_ID
    assert begin["root"] in {c["id"] for c in su["components"]}


def _assert_custom_envelope(messages: list[dict], expected_type: str) -> None:
    assert len(messages) == 2
    su = _surface_update(messages)
    begin = _begin(messages)
    assert su["surfaceId"] == begin["surfaceId"]
    assert begin["catalogId"] == a2ui.CATALOG_ID
    assert begin["root"] in {c["id"] for c in su["components"]}
    component_type, _ = _root_component(messages)
    assert component_type == expected_type


# ── standard-catalog builders ───────────────────────────────────────────


def test_chips_is_column_of_buttons_with_chip_group_action():
    messages = a2ui.chips(
        question="What does she lean toward?",
        options=[("jewelry", "Jewelry"), ("home", "Home")],
    )
    _assert_standard_envelope(messages)

    # Root is a Column referencing a question Text and a Row of buttons.
    root_type, _ = _root_component(messages)
    assert root_type == "Column"

    texts = _all_of_type(messages, "Text")
    assert {"literalString": "What does she lean toward?"} in [t["text"] for t in texts]
    assert {"literalString": "Jewelry"} in [t["text"] for t in texts]

    # One Button per option, each carrying the chip-group action.
    buttons = _all_of_type(messages, "Button")
    chip_buttons = [b for b in buttons if b["action"]["name"] == "chip-group"]
    assert len(chip_buttons) == 2

    values = []
    for b in chip_buttons:
        ctx = b["action"]["context"]
        v = next(c["value"]["literalString"] for c in ctx if c["key"] == "value")
        values.append(v)
    assert set(values) == {"jewelry", "home"}


def test_form_emits_inputs_bound_to_data_model_paths():
    messages = a2ui.form(fields=[
        {"type": "toggle", "name": "gift_wrap", "label": "Gift wrap"},
        {"type": "text", "name": "note", "label": "Note", "max_length": 120},
        {"type": "address", "name": "ship_to", "label": "Ship to"},
    ])
    _assert_standard_envelope(messages)

    checkboxes = _all_of_type(messages, "CheckBox")
    assert len(checkboxes) == 1
    assert checkboxes[0]["label"] == {"literalString": "Gift wrap"}
    assert checkboxes[0]["value"] == {"path": "/gift_wrap"}

    textfields = _all_of_type(messages, "TextField")
    assert {tf["text"]["path"] for tf in textfields} == {"/note", "/ship_to"}

    # Submit button references the data-model root so the agent receives
    # the full field bag as a single 'values' context entry.
    submit = next(b for b in _all_of_type(messages, "Button")
                  if b["action"]["name"] == "form")
    [values_ctx] = submit["action"]["context"]
    assert values_ctx == {"key": "values", "value": {"path": "/"}}


def test_confirmation_includes_total_ship_date_and_tx_button():
    messages = a2ui.confirmation(
        order_id="A2UI-7741",
        line_items=[("Bar Pendant", 124), ("Gift wrap", 8)],
        total=132,
        ship_date="Mon, May 11",
        tx_hash="0x" + "a" * 64,
        explorer_url="https://basescan.org/tx/0xaaa",
    )
    _assert_standard_envelope(messages)

    root_type, _ = _root_component(messages)
    assert root_type == "Card"

    texts = [t["text"]["literalString"] for t in _all_of_type(messages, "Text")]
    assert "Order A2UI-7741 confirmed" in texts
    assert "Total: $132.00" in texts
    assert "Ships: Mon, May 11" in texts
    assert "Bar Pendant" in texts
    assert "$8.00" in texts

    tx_btn = next(b for b in _all_of_type(messages, "Button")
                  if b["action"]["name"] == "tx-detail-open")
    ctx_keys = {c["key"] for c in tx_btn["action"]["context"]}
    assert {"order_id", "tx_hash", "ship_date", "total", "explorer_url"} <= ctx_keys


def test_confirmation_without_tx_hash_omits_explorer_button():
    messages = a2ui.confirmation(
        order_id="A2UI-9000", line_items=[], total=0, ship_date="",
    )
    buttons = _all_of_type(messages, "Button")
    assert not any(b["action"]["name"] == "tx-detail-open" for b in buttons)


def test_tx_detail_close_button_present():
    messages = a2ui.tx_detail(
        order_id="A2UI-1",
        tx_hash="0xabc",
        explorer_url=None,
        network="base-sepolia",
        items=[("Item", 10.0)],
        total=10.0,
        ship_date=None,
    )
    _assert_standard_envelope(messages)
    buttons = _all_of_type(messages, "Button")
    assert any(b["action"]["name"] == "tx-detail-close" for b in buttons)


# ── custom-catalog builders ─────────────────────────────────────────────


def test_products_carries_image_and_price():
    messages = a2ui.products(
        reasoning="Three minimalist picks.",
        items=[
            {"id": "x", "name": "Thread Necklace", "price": 89,
             "image_url": "https://example.com/a.jpg", "why": "Warm tone."},
        ],
    )
    _assert_custom_envelope(messages, "CardGrid")
    _, props = _root_component(messages)
    assert props["reasoning"] == {"literalString": "Three minimalist picks."}
    assert props["items"][0]["price"] == 89
    assert props["items"][0]["imageUrl"] == "https://example.com/a.jpg"


def test_product_detail_includes_variant_groups():
    messages = a2ui.product_detail(
        product={"id": "x", "name": "Bar Pendant", "price": 124,
                 "image_url": "https://example.com/x.jpg"},
        variants={"finish": ["gold", "silver"], "length": ["16\"", "18\""]},
    )
    _assert_custom_envelope(messages, "ProductDetail")
    _, props = _root_component(messages)
    assert props["product"]["name"] == "Bar Pendant"
    assert props["product"]["imageUrl"] == "https://example.com/x.jpg"
    assert any(g["name"] == "finish" for g in props["variantGroups"])


# ── envelope sanity ─────────────────────────────────────────────────────


def test_begin_rendering_references_a_known_root():
    """Defensive: every builder must reference an existing component id."""
    for messages in [
        a2ui.chips(question="?", options=[("a", "A")]),
        a2ui.products(reasoning="r", items=[]),
        a2ui.confirmation(order_id="A", line_items=[], total=0, ship_date=""),
        a2ui.form(fields=[{"type": "toggle", "name": "x", "label": "X"}]),
        a2ui.tx_detail(order_id="A", tx_hash=None, explorer_url=None,
                       network=None, items=[], total=None, ship_date=None),
    ]:
        su = _surface_update(messages)
        begin = _begin(messages)
        ids = {c["id"] for c in su["components"]}
        assert begin["root"] in ids
        assert begin["surfaceId"] == su["surfaceId"]


def test_products_fixture_root_shape_matches_builder():
    """The products fixture still represents a single custom-catalog root."""
    messages = a2ui.products(
        reasoning="Three minimalist picks.",
        items=[
            {"id": "x", "name": "Thread Necklace", "price": 89,
             "image_url": "https://example.com/a.jpg", "why": "Warm tone."},
        ],
    )
    type_, _ = _root_component(messages)
    fixture = _load("a2ui_products.json")
    fx_type, _ = next(iter(fixture["root"]["component"].items()))
    assert type_ == fx_type == "CardGrid"
