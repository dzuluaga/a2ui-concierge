from concierge.tools import run_tool

def test_search_catalog_returns_results_list():
    out = run_tool("search_catalog", {"category": "jewelry", "price_max": 150})
    assert "results" in out
    assert len(out["results"]) > 0

def test_get_product_returns_id():
    out = run_tool("get_product", {"product_id": "lum-jewel-001"})
    assert out["id"] == "lum-jewel-001"

def test_place_order_assigns_id_and_date():
    out = run_tool("place_order", {
        "product_id": "lum-jewel-001",
        "variant_options": {"finish": "silver", "length": "16\""},
        "gift_wrap": True,
        "address": "235 Pine St, Brooklyn NY",
    })
    assert out["order_id"].startswith("A2UI-")
    assert "ship_date" in out

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


import pytest
from concierge.agent import GiftAgent


class _StubResponse:
    def __init__(self, content, stop_reason):
        self.content = content
        self.stop_reason = stop_reason


class _StubBlock:
    def __init__(self, **kw):
        self.__dict__.update(kw)
        self.type = kw["type"]


class _StubMessages:
    def __init__(self, scripted):
        self.scripted = list(scripted)
    async def create(self, **kw):
        return self.scripted.pop(0)


class _StubClient:
    def __init__(self, scripted):
        self.messages = _StubMessages(scripted)


@pytest.mark.asyncio
async def test_agent_emits_a2ui_then_end():
    scripted = [
        _StubResponse(
            content=[_StubBlock(type="tool_use", id="t1",
                                name="present_chips",
                                input={"question": "Vibe?",
                                       "options": [{"value": "jewelry", "label": "Jewelry"}]})],
            stop_reason="tool_use",
        ),
        _StubResponse(
            content=[_StubBlock(type="text", text="(awaiting selection)")],
            stop_reason="end_turn",
        ),
    ]
    agent = GiftAgent(client=_StubClient(scripted))
    kinds = [e.kind async for e in agent.turn("Need a gift for my sister")]
    assert "a2ui" in kinds
    assert kinds[-1] == "end"
