"""
Vertex AI SDK wrapper — all Gemini calls go through here so billing
hits GCP credit (NOT Google AI Studio).

Exception: text-embedding-004 uses Google AI free tier via direct HTTP.
"""

import json
import time
import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import vertexai
from vertexai.generative_models import GenerativeModel, Part, GenerationConfig

from config import (
    GCP_PROJECT_ID, GCP_REGION,
    VERTEX_VISION_MODEL, VERTEX_FLASH_MODEL,
    GEMINI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMS, EMBEDDING_URL,
)
from utils.rate_limiter import RateLimiter

# ── Init Vertex AI ───────────────────────────────────────────────
_initialized = False


def _init_vertex():
    global _initialized
    if not _initialized:
        vertexai.init(project=GCP_PROJECT_ID, location=GCP_REGION)
        _initialized = True


# ── Rate limiters ────────────────────────────────────────────────
_vision_limiter = RateLimiter(60)    # conservative — check quota
_flash_limiter = RateLimiter(200)
_embed_limiter = RateLimiter(1500)


# ── Embedding (Google AI free tier) ─────────────────────────────

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=2, min=2, max=60),
    retry=retry_if_exception_type((requests.exceptions.RequestException, KeyError)),
)
def embed_text(text: str) -> list[float]:
    """Embed a single text using Google AI free tier."""
    _embed_limiter.acquire()
    resp = requests.post(
        EMBEDDING_URL,
        json={"content": {"parts": [{"text": text}]}},
        timeout=30,
    )
    resp.raise_for_status()
    values = resp.json()["embedding"]["values"]
    assert len(values) == EMBEDDING_DIMS, f"Expected {EMBEDDING_DIMS} dims, got {len(values)}"
    return values


def embed_batch(texts: list[str], batch_size: int = 20) -> list[list[float]]:
    """Embed a list of texts, processing in batches."""
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        for text in batch:
            results.append(embed_text(text))
    return results


# ── Gemini Vision (Vertex AI — billed to GCP) ───────────────────

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=5, max=120),
    retry=retry_if_exception_type(Exception),
)
def generate_vision(
    image_bytes: bytes,
    prompt: str,
    mime_type: str = "application/pdf",
    response_schema: dict | None = None,
) -> str:
    """Send image/PDF to Gemini 1.5 Pro Vision via Vertex AI."""
    _init_vertex()
    _vision_limiter.acquire()

    model = GenerativeModel(VERTEX_VISION_MODEL)
    image_part = Part.from_data(data=image_bytes, mime_type=mime_type)

    generation_config = None
    if response_schema:
        generation_config = GenerationConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
        )

    response = model.generate_content(
        [image_part, prompt],
        generation_config=generation_config,
    )
    return response.text


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=5, max=120),
    retry=retry_if_exception_type(Exception),
)
def generate_structured(
    prompt: str,
    response_schema: dict | None = None,
    model_name: str | None = None,
) -> str:
    """Text-only generation via Vertex AI (Flash or Pro)."""
    _init_vertex()

    use_model = model_name or VERTEX_FLASH_MODEL
    limiter = _flash_limiter if "flash" in use_model.lower() else _vision_limiter
    limiter.acquire()

    model = GenerativeModel(use_model)

    generation_config = None
    if response_schema:
        generation_config = GenerationConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
        )

    response = model.generate_content(
        [prompt],
        generation_config=generation_config,
    )
    return response.text


def generate_vision_pages(
    pdf_bytes: bytes,
    pages: list[bytes],
    prompt: str,
    response_schema: dict | None = None,
) -> list[str]:
    """Process multiple PDF page images through Vision AI."""
    results = []
    for page_img in pages:
        result = generate_vision(
            page_img, prompt,
            mime_type="image/png",
            response_schema=response_schema,
        )
        results.append(result)
    return results
