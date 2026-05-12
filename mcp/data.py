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
                    {"id": "given_name", "path": ["org.iso.18013.5.1", "given_name"]},
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
                    {"id": "given_name", "path": ["eu.europa.ec.eudi.pid.1", "given_name"]},
                    {"id": "family_name", "path": ["eu.europa.ec.eudi.pid.1", "family_name"]},
                    {"id": "age_over_18", "path": ["eu.europa.ec.eudi.pid.1", "age_over_18"]},
                ],
                claim_sets=[["age_over_18"]],
            ),
        ],
    ),
]
