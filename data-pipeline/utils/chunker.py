"""
Text chunking for document embeddings.
Splits text into chunks of ~512 tokens with 50-token overlap.

Uses tiktoken for accurate token counting (cl100k_base, same family
as used by Google's tokenizers for similar models).
"""

import tiktoken

_encoder = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Count tokens in text."""
    return len(_encoder.encode(text))


def chunk_text(
    text: str,
    chunk_size: int = 512,
    overlap: int = 50,
    metadata: dict | None = None,
) -> list[dict]:
    """
    Split text into overlapping chunks.

    Returns list of dicts:
        {
            "chunk_index": int,
            "chunk_text": str,
            "token_count": int,
            "metadata": dict,
        }
    """
    if not text or not text.strip():
        return []

    tokens = _encoder.encode(text)
    total_tokens = len(tokens)

    if total_tokens <= chunk_size:
        return [{
            "chunk_index": 0,
            "chunk_text": text.strip(),
            "token_count": total_tokens,
            "metadata": metadata or {},
        }]

    chunks = []
    start = 0
    chunk_index = 0

    while start < total_tokens:
        end = min(start + chunk_size, total_tokens)
        chunk_tokens = tokens[start:end]
        chunk_text_str = _encoder.decode(chunk_tokens).strip()

        if chunk_text_str:  # skip empty chunks
            chunks.append({
                "chunk_index": chunk_index,
                "chunk_text": chunk_text_str,
                "token_count": len(chunk_tokens),
                "metadata": metadata or {},
            })
            chunk_index += 1

        # Advance by (chunk_size - overlap) tokens
        start += chunk_size - overlap

    return chunks


def chunk_regulation(
    regulation_id: str,
    content: str,
    source_url: str,
    doc_number: str = "",
    chunk_size: int = 512,
    overlap: int = 50,
) -> list[dict]:
    """
    Chunk a regulation document with provenance metadata.

    Returns chunks ready for insertion into cg_document_chunks.
    """
    base_metadata = {
        "source_url": source_url,
        "regulation_id": regulation_id,
        "regulation_doc_number": doc_number,
    }

    raw_chunks = chunk_text(content, chunk_size, overlap, base_metadata)

    for chunk in raw_chunks:
        chunk["source_type"] = "REGULATION"
        chunk["source_id"] = regulation_id

    return raw_chunks
