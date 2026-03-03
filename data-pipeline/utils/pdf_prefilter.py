"""
PDF pre-filter — uses pdfplumber to analyze pages before sending to
Gemini Vision. Saves ~30% tokens by skipping cover pages, TOC, signature
pages, and blank pages.

IMPORTANT: Scanned PDFs (text empty but has images) MUST be sent to
Vision — do NOT skip them! (Thai government docs are often print→scan→PDF)
"""

import io
import pdfplumber
from PIL import Image


# Keywords indicating a page likely contains useful customs data
CUSTOMS_KEYWORDS = [
    "พิกัด", "วินิจฉัย", "อัตราอากร", "ศุลกากร", "นำเข้า", "ส่งออก",
    "ประเภท", "ภาค", "ตอน", "หมวด", "รายการ", "อากร",
    "HS", "tariff", "rate", "customs", "import", "export",
    "classification", "ruling", "heading", "subheading",
]

# Keywords indicating a page should be skipped
SKIP_KEYWORDS = [
    "สารบัญ", "table of contents",
    "ลงนาม", "ลงชื่อ", "ผู้ลงนาม",
]


def has_keywords(text: str, keywords: list[str] | None = None) -> bool:
    """Check if text contains any of the given keywords."""
    if keywords is None:
        keywords = CUSTOMS_KEYWORDS
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


def is_skip_page(text: str) -> bool:
    """Check if this looks like a TOC / signature / cover page."""
    if not text.strip():
        return False  # Empty text might be scanned — don't skip yet
    return has_keywords(text, SKIP_KEYWORDS) and len(text.strip()) < 200


def has_table(page) -> bool:
    """Check if a pdfplumber page contains table structures."""
    try:
        tables = page.find_tables()
        return len(tables) > 0
    except Exception:
        return False


def is_scanned(page) -> bool:
    """
    Detect scanned PDF pages: text is empty but page has images.
    These MUST be sent to Gemini Vision — do NOT skip!
    """
    text = page.extract_text() or ""
    if text.strip():
        return False  # Has text — not scanned
    # Check for images on the page
    return len(page.images) > 0


def page_to_image(page, dpi: int = 200) -> bytes:
    """Convert a pdfplumber page to PNG bytes for Vision AI."""
    img = page.to_image(resolution=dpi)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def classify_page(page, page_num: int) -> dict:
    """
    Classify a PDF page for processing decision.

    Returns:
        {
            "page_num": int,
            "action": "process_text" | "process_vision" | "skip",
            "reason": str,
            "text": str | None,
            "has_table": bool,
        }
    """
    text = page.extract_text() or ""
    page_has_table = has_table(page)

    # Case 1: Scanned PDF — must use Vision
    if is_scanned(page):
        return {
            "page_num": page_num,
            "action": "process_vision",
            "reason": "scanned_pdf (text empty, has images)",
            "text": None,
            "has_table": False,
        }

    # Case 2: Empty page with no images — skip
    if not text.strip() and len(page.images) == 0:
        return {
            "page_num": page_num,
            "action": "skip",
            "reason": "blank_page",
            "text": None,
            "has_table": False,
        }

    # Case 3: TOC / signature page — skip
    if is_skip_page(text):
        return {
            "page_num": page_num,
            "action": "skip",
            "reason": "toc_or_signature_page",
            "text": text,
            "has_table": False,
        }

    # Case 4: Has table → prefer Vision for better extraction
    if page_has_table:
        return {
            "page_num": page_num,
            "action": "process_vision",
            "reason": "has_table",
            "text": text,
            "has_table": True,
        }

    # Case 5: Has relevant keywords → process text
    if has_keywords(text):
        return {
            "page_num": page_num,
            "action": "process_text",
            "reason": "has_customs_keywords",
            "text": text,
            "has_table": False,
        }

    # Case 6: Text exists but no relevant content — skip
    if len(text.strip()) < 50:
        return {
            "page_num": page_num,
            "action": "skip",
            "reason": "too_short",
            "text": text,
            "has_table": False,
        }

    # Default: process as text
    return {
        "page_num": page_num,
        "action": "process_text",
        "reason": "default",
        "text": text,
        "has_table": False,
    }


def prefilter_pdf(pdf_path: str) -> list[dict]:
    """
    Analyze all pages of a PDF and classify each for processing.

    Returns list of page classifications sorted by page number.
    """
    results = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            classification = classify_page(page, i + 1)
            results.append(classification)
    return results
