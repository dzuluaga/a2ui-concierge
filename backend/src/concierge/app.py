from __future__ import annotations
import json
from collections import defaultdict
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

load_dotenv()  # reads backend/.env so ANTHROPIC_API_KEY etc. are set before the SDK reads them

from concierge.agent import GiftAgent  # noqa: E402 — must import after load_dotenv
from concierge import payments  # noqa: E402
from concierge.credential_verifier import verify_vp_token

app = FastAPI(title="A2UI Gift Concierge")

_sessions: dict[str, GiftAgent] = defaultdict(lambda: GiftAgent())


class ChatBody(BaseModel):
    sessionId: str
    userMessage: str


class CredentialBody(BaseModel):
    sessionId: str
    credentialToken: str | None = None   # Raw VP token JSON from Android wallet
    dcqlQueryJson: str | None = None     # The DCQL query that was used
    credentials: dict[str, bool] = {}   # Fallback booleans (used if token absent)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat")
async def chat(body: ChatBody) -> EventSourceResponse:
    agent = _sessions[body.sessionId]

    async def event_stream():
        try:
            async for ev in agent.turn(body.userMessage):
                if ev.kind == "end":
                    yield {"event": "end", "data": "{}"}
                elif ev.kind == "a2ui":
                    yield {"event": "a2ui", "data": json.dumps(ev.payload)}
                elif ev.kind == "credential_request":
                    yield {"event": "credential_request", "data": json.dumps(ev.payload)}
                else:
                    yield {"event": "text", "data": json.dumps({"text": ev.payload})}
        except Exception as e:
            msg = f"⚠️ {type(e).__name__}: {e}"
            yield {"event": "text", "data": json.dumps({"text": msg})}
            yield {"event": "end", "data": "{}"}


    return EventSourceResponse(event_stream())


@app.post("/credential")
async def credential(body: CredentialBody) -> dict[str, bool]:
    agent = _sessions.get(body.sessionId)
    if agent is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if body.credentialToken and body.dcqlQueryJson:
        # Parse the VP token to extract real claims instead of trusting booleans.
        credentials = verify_vp_token(body.credentialToken, body.dcqlQueryJson)
    else:
        credentials = body.credentials

    await agent.submit_credential_response(credentials)
    return {"ok": True}


class SettleBody(BaseModel):
    order_id: str
    envelope: dict[str, Any]


@app.post("/x402/settle")
async def x402_settle(body: SettleBody) -> dict[str, Any]:
    """Receive a signed EIP-3009 envelope from the client, settle on-chain
    (or mock), and return the tx hash + explorer URL. The client then sends
    a follow-up `[ui-action] payment-completed` to /chat so the agent can
    render the confirmation card."""
    try:
        return await payments.settle(order_id=body.order_id, signed_envelope=body.envelope)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"settle failed: {e}")
