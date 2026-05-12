from dcql import CredentialDefinition, CredentialOption, build_checkout_verification_dcql


def _age_def() -> CredentialDefinition:
    return CredentialDefinition(
        key="age_verification",
        label="Age verification",
        dcql_purpose="Age verification for restricted purchase of {amount}",
        dcql_options=[
            CredentialOption(
                id="mdl",
                format="mso_mdoc",
                meta={"doctype_value": "org.iso.18013.5.1.mDL"},
                claims=[{"id": "age_over_21", "path": ["org.iso.18013.5.1", "age_over_21"]}],
                claim_sets=[["age_over_21"]],
            )
        ],
    )


def test_single_credential_builds_correct_structure():
    defs = [_age_def()]
    result = build_checkout_verification_dcql(49.99, ["age_verification"], defs)
    assert len(result["credentials"]) == 1
    assert result["credentials"][0]["id"] == "mdl"
    assert result["credentials"][0]["format"] == "mso_mdoc"
    assert len(result["credential_sets"]) == 1


def test_amount_placeholder_replaced():
    defs = [_age_def()]
    result = build_checkout_verification_dcql(123.45, ["age_verification"], defs)
    assert "123.45" in result["credential_sets"][0]["purpose"]


def test_unknown_credential_key_is_skipped():
    defs = [_age_def()]
    result = build_checkout_verification_dcql(10.00, ["age_verification", "nonexistent"], defs)
    assert len(result["credentials"]) == 1


def test_duplicate_keys_deduplicated():
    defs = [_age_def()]
    result = build_checkout_verification_dcql(10.00, ["age_verification", "age_verification"], defs)
    assert len(result["credentials"]) == 1


def test_credential_set_has_credential_key():
    defs = [_age_def()]
    result = build_checkout_verification_dcql(50.00, ["age_verification"], defs)
    assert result["credential_sets"][0]["credential_key"] == "age_verification"
