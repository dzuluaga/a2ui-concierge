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


class VerifyAgeBody(BaseModel):
    credentialToken: str | None = None
    dcqlQueryJson: str | None = None


@app.post("/verify-age")
async def verify_age(body: VerifyAgeBody) -> dict[str, bool]:
    """Standalone age verification — no agent blocking. The payment-challenge
    component calls this after the Android wallet returns a VP token."""
    if body.credentialToken and body.dcqlQueryJson:
        credentials = verify_vp_token(body.credentialToken, body.dcqlQueryJson)
        verified = credentials.get("age_verification", False)
    else:
        # Web demo fallback: no hardware wallet present — grant for demo purposes.
        verified = True
    return {"verified": verified}


class LoyaltyApplyBody(BaseModel):
    order_id: str


@app.post("/loyalty/apply")
async def loyalty_apply(body: LoyaltyApplyBody) -> dict[str, Any]:
    """Apply a 10% loyalty discount to an existing order. Rebuilds the x402
    challenge at the discounted amount so the client can use the new challenge
    for both x402 signing and DPC settlement."""
    record = payments.get_order(body.order_id)
    if record is None:
        raise HTTPException(status_code=404, detail="unknown order_id")
    if record.get("loyalty_applied"):
        # Already discounted — return the current state unchanged.
        return {
            "new_order_id": body.order_id,
            "new_challenge": record["challenge"],
            "discount_amount": record.get("discount_amount", 0),
            "new_total": record["total"],
        }

    original_total: float = record["total"]
    discount_pct: float = record.get("loyalty_discount_pct", 10)
    discount_amt = round(original_total * discount_pct / 100, 2)
    new_total = round(original_total - discount_amt, 2)

    # Build a fresh x402 challenge at the discounted amount.
    old_challenge = record["challenge"]
    new_challenge = payments.build_challenge(
        total_dollars=new_total,
        label=old_challenge["label"],
    )
    new_order_id = new_challenge["order_id"]

    # Copy all order metadata to the new record and apply the discount.
    new_record = payments.get_order(new_order_id)
    if new_record is not None:
        new_record.update({
            "line_items": record["line_items"] + [("Loyalty discount (10%)", -discount_amt)],
            "total": new_total,
            "ship_date": record.get("ship_date", ""),
            "product_id": record.get("product_id"),
            "loyalty_applied": True,
            "discount_amount": discount_amt,
            "loyalty_discount_pct": discount_pct,
        })

    return {
        "new_order_id": new_order_id,
        "new_challenge": new_challenge,
        "discount_amount": discount_amt,
        "new_total": new_total,
    }


class DpcSettleBody(BaseModel):
    order_id: str


@app.post("/dpc/settle")
async def dpc_settle(body: DpcSettleBody) -> dict[str, Any]:
    """Record a DPC-authorized payment. The client already presented and
    verified the digital payment credential; we just mark the order settled
    and return a synthetic receipt in the same shape as /x402/settle."""
    record = payments.get_order(body.order_id)
    if record is None:
        raise HTTPException(status_code=404, detail="unknown order_id")
    synthetic_hash = f"dpc-{body.order_id[:8]}"
    record["tx_hash"] = synthetic_hash
    record["settled"] = True
    return {
        "order_id": body.order_id,
        "tx_hash": synthetic_hash,
        "explorer_url": None,
    }


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
