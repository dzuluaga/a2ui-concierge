from __future__ import annotations
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from dcql import CredentialDefinition, CredentialOption

_CATALOG_PATH = Path(__file__).parent.parent / "backend" / "src" / "concierge" / "catalog.json"


@lru_cache(maxsize=1)
def _load_catalog() -> list[dict[str, Any]]:
    return json.loads(_CATALOG_PATH.read_text())


def get_product(product_id: str) -> dict[str, Any] | None:
    return next((p for p in _load_catalog() if p["id"] == product_id), None)


CREDENTIAL_DEFINITIONS: list[CredentialDefinition] = [
    CredentialDefinition(
        key="age_verification",
        label="Age verification (required for restricted products)",
        dcql_purpose="Age verification for restricted purchase",
        dcql_options=[
            CredentialOption(
                id="mdl",
                format="mso_mdoc",
                meta={"doctype_value": "org.iso.18013.5.1.mDL"},
                claims=[
                    {"id": "given_name",  "path": ["org.iso.18013.5.1", "given_name"]},
                    {"id": "family_name", "path": ["org.iso.18013.5.1", "family_name"]},
                    {"id": "age_over_21", "path": ["org.iso.18013.5.1", "age_over_21"]},
                    {"id": "age_over_18", "path": ["org.iso.18013.5.1", "age_over_18"]},
                ],
                claim_sets=[["age_over_21"], ["age_over_18"]],
            ),
            CredentialOption(
                id="eupid",
                format="mso_mdoc",
                meta={"doctype_value": "eu.europa.ec.eudi.pid.1"},
                claims=[
                    {"id": "given_name",  "path": ["eu.europa.ec.eudi.pid.1", "given_name"]},
                    {"id": "family_name", "path": ["eu.europa.ec.eudi.pid.1", "family_name"]},
                    {"id": "age_over_18", "path": ["eu.europa.ec.eudi.pid.1", "age_over_18"]},
                ],
                claim_sets=[["age_over_18"]],
            ),
        ],
    ),
    CredentialDefinition(
        key="loyalty_membership",
        label="Lumen loyalty membership (optional — 10% discount)",
        discount_percentage=10,
        dcql_purpose="Lumen Goods loyalty membership — 10% wholesale discount",
        dcql_options=[
            CredentialOption(
                id="loyalty",
                format="mso_mdoc",
                meta={"doctype_value": "org.multipaz.loyalty.1"},
                claims=[
                    {"id": "membership_number", "path": ["org.multipaz.loyalty.1", "membership_number"]},
                    {"id": "tier",              "path": ["org.multipaz.loyalty.1", "tier"]},
                ],
                claim_sets=[["membership_number"], ["tier"]],
            ),
        ],
    ),
    CredentialDefinition(
        key="dpc_payment",
        label="Digital payment credential",
        dcql_purpose="Payment authorization for {amount} USDC",
        dcql_options=[
            CredentialOption(
                id="payment_multipaz",
                format="mso_mdoc",
                meta={"doctype_value": "org.multipaz.payment.sca.1"},
                claims=[
                    {"id": "issuer_name",              "path": ["org.multipaz.payment.sca.1", "issuer_name"]},
                    {"id": "holder_name",              "path": ["org.multipaz.payment.sca.1", "holder_name"]},
                    {"id": "masked_account_reference", "path": ["org.multipaz.payment.sca.1", "masked_account_reference"]},
                    {"id": "account_number",           "path": ["org.multipaz.payment.sca.1", "account_number"]},
                    {"id": "expiry_date",              "path": ["org.multipaz.payment.sca.1", "expiry_date"]},
                ],
                claim_sets=[["issuer_name"], ["holder_name"], ["masked_account_reference"], ["account_number"]],
            ),
            CredentialOption(
                id="payment_emvco",
                format="mso_mdoc",
                meta={"doctype_value": "com.emvco.payment_card.1"},
                claims=[
                    {"id": "cardholder_name", "path": ["com.emvco.payment_card.1", "cardholder_name"]},
                    {"id": "account_number",  "path": ["com.emvco.payment_card.1", "account_number"]},
                    {"id": "expiry_date",     "path": ["com.emvco.payment_card.1", "expiry_date"]},
                    {"id": "card_network",    "path": ["com.emvco.payment_card.1", "card_network"]},
                    {"id": "issuer_name",     "path": ["com.emvco.payment_card.1", "issuer_name"]},
                ],
                claim_sets=[["cardholder_name"], ["account_number"], ["expiry_date"]],
            ),
        ],
    ),
]
