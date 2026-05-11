"""x402 payment challenge construction + settlement.

The agent's `place_order` tool produces an x402 challenge that the Android
client signs with its StrongBox-backed wallet. The signed envelope comes
back to /x402/settle, which forwards it to a facilitator and returns the
on-chain tx hash. For the demo, settlement is mocked out by default —
flip ``X402_SETTLE_REAL=1`` to forward to a real facilitator.
"""

from __future__ import annotations

import os
import secrets
import time
import uuid
from typing import Any

# Base Sepolia (testnet) USDC + chain config. Pulled from env so the demo can
# point at a different network without touching code.
NETWORK = os.getenv("X402_NETWORK", "base-sepolia")
CHAIN_ID = int(os.getenv("X402_CHAIN_ID", "84532"))
USDC_ADDRESS = os.getenv(
    "X402_USDC_ADDRESS",
    # Base Sepolia USDC.
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
)
PAY_TO_ADDRESS = os.getenv(
    "X402_PAY_TO_ADDRESS",
    # Demo recipient — override in backend/.env for a real run.
    "0x0000000000000000000000000000000000000000",
)
# x402 protocol version the public facilitator speaks. Sent on /verify and
# /settle bodies.
X402_VERSION = 1
# Base URL for the facilitator. /verify and /settle are appended. Default
# is the free hosted facilitator at x402.org which proxies to Coinbase CDP.
FACILITATOR_BASE = os.getenv(
    "X402_FACILITATOR_BASE",
    # Note: the apex (x402.org) 308-redirects to www. Pre-resolve here so a
    # POST doesn't lose its body across the hop.
    "https://www.x402.org/facilitator",
).rstrip("/")
SETTLE_REAL = os.getenv("X402_SETTLE_REAL", "0") == "1"
# A stable identifier the facilitator echoes back in receipts. Doesn't have
# to be reachable — it's just a payment-context tag.
RESOURCE_URL = os.getenv("X402_RESOURCE_URL", "https://lumen-concierge.demo/order")
# USDC EIP-712 domain bits on Base Sepolia. The Android signer uses these
# to hash TransferWithAuthorization; the facilitator uses them to recover
# the signer address.
USDC_NAME = os.getenv("X402_USDC_NAME", "USDC")
USDC_VERSION = os.getenv("X402_USDC_VERSION", "2")

# Demo cap: when set, every order's settled total is clamped to this dollar
# amount, regardless of catalog price. Testnet faucets typically drip 5-10
# USDC; setting `X402_DEMO_MAX_PRICE=2` means any cart settles inside a
# single faucet drip without flooding the catalog with $1 SKUs.
# Off by default — production demos and the mock-settle path keep real prices.
_demo_cap_raw = os.getenv("X402_DEMO_MAX_PRICE")
DEMO_MAX_PRICE: float | None = float(_demo_cap_raw) if _demo_cap_raw else None

# USDC has 6 decimals. ``amount_units`` in the challenge is base units, so
# $1.00 == 1_000_000.
USDC_DECIMALS = 6
# Hold the challenge open for 5 minutes after issue.
CHALLENGE_VALIDITY_SECONDS = 5 * 60

# In-memory order store — keyed by order_id. Keeps challenge ↔ tx_hash so the
# settle endpoint can validate and the agent's later present_confirmation call
# can include the tx hash.
_ORDERS: dict[str, dict[str, Any]] = {}


def _to_base_units(amount_dollars: float) -> int:
    return int(round(amount_dollars * (10 ** USDC_DECIMALS)))


def _basescan_url(tx_hash: str) -> str:
    base = "https://sepolia.basescan.org" if NETWORK == "base-sepolia" else "https://basescan.org"
    return f"{base}/tx/{tx_hash}"


def build_challenge(*, total_dollars: float, label: str) -> dict[str, Any]:
    """Return an x402 challenge ready to embed in an A2UI fragment.

    ``label`` is the human-readable line shown in the payment sheet
    (e.g. "Lumen — Gift order #A2UI-AB12").
    """
    order_id = f"A2UI-{str(uuid.uuid4())[:4].upper()}"
    nonce = "0x" + secrets.token_hex(32)
    now = int(time.time())
    challenge = {
        "scheme": "exact",
        "network": NETWORK,
        "chain_id": CHAIN_ID,
        "asset": USDC_ADDRESS,
        "asset_decimals": USDC_DECIMALS,
        "pay_to": PAY_TO_ADDRESS,
        "amount_units": _to_base_units(total_dollars),
        "amount_display": f"{total_dollars:.2f} USDC",
        "valid_after": now,
        "valid_before": now + CHALLENGE_VALIDITY_SECONDS,
        "nonce": nonce,
        "label": label,
        "order_id": order_id,
        # EIP-712 domain bits the client needs to hash
        # TransferWithAuthorization correctly.
        "extra": {"name": USDC_NAME, "version": USDC_VERSION},
    }
    _ORDERS[order_id] = {"challenge": challenge, "settled": False, "tx_hash": None}
    print(f"[x402] built challenge order_id={order_id} total=${total_dollars:.2f} | _ORDERS keys={list(_ORDERS.keys())}", flush=True)
    return challenge


