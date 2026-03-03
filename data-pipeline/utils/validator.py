"""
Data validation rules for pipeline outputs.
Catches bad data before it hits the database.
"""

import re
from typing import Any


# HS code format: 4 digits, optional dot + more digits up to 12 chars total
HS_CODE_PATTERN = re.compile(r"^\d{4}(\.\d{2}(\.\d{2,4})?)?$")

# ISO 3166-1 alpha-3 country codes for ASEAN + FTA partners
VALID_COUNTRY_CODES = {
    # ASEAN
    "BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM",
    # China
    "CHN",
    # Japan
    "JPN",
    # Korea
    "KOR",
    # Australia + New Zealand
    "AUS", "NZL",
    # India
    "IND",
    # RCEP additional
    "HKG",
    # Catch-all for multi-country FTAs
    "ASEAN", "ALL",
}

VALID_FTA_NAMES = {
    "ATIGA", "ACFTA", "AKFTA", "AJCEP", "JTEPA",
    "TAFTA", "AANZFTA", "AIFTA", "RCEP", "TNZCEP",
    "MFN",  # Most Favoured Nation (default)
}

VALID_DOC_TYPES = {
    "ANNOUNCEMENT", "LAW", "MINISTERIAL", "RULING", "COURT_CASE",
    "REGULATION", "NOTIFICATION",
}


def validate_hs_code(code: str) -> tuple[bool, str]:
    """Validate HS code format."""
    if not code:
        return False, "empty code"
    # Normalize: remove spaces, ensure dots
    code = code.strip()
    if HS_CODE_PATTERN.match(code):
        return True, ""
    # Try normalizing: 87034051 → 8703.40.51
    digits = code.replace(".", "").replace(" ", "")
    if len(digits) >= 4 and digits.isdigit():
        return True, ""
    return False, f"invalid format: {code}"


def normalize_hs_code(code: str) -> str:
    """Normalize HS code to standard format: XXXX.XX.XX or shorter."""
    digits = code.replace(".", "").replace(" ", "").strip()
    if len(digits) <= 4:
        return digits
    if len(digits) <= 6:
        return f"{digits[:4]}.{digits[4:]}"
    return f"{digits[:4]}.{digits[4:6]}.{digits[6:12]}"


def validate_rate(rate: Any) -> tuple[bool, str]:
    """Validate duty rate (0-80%)."""
    if rate is None:
        return True, ""  # rate can be null
    try:
        r = float(rate)
        if 0 <= r <= 80:
            return True, ""
        return False, f"rate out of range: {r}"
    except (ValueError, TypeError):
        return False, f"invalid rate: {rate}"


def validate_fta_name(name: str) -> tuple[bool, str]:
    """Validate FTA agreement name."""
    if not name:
        return False, "empty FTA name"
    name_upper = name.strip().upper()
    if name_upper in VALID_FTA_NAMES:
        return True, ""
    return False, f"unknown FTA: {name}"


def validate_country_code(code: str) -> tuple[bool, str]:
    """Validate ISO 3166-1 alpha-3 country code."""
    if not code:
        return False, "empty country code"
    code_upper = code.strip().upper()
    if code_upper in VALID_COUNTRY_CODES:
        return True, ""
    # Allow any 3-letter code (might be valid ISO code we don't have listed)
    if len(code_upper) == 3 and code_upper.isalpha():
        return True, ""
    return False, f"invalid country code: {code}"


def validate_doc_type(doc_type: str) -> tuple[bool, str]:
    """Validate document type."""
    if not doc_type:
        return False, "empty doc_type"
    if doc_type.strip().upper() in VALID_DOC_TYPES:
        return True, ""
    return False, f"unknown doc_type: {doc_type}"


def validate_source_url(url: str) -> tuple[bool, str]:
    """Validate source URL for provenance."""
    if not url:
        return False, "empty source_url (provenance required)"
    if url.startswith("http://") or url.startswith("https://"):
        return True, ""
    return False, f"invalid URL: {url}"
