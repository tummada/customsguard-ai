"""
Pipeline state tracker — records which items have been processed so scripts
can resume from where they left off after crashes or rate-limit interruptions.

Uses a `_pipeline_state` table in PostgreSQL.
"""

import psycopg2
from datetime import datetime


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS _pipeline_state (
    pipeline_name  VARCHAR(100) NOT NULL,
    source_key     VARCHAR(500) NOT NULL,
    status         VARCHAR(20)  DEFAULT 'COMPLETED',
    result_summary TEXT,
    error_message  TEXT,
    processed_at   TIMESTAMPTZ  DEFAULT NOW(),
    PRIMARY KEY (pipeline_name, source_key)
);
"""


class StateTracker:
    def __init__(self, conn, pipeline_name: str):
        self.conn = conn
        self.pipeline_name = pipeline_name
        self._ensure_table()

    def _ensure_table(self):
        with self.conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
            self.conn.commit()

    def is_processed(self, source_key: str) -> bool:
        """Check if a source_key was already completed."""
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM _pipeline_state "
                "WHERE pipeline_name = %s AND source_key = %s AND status = 'COMPLETED'",
                (self.pipeline_name, source_key),
            )
            return cur.fetchone() is not None

    def mark_processed(self, source_key: str, result_summary: str = ""):
        """Mark a source_key as successfully processed."""
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO _pipeline_state (pipeline_name, source_key, status, result_summary, processed_at)
                VALUES (%s, %s, 'COMPLETED', %s, NOW())
                ON CONFLICT (pipeline_name, source_key) DO UPDATE SET
                    status = 'COMPLETED',
                    result_summary = EXCLUDED.result_summary,
                    error_message = NULL,
                    processed_at = NOW()
                """,
                (self.pipeline_name, source_key, result_summary),
            )
            self.conn.commit()

    def mark_failed(self, source_key: str, error_message: str):
        """Mark a source_key as failed (will be retried next run)."""
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO _pipeline_state (pipeline_name, source_key, status, error_message, processed_at)
                VALUES (%s, %s, 'FAILED', %s, NOW())
                ON CONFLICT (pipeline_name, source_key) DO UPDATE SET
                    status = 'FAILED',
                    error_message = EXCLUDED.error_message,
                    processed_at = NOW()
                """,
                (self.pipeline_name, source_key, error_message),
            )
            self.conn.commit()

    def mark_skipped(self, source_key: str, reason: str = ""):
        """Mark a source_key as intentionally skipped."""
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO _pipeline_state (pipeline_name, source_key, status, result_summary, processed_at)
                VALUES (%s, %s, 'SKIPPED', %s, NOW())
                ON CONFLICT (pipeline_name, source_key) DO UPDATE SET
                    status = 'SKIPPED',
                    result_summary = EXCLUDED.result_summary,
                    processed_at = NOW()
                """,
                (self.pipeline_name, source_key, reason),
            )
            self.conn.commit()

    def get_progress(self) -> dict:
        """Get counts by status for this pipeline."""
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT status, COUNT(*) FROM _pipeline_state "
                "WHERE pipeline_name = %s GROUP BY status",
                (self.pipeline_name,),
            )
            return dict(cur.fetchall())

    def get_failed_keys(self) -> list[str]:
        """Get all source_keys that failed (for retry)."""
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT source_key FROM _pipeline_state "
                "WHERE pipeline_name = %s AND status = 'FAILED' "
                "ORDER BY processed_at",
                (self.pipeline_name,),
            )
            return [row[0] for row in cur.fetchall()]

    def reset_failed(self):
        """Delete FAILED entries so they can be retried."""
        with self.conn.cursor() as cur:
            cur.execute(
                "DELETE FROM _pipeline_state "
                "WHERE pipeline_name = %s AND status = 'FAILED'",
                (self.pipeline_name,),
            )
            self.conn.commit()
