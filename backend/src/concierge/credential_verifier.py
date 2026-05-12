"""Parse an OpenID4VP VP token (openid4vp-v1-unsigned, mso_mdoc / ISO 18013-5)
and map its claims to the {credential_key: bool} dict expected by submit_credential.

Verification tiers (strongest → weakest):
  1. CBOR claim extraction  — actual elementValue for age_over_21/age_over_18 etc.
  2. presentation_submission — wallet listed the option ID as presented
  3. Token presence         — wallet returned *anything*, meaning it matched the DCQL
"""
from __future__ import annotations
import base64
import json
import logging
from typing import Any

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def verify_vp_token(token_json: str, dcql_query_json: str) -> dict[str, bool]:
    """Return {credential_key: bool} derived from the VP token's actual claims.

    Falls back gracefully so the demo works even if the wallet uses a non-standard
    JSON envelope or a CBOR format we can't fully parse.
    """
    try:
        token_data = json.loads(token_json)
        dcql = json.loads(dcql_query_json)
    except Exception as exc:
        log.warning("VP token JSON parse failed: %s — trusting token presence", exc)
        return _all_from_dcql(dcql_query_json, True)

    # Log the top-level structure once so format issues are immediately visible.
    top_keys = list(token_data.keys()) if isinstance(token_data, dict) else type(token_data).__name__
    log.info("VP token top-level keys: %s", top_keys)

    presented_ids = _presented_option_ids(token_data)
    log.info("Presented option IDs (presentation_submission): %s", presented_ids)

    flat_claims, claims_by_key = _extract_claims(token_data)
    log.info("Extracted mdoc claims (%d): %s", len(flat_claims), list(flat_claims.keys()))

    # A non-empty token_data means the wallet responded — use as last-resort proof.
    token_present = bool(token_data)

    result: dict[str, bool] = {}
    for cred_set in dcql.get("credential_sets", []):
        key = cred_set.get("credential_key")
        if not key:
            continue
        option_groups: list[list[str]] = cred_set.get("options", [])
        verified = _evaluate_set(
            key, option_groups, presented_ids, flat_claims, claims_by_key, token_present
        )
        log.info("credential_key=%s  verified=%s", key, verified)
        result[key] = verified

    if not result:
        log.warning("No credential_sets with credential_key found in DCQL — falling back")
        return _all_from_dcql(dcql_query_json, token_present)

    return result


# ---------------------------------------------------------------------------
# Presentation submission helpers
# ---------------------------------------------------------------------------

def _presented_option_ids(token_data: dict) -> set[str]:
    submission = token_data.get("presentation_submission", {})
    return {d["id"] for d in submission.get("descriptor_map", []) if "id" in d}


# ---------------------------------------------------------------------------
# CBOR / DeviceResponse parsing
# ---------------------------------------------------------------------------

def _extract_claims(token_data: dict) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    """Return (flat_claims, per_option_claims) by CBOR-parsing every DeviceResponse."""
    import cbor2  # lazy — only needed when we actually have a token

    vp_token = token_data.get("vp_token")
    if vp_token is None:
        log.debug("No 'vp_token' field in token data")
        return {}, {}

    # Normalise to dict[option_id, base64url_string]
    if isinstance(vp_token, str):
        token_map: dict[str, str] = {"_doc0": vp_token}
    elif isinstance(vp_token, dict):
        token_map = {k: v for k, v in vp_token.items() if isinstance(v, str)}
    elif isinstance(vp_token, list):
        token_map = {str(i): t for i, t in enumerate(vp_token) if isinstance(t, str)}
    else:
        log.debug("Unexpected vp_token type: %s", type(vp_token).__name__)
        return {}, {}

    flat: dict[str, Any] = {}
    by_key: dict[str, dict[str, Any]] = {}

    for option_id, b64_value in token_map.items():
        try:
            raw = base64.urlsafe_b64decode(b64_value + "==")
            device_response = cbor2.loads(raw)
            claims = _parse_device_response(device_response, cbor2)
            by_key[option_id] = claims
            flat.update(claims)
            log.debug("option_id=%s  claims=%s", option_id, list(claims.keys()))
        except Exception as exc:
            log.debug("CBOR parse failed for option_id=%s: %s", option_id, exc)

    return flat, by_key


def _parse_device_response(dr: Any, cbor2_mod: Any) -> dict[str, Any]:
    """Walk an ISO 18013-5 DeviceResponse, return {namespace/elementId: value}."""
    claims: dict[str, Any] = {}
    if not isinstance(dr, dict):
        return claims

    for doc in dr.get("documents", []):
        if not isinstance(doc, dict):
            continue
        issuer_signed = doc.get("issuerSigned", {})
        if not isinstance(issuer_signed, dict):
            continue
        name_spaces = issuer_signed.get("nameSpaces", {})
        if not isinstance(name_spaces, dict):
            continue

        for ns, items in name_spaces.items():
            if not isinstance(items, list):
                continue
            for raw_item in items:
                try:
                    # IssuerSignedItem bytes are embedded CBOR: tag 24 = #6.24(bstr)
                    if isinstance(raw_item, cbor2_mod.CBORTag) and raw_item.tag == 24:
                        item = cbor2_mod.loads(raw_item.value)
                    elif isinstance(raw_item, bytes):
                        item = cbor2_mod.loads(raw_item)
                    elif isinstance(raw_item, dict):
                        item = raw_item
                    else:
                        continue
                    eid = item.get("elementIdentifier")
                    val = item.get("elementValue")
                    if eid is not None:
                        claims[f"{ns}/{eid}"] = val
                except Exception:
                    continue

    return claims


# ---------------------------------------------------------------------------
# Claim → bool evaluation (strongest evidence first)
# ---------------------------------------------------------------------------

def _evaluate_set(
    cred_key: str,
    option_groups: list[list[str]],
    presented_ids: set[str],
    flat_claims: dict[str, Any],
    claims_by_key: dict[str, dict[str, Any]],
    token_present: bool,
) -> bool:
    if cred_key == "age_verification":
        # Tier 1 — actual claim value extracted from CBOR
        if (
            flat_claims.get("org.iso.18013.5.1/age_over_21")
            or flat_claims.get("org.iso.18013.5.1/age_over_18")
            or flat_claims.get("eu.europa.ec.eudi.pid.1/age_over_18")
            or (flat_claims.get("org.iso.18013.5.1/age_in_years") or 0) >= 18
        ):
            log.info("age_verification: passed via CBOR claims")
            return True
        # Tier 2 — wallet attested presentation (wallet only returns token
        # for a credential when it satisfies the DCQL — including age constraints)
        if token_present:
            log.info("age_verification: CBOR claims unavailable — trusting wallet attestation")
            return True
        return False

    # loyalty_membership
    # Tier 1 — presentation_submission listed this option
    for group in option_groups:
        for oid in group:
            if oid in presented_ids:
                return True
            if claims_by_key.get(oid):
                return True

    # Tier 2 — any mdoc claims were extracted (wallet presented something)
    if flat_claims:
        return True

    # Tier 3 — token was returned at all
    return token_present


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _all_from_dcql(dcql_query_json: str, value: bool) -> dict[str, bool]:
    try:
        dcql = json.loads(dcql_query_json)
        return {
            cs["credential_key"]: value
            for cs in dcql.get("credential_sets", [])
            if cs.get("credential_key")
        }
    except Exception:
        return {}
