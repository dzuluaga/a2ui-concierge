from __future__ import annotations
from dataclasses import dataclass
from typing import Any


@dataclass
class CredentialOption:
    id: str
    format: str
    meta: dict[str, str]
    claims: list[dict[str, Any]]
    claim_sets: list[list[str]]


@dataclass
class CredentialDefinition:
    key: str
    label: str
    dcql_purpose: str
    dcql_options: list[CredentialOption]
    discount_percentage: float | None = None


def build_checkout_verification_dcql(
    amount: float,
    requested_credentials: list[str],
    credential_definitions: list[CredentialDefinition],
) -> dict[str, Any]:
    unique = list(dict.fromkeys(requested_credentials))

    credentials: list[dict[str, Any]] = []
    credential_sets: list[dict[str, Any]] = []

    for key in unique:
        defn = next((d for d in credential_definitions if d.key == key), None)
        if defn is None:
            continue
        purpose = defn.dcql_purpose.replace("{amount}", f"{amount:.2f}")
        option_ids: list[str] = []
        for opt in defn.dcql_options:
            credentials.append({
                "id": opt.id,
                "format": opt.format,
                "meta": opt.meta,
                "claims": opt.claims,
                "claim_sets": opt.claim_sets,
            })
            option_ids.append(opt.id)
        credential_sets.append({
            "purpose": purpose,
            "options": [[oid] for oid in option_ids],
            # Non-standard field used by our backend verifier to map the
            # satisfied credential set back to the submit_credential key.
            "credential_key": key,
        })

    return {"credentials": credentials, "credential_sets": credential_sets}
