"""
Central configuration for the CustomsGuard data pipeline.

Environment variables (set in .env or export):
  GCP_PROJECT_ID        - GCP project for Vertex AI billing
  GCP_REGION            - Region (default: us-central1)
  GCS_RAW_BUCKET        - Bucket for raw downloads
  GCS_PROCESSED_BUCKET  - Bucket for AI-processed JSON
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD - PostgreSQL connection
  GEMINI_API_KEY        - Google AI Studio key (embedding free tier only)
"""

import os
from dotenv import load_dotenv

load_dotenv()
# Also load root .env if running from data-pipeline/
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ── GCP ──────────────────────────────────────────────────────────
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "")
GCP_REGION = os.getenv("GCP_REGION", "us-central1")
GCS_RAW_BUCKET = os.getenv("GCS_RAW_BUCKET", "customsguard-raw")
GCS_PROCESSED_BUCKET = os.getenv("GCS_PROCESSED_BUCKET", "customsguard-processed")

# ── Database ─────────────────────────────────────────────────────
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "ai_saas_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

DB_DSN = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"

# ── Gemini (Google AI Studio free tier — embedding only) ─────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIMS = 768
EMBEDDING_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{EMBEDDING_MODEL}:embedContent?key={GEMINI_API_KEY}"
)

# ── Vertex AI (billed to GCP credit) ────────────────────────────
VERTEX_VISION_MODEL = "gemini-1.5-pro"
VERTEX_FLASH_MODEL = "gemini-2.5-flash"

# ── Rate Limits (requests per minute) ───────────────────────────
RATE_LIMITS = {
    "vision": 60,       # Gemini 1.5 Pro Vision — conservative start
    "flash": 200,       # Gemini 2.5 Flash
    "embedding": 1500,  # text-embedding-004 (free tier)
}

# ── Chunking ─────────────────────────────────────────────────────
CHUNK_SIZE_TOKENS = 512
CHUNK_OVERLAP_TOKENS = 50

# ── Provenance ───────────────────────────────────────────────────
PROVENANCE_SOURCES = {
    "data_go_th": "https://data.go.th/en/dataset/hscode",
    "ecs_support": "https://ecs-support.github.io",
    "thailandntr": "https://www.thailandntr.com",
    "tax_dtn": "https://tax.dtn.go.th",
    "customs_go_th": "https://customs.go.th",
}

# ── Backend API (for eval pipeline) ───────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")

# ── Redis (for rate limit flush during eval) ─────────────────────
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")

# ── Gemini Chat (for LLM-as-Judge) ───────────────────────────────
GEMINI_CHAT_MODEL = "gemini-2.5-flash"
GEMINI_CHAT_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_CHAT_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

# ── Pipeline Data Directory (local cache before GCS) ────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")


def get_db_conn():
    """Get a new psycopg2 connection."""
    import psycopg2
    return psycopg2.connect(DB_DSN)
