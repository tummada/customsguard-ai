"""
Tests for utils/validator.py — data validation rules for pipeline outputs.
"""
import pytest
from utils.validator import (
    validate_hs_code,
    normalize_hs_code,
    validate_rate,
    validate_fta_name,
    validate_country_code,
    validate_doc_type,
    validate_source_url,
)


class TestValidateHsCode:
    def test_valid_4_digit(self):
        ok, msg = validate_hs_code("0306")
        assert ok is True

    def test_valid_6_digit_dotted(self):
        ok, msg = validate_hs_code("0306.17")
        assert ok is True

    def test_valid_8_digit_dotted(self):
        ok, msg = validate_hs_code("0306.17.10")
        assert ok is True

    def test_valid_raw_digits(self):
        """Raw digits like 87034051 should be accepted."""
        ok, msg = validate_hs_code("87034051")
        assert ok is True

    def test_empty_code(self):
        ok, msg = validate_hs_code("")
        assert ok is False
        assert "empty" in msg

    def test_invalid_format(self):
        ok, msg = validate_hs_code("ABC")
        assert ok is False

    def test_spaces_are_stripped(self):
        ok, msg = validate_hs_code("  0306  ")
        assert ok is True


class TestNormalizeHsCode:
    def test_4_digits(self):
        assert normalize_hs_code("0306") == "0306"

    def test_6_digits(self):
        assert normalize_hs_code("030617") == "0306.17"

    def test_8_digits(self):
        assert normalize_hs_code("03061710") == "0306.17.10"

    def test_already_dotted(self):
        assert normalize_hs_code("0306.17.10") == "0306.17.10"


class TestValidateRate:
    def test_valid_zero(self):
        ok, _ = validate_rate(0)
        assert ok is True

    def test_valid_normal(self):
        ok, _ = validate_rate(15.5)
        assert ok is True

    def test_valid_max(self):
        ok, _ = validate_rate(80)
        assert ok is True

    def test_none_is_valid(self):
        ok, _ = validate_rate(None)
        assert ok is True

    def test_negative(self):
        ok, msg = validate_rate(-1)
        assert ok is False

    def test_too_high(self):
        ok, msg = validate_rate(81)
        assert ok is False

    def test_string_number(self):
        ok, _ = validate_rate("5.0")
        assert ok is True

    def test_non_numeric_string(self):
        ok, msg = validate_rate("free")
        assert ok is False


class TestValidateFtaName:
    def test_valid_ftas(self):
        for fta in ["ATIGA", "ACFTA", "RCEP", "MFN", "JTEPA"]:
            ok, _ = validate_fta_name(fta)
            assert ok is True, f"{fta} should be valid"

    def test_case_insensitive(self):
        ok, _ = validate_fta_name("acfta")
        assert ok is True

    def test_empty(self):
        ok, msg = validate_fta_name("")
        assert ok is False

    def test_unknown_fta(self):
        ok, msg = validate_fta_name("NAFTA")
        assert ok is False
        assert "unknown" in msg


class TestValidateCountryCode:
    def test_valid_codes(self):
        for code in ["THA", "CHN", "JPN", "SGP"]:
            ok, _ = validate_country_code(code)
            assert ok is True, f"{code} should be valid"

    def test_unknown_3_letter_still_valid(self):
        """Any 3-letter alpha code is accepted (may be valid ISO code)."""
        ok, _ = validate_country_code("USA")
        assert ok is True

    def test_empty(self):
        ok, msg = validate_country_code("")
        assert ok is False

    def test_invalid_format(self):
        ok, msg = validate_country_code("12")
        assert ok is False

    def test_special_codes(self):
        ok, _ = validate_country_code("ASEAN")
        assert ok is True


class TestValidateDocType:
    def test_valid_types(self):
        for dt in ["ANNOUNCEMENT", "LAW", "REGULATION", "COURT_CASE"]:
            ok, _ = validate_doc_type(dt)
            assert ok is True

    def test_empty(self):
        ok, _ = validate_doc_type("")
        assert ok is False

    def test_unknown(self):
        ok, msg = validate_doc_type("BLOG_POST")
        assert ok is False


class TestValidateSourceUrl:
    def test_valid_https(self):
        ok, _ = validate_source_url("https://customs.go.th/doc/123")
        assert ok is True

    def test_valid_http(self):
        ok, _ = validate_source_url("http://example.com")
        assert ok is True

    def test_empty(self):
        ok, msg = validate_source_url("")
        assert ok is False
        assert "provenance" in msg

    def test_invalid_no_scheme(self):
        ok, msg = validate_source_url("customs.go.th/doc")
        assert ok is False
