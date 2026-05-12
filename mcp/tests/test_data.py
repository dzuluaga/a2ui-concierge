from data import CREDENTIAL_DEFINITIONS, get_product


def test_one_credential_definition_defined():
    keys = {d.key for d in CREDENTIAL_DEFINITIONS}
    assert keys == {"age_verification"}


def test_age_verification_has_no_discount():
    age = next(d for d in CREDENTIAL_DEFINITIONS if d.key == "age_verification")
    assert age.discount_percentage is None


def test_get_product_returns_existing_product():
    p = get_product("lum-jewel-001")
    assert p is not None
    assert p["name"] == "Bar Pendant Necklace"


def test_get_product_returns_none_for_unknown():
    assert get_product("nonexistent-id") is None


def test_age_gated_products_have_age_verification():
    for pid in ("lum-bev-001", "lum-bev-002", "lum-bev-003"):
        p = get_product(pid)
        assert p is not None, f"{pid} missing from catalog"
        assert "age_verification" in p["required_credentials"], f"{pid} missing age_verification"


def test_age_gated_products_have_no_optional_credentials():
    for pid in ("lum-bev-001", "lum-bev-002", "lum-bev-003"):
        p = get_product(pid)
        assert p is not None
        assert p.get("optional_credentials", []) == []


def test_non_age_gated_products_have_no_credentials():
    for pid in ("lum-jewel-001", "lum-home-001", "lum-stat-001", "lum-skin-001"):
        p = get_product(pid)
        assert p is not None
        assert p.get("required_credentials", []) == []
        assert p.get("optional_credentials", []) == []
