import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from concierge.app import app

def test_health():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


import json
from concierge.agent import AgentEvent, GiftAgent


class _FakeAgent:
    def __init__(self, *_, **__):
        self.history = []
    async def turn(self, _msg):
        yield AgentEvent("text", "Three picks coming up.")
        # v0.8 wire: surface plus begin pair carrying a single ChipGroup
        # root in the custom Lumen catalog.
        yield AgentEvent("a2ui", {"surfaceUpdate": {
            "surfaceId": "s-fake",
            "components": [{
                "id": "c-1",
                "component": {"ChipGroup": {
                    "options": [],
                    "selections": {"literalArray": []},
                    "maxAllowedSelections": 1,
                    "variant": "chips",
                }},
            }],
        }})
        yield AgentEvent("a2ui", {"beginRendering": {
            "surfaceId": "s-fake", "root": "c-1",
            "catalogId": "lumen.com:concierge/v1",
        }})
        yield AgentEvent("end", None)


def test_chat_streams_sse_events():
    with patch("concierge.app.GiftAgent", _FakeAgent):
        client = TestClient(app)
        with client.stream("POST", "/chat",
                           json={"sessionId": "s1", "userMessage": "hi"}) as r:
            assert r.status_code == 200
            body = "".join(chunk for chunk in r.iter_text())
        assert "event: text" in body
        assert "event: a2ui" in body
        assert "event: end" in body


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
