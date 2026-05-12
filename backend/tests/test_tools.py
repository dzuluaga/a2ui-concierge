from concierge.tools import run_tool

def test_search_catalog_returns_results_list():
    out = run_tool("search_catalog", {"category": "jewelry", "price_max": 150})
    assert "results" in out
    assert len(out["results"]) > 0

def test_get_product_returns_id():
    out = run_tool("get_product", {"product_id": "lum-jewel-001"})
    assert out["id"] == "lum-jewel-001"

def test_place_order_returns_payment_challenge():
    out = run_tool("place_order", {
        "product_id": "lum-jewel-001",
        "variant_options": {"finish": "silver", "length": "16\""},
        "gift_wrap": True,
        "address": "235 Pine St, Brooklyn NY",
    })
    payload = out["_a2ui"]
    assert payload["component"] == "payment-challenge"
    assert payload["order_id"].startswith("A2UI-")
    challenge = payload["challenge"]
    assert challenge["amount_units"] > 0
    assert challenge["asset"].startswith("0x") and len(challenge["asset"]) == 42
    assert challenge["nonce"].startswith("0x") and len(challenge["nonce"]) == 66
    assert challenge["valid_before"] > challenge["valid_after"]
    # Total = sale_price (or price) + $8 gift wrap; reflected in line items.
    labels = [li["label"] for li in payload["items"]]
    assert "Gift wrap" in labels

def test_present_chips_returns_a2ui_payload():
    out = run_tool("present_chips", {
        "question": "What vibe?",
        "options": [{"value": "jewelry", "label": "Jewelry"}],
    })
    assert "_a2ui" in out
    assert out["_a2ui"]["component"] == "chip-group"

def test_present_form_default_includes_three_fields():
    out = run_tool("present_form", {})
    fields = out["_a2ui"]["fields"]
    names = [f["name"] for f in fields]
    assert names == ["gift_wrap", "note", "ship_to"]


def test_x402_settle_returns_tx_hash():
    """Mock settle path: place an order, then settle returns a tx hash and
    flips the order record to settled. Idempotent on repeat call."""
    import asyncio
    from concierge import payments

    out = run_tool("place_order", {
        "product_id": "lum-jewel-001",
        "variant_options": {"finish": "silver"},
        "gift_wrap": False,
        "address": "1 Main St",
    })
    order_id = out["_a2ui"]["order_id"]

    settled = asyncio.run(payments.settle(order_id=order_id, signed_envelope={"x": "stub"}))
    assert settled["tx_hash"].startswith("0x") and len(settled["tx_hash"]) == 66
    assert "basescan" in settled["explorer_url"]

    # Idempotent: same tx_hash on a second call.
    again = asyncio.run(payments.settle(order_id=order_id, signed_envelope={"x": "stub"}))
    assert again["tx_hash"] == settled["tx_hash"]


def test_x402_settle_unknown_order_raises():
    import asyncio
    import pytest as _pt
    from concierge import payments
    with _pt.raises(ValueError):
        asyncio.run(payments.settle(order_id="A2UI-DOES-NOT-EXIST", signed_envelope={}))



import json
import pytest
from unittest.mock import patch
from concierge.agent import GiftAgent


# LiteLLM-shaped fakes: choices[0].message.{content, tool_calls},
# choices[0].finish_reason.

class _F:  # generic attribute bag
    def __init__(self, **kw):
        self.__dict__.update(kw)


def _resp(text=None, tool_calls=None, finish_reason="stop"):
    msg = _F(content=text, tool_calls=tool_calls or None)
    return _F(choices=[_F(message=msg, finish_reason=finish_reason)])


def _tool_call(id_, name, args):
    return _F(id=id_, function=_F(name=name, arguments=json.dumps(args)))
class _StubBeta:
    def __init__(self, scripted):
        self.messages = _StubMessages(scripted)


class _StubClient:
    def __init__(self, scripted):
        self.beta = _StubBeta(scripted)


@pytest.mark.asyncio
async def test_agent_emits_a2ui_then_end():
    scripted = [
        _resp(
            tool_calls=[_tool_call("t1", "present_chips", {
                "question": "Vibe?",
                "options": [{"value": "jewelry", "label": "Jewelry"}],
            })],
            finish_reason="tool_calls",
        ),
        _resp(text="(awaiting selection)", finish_reason="stop"),
    ]
    queue = list(scripted)

    async def fake_acompletion(**_kw):
        return queue.pop(0)

    with patch("concierge.agent.acompletion", fake_acompletion):
        agent = GiftAgent()
        kinds = [e.kind async for e in agent.turn("Need a gift for my sister")]
    assert "a2ui" in kinds
    assert kinds[-1] == "end"