async def settle(*, order_id: str, signed_envelope: dict[str, Any]) -> dict[str, Any]:
    """Submit the signed envelope to the facilitator (or mock-settle).

    Returns ``{"tx_hash": str, "explorer_url": str}`` on success.
    Raises ``ValueError`` if the order is unknown or already settled.
    """
    print(f"[x402] settle request order_id={order_id!r} | _ORDERS keys={list(_ORDERS.keys())}", flush=True)
    # Surface the signer fields (payer address, signature) so we can confirm
    # the StrongBox signing produced a real envelope and grab the payer
    # address to fund on Base Sepolia.
    print(f"[x402] envelope from={signed_envelope.get('from')!r} to={signed_envelope.get('to')!r} value={signed_envelope.get('value')!r} sig={(signed_envelope.get('signature') or '')[:20]}...", flush=True)
    record = _ORDERS.get(order_id)
    if record is None:
        raise ValueError(f"Unknown order_id: {order_id}")
    if record["settled"]:
        return {"tx_hash": record["tx_hash"], "explorer_url": _basescan_url(record["tx_hash"])}

    if SETTLE_REAL:
        tx_hash = await _settle_with_facilitator(record["challenge"], signed_envelope)
    else:
        # Mock settlement for the demo path. Yields a realistic-looking 32-byte
        # tx hash so UI flows can render the confirmation card with a link.
        tx_hash = "0x" + secrets.token_hex(32)

    record["settled"] = True
    record["tx_hash"] = tx_hash
    return {"tx_hash": tx_hash, "explorer_url": _basescan_url(tx_hash)}


def _payment_requirements(challenge: dict[str, Any]) -> dict[str, Any]:
    """Translate our internal challenge shape into the x402 facilitator's
    `paymentRequirements` object. The facilitator uses this to (a) recover
    the EIP-712 domain for signature verification and (b) cross-check the
    signed authorization (payTo, value, validity window) before settling.
    All numeric fields are strings — that's what the spec demands.
    """
    return {
        "scheme": "exact",
        "network": challenge["network"],
        "maxAmountRequired": str(challenge["amount_units"]),
        "resource": RESOURCE_URL,
        "description": challenge["label"],
        "mimeType": "",
        "payTo": challenge["pay_to"],
        "maxTimeoutSeconds": CHALLENGE_VALIDITY_SECONDS,
        "asset": challenge["asset"],
        "extra": challenge["extra"],
    }


def _payment_payload(challenge: dict[str, Any], signed: dict[str, Any]) -> dict[str, Any]:
    """Translate a client-signed envelope into the x402 facilitator's
    `paymentPayload` object. The client is expected to send canonical
    camelCase EIP-3009 fields plus a `signature` hex string."""
    return {
        "x402Version": X402_VERSION,
        "scheme": "exact",
        "network": challenge["network"],
        "payload": {
            "signature": signed["signature"],
            "authorization": {
                "from": signed["from"],
                "to": signed["to"],
                "value": str(signed["value"]),
                "validAfter": str(signed["validAfter"]),
                "validBefore": str(signed["validBefore"]),
                "nonce": signed["nonce"],
            },
        },
    }


async def _settle_with_facilitator(challenge: dict[str, Any], signed: dict[str, Any]) -> str:
    """Forward the signed EIP-3009 envelope to an x402 facilitator, return
    the on-chain tx hash. Calls /verify first so we surface a precise error
    (signature bad vs settlement bad) instead of guessing at facilitator
    return codes. Imported lazily so the mock path doesn't require httpx."""
    import httpx
    body = {
        "x402Version": X402_VERSION,
        "paymentPayload": _payment_payload(challenge, signed),
        "paymentRequirements": _payment_requirements(challenge),
    }
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        verify_resp = await client.post(f"{FACILITATOR_BASE}/verify", json=body)
        if verify_resp.status_code >= 400:
            raise RuntimeError(
                f"verify failed: {verify_resp.status_code} {verify_resp.text}"
            )
        verify = verify_resp.json()
        if not verify.get("isValid"):
            raise RuntimeError(
                f"facilitator rejected signature: {verify.get('invalidReason')}"
            )

        settle_resp = await client.post(f"{FACILITATOR_BASE}/settle", json=body)
        if settle_resp.status_code >= 400:
            raise RuntimeError(
                f"settle failed: {settle_resp.status_code} {settle_resp.text}"
            )
        data = settle_resp.json()
    if not data.get("success"):
        raise RuntimeError(f"settle did not succeed: {data.get('errorReason') or data}")
    tx = data.get("transaction") or data.get("tx_hash") or data.get("transaction_hash")
    if not tx:
        raise RuntimeError(f"facilitator did not return transaction: {data}")
    return tx


def get_order(order_id: str) -> dict[str, Any] | None:
    return _ORDERS.get(order_id)
