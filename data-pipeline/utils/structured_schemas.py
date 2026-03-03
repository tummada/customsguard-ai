"""
JSON Schema definitions for Gemini Structured Outputs.
Forces the model to return data in a strict format — prevents hallucination
of numbers, rates, and HS code formats.
"""

# ── HS Code extraction from PDF ─────────────────────────────────
HS_CODE_SCHEMA = {
    "type": "object",
    "properties": {
        "hs_codes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "HS code (4-12 digits, e.g. 8703.40.51)"},
                    "description_th": {"type": "string"},
                    "description_en": {"type": "string"},
                    "base_rate": {"type": "number", "description": "Duty rate percentage (0-80)"},
                    "unit": {"type": "string"},
                    "category": {"type": "string"},
                },
                "required": ["code"],
            },
        },
    },
    "required": ["hs_codes"],
}

# ── FTA Rate extraction ─────────────────────────────────────────
FTA_RATE_SCHEMA = {
    "type": "object",
    "properties": {
        "fta_rates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "hs_code": {"type": "string"},
                    "fta_name": {"type": "string"},
                    "partner_country": {"type": "string", "description": "ISO 3166-1 alpha-3 country code"},
                    "preferential_rate": {"type": "number", "description": "Preferential duty rate (0-80)"},
                    "form_type": {"type": "string", "description": "Certificate form (e.g. Form D, Form E, Form JTEPA)"},
                    "conditions": {"type": "string"},
                    "effective_from": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                    "effective_to": {"type": "string", "description": "Date in YYYY-MM-DD or null"},
                },
                "required": ["hs_code", "fta_name", "partner_country", "preferential_rate", "effective_from"],
            },
        },
    },
    "required": ["fta_rates"],
}

# ── Ruling / Court Case extraction from PDF ─────────────────────
RULING_SCHEMA = {
    "type": "object",
    "properties": {
        "rulings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "doc_number": {"type": "string", "description": "เลขที่เอกสาร e.g. ประกาศที่ 116/2567"},
                    "title": {"type": "string"},
                    "doc_type": {
                        "type": "string",
                        "enum": ["RULING", "COURT_CASE", "ANNOUNCEMENT", "LAW", "MINISTERIAL"],
                    },
                    "hs_codes": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Related HS codes mentioned",
                    },
                    "base_rate": {"type": "number", "description": "Rate if mentioned (0-80)"},
                    "ruling_summary": {"type": "string", "description": "สรุปเนื้อหาสำคัญ 2-3 ประโยค"},
                    "issued_date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                    "issuer": {"type": "string"},
                },
                "required": ["doc_number", "title"],
            },
        },
    },
    "required": ["rulings"],
}

# ── AI Enrichment: Summary + Q&A ────────────────────────────────
ENRICHMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "summary_th": {"type": "string", "description": "สรุปภาษาไทย 2-3 ประโยค"},
        "summary_en": {"type": "string", "description": "English summary 2-3 sentences"},
        "keywords": {
            "type": "array",
            "items": {"type": "string"},
            "description": "5-10 keywords (both Thai and English)",
        },
        "qa_pairs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "คำถามภาษาพูดที่ผู้ใช้อาจถาม"},
                    "answer": {"type": "string", "description": "คำตอบจากเนื้อหาเอกสาร"},
                    "related_hs_codes": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["question", "answer"],
            },
        },
    },
    "required": ["summary_th", "keywords", "qa_pairs"],
}

# ── Cross-reference: regulation → HS codes ──────────────────────
CROSS_REFERENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "related_hs_codes": {
            "type": "array",
            "items": {"type": "string"},
            "description": "HS codes mentioned or relevant to this regulation",
        },
        "related_fta_names": {
            "type": "array",
            "items": {"type": "string"},
            "description": "FTA agreements mentioned (e.g. ATIGA, RCEP)",
        },
    },
    "required": ["related_hs_codes"],
}
