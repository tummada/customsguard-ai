"""
Tests for utils/chunker.py — text chunking for document embeddings.
"""
import pytest
from utils.chunker import chunk_text, count_tokens, chunk_regulation


class TestCountTokens:
    def test_empty_string(self):
        assert count_tokens("") == 0

    def test_simple_english(self):
        tokens = count_tokens("Hello world")
        assert tokens >= 1  # at least 1 token

    def test_thai_text(self):
        tokens = count_tokens("กุ้งแช่แข็ง")
        assert tokens >= 1


class TestChunkText:
    def test_empty_text_returns_empty_list(self):
        """Empty text should return empty list."""
        assert chunk_text("") == []
        assert chunk_text("   ") == []
        assert chunk_text(None) == []  # type: ignore

    def test_short_text_returns_single_chunk(self):
        """Text shorter than chunk_size should return exactly 1 chunk."""
        text = "This is a short text."
        result = chunk_text(text, chunk_size=512)

        assert len(result) == 1
        assert result[0]["chunk_index"] == 0
        assert result[0]["chunk_text"] == text.strip()
        assert result[0]["token_count"] <= 512
        assert result[0]["metadata"] == {}

    def test_long_text_returns_multiple_chunks(self):
        """Text longer than chunk_size should be split into multiple chunks."""
        # Generate text that is definitely longer than 50 tokens
        text = " ".join(["word"] * 200)  # ~200 tokens
        result = chunk_text(text, chunk_size=50, overlap=10)

        assert len(result) > 1
        # Each chunk should have chunk_index incrementing
        for i, chunk in enumerate(result):
            assert chunk["chunk_index"] == i
            assert chunk["chunk_text"]  # non-empty
            assert chunk["token_count"] > 0

    def test_overlap_creates_more_chunks(self):
        """More overlap should create more chunks."""
        text = " ".join(["word"] * 200)
        no_overlap = chunk_text(text, chunk_size=50, overlap=0)
        with_overlap = chunk_text(text, chunk_size=50, overlap=25)

        assert len(with_overlap) > len(no_overlap)

    def test_metadata_is_preserved(self):
        """Metadata dict should be passed through to chunks."""
        meta = {"source_url": "https://customs.go.th/doc/123", "doc_id": "D001"}
        text = "Some regulatory text."
        result = chunk_text(text, metadata=meta)

        assert result[0]["metadata"] == meta

    def test_metadata_default_is_empty_dict(self):
        """When no metadata is provided, default should be empty dict."""
        result = chunk_text("Hello world")
        assert result[0]["metadata"] == {}

    def test_chunk_size_respected(self):
        """Each chunk's token count should not exceed chunk_size."""
        text = " ".join(["testing"] * 500)
        result = chunk_text(text, chunk_size=100, overlap=10)

        for chunk in result:
            assert chunk["token_count"] <= 100


class TestChunkRegulation:
    def test_returns_chunks_with_regulation_metadata(self):
        """chunk_regulation should add source_type and source_id fields."""
        text = "Article 1: All imported goods must be declared."
        result = chunk_regulation(
            regulation_id="REG-001",
            content=text,
            source_url="https://customs.go.th/reg/001",
            doc_number="DOC-2024-001",
        )

        assert len(result) >= 1
        chunk = result[0]
        assert chunk["source_type"] == "REGULATION"
        assert chunk["source_id"] == "REG-001"
        assert chunk["metadata"]["source_url"] == "https://customs.go.th/reg/001"
        assert chunk["metadata"]["regulation_id"] == "REG-001"
        assert chunk["metadata"]["regulation_doc_number"] == "DOC-2024-001"

    def test_empty_content_returns_empty(self):
        result = chunk_regulation("REG-X", "", "https://example.com")
        assert result == []
