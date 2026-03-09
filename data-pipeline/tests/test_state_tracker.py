"""
Tests for utils/state_tracker.py — pipeline checkpoint/resume.
Uses unittest.mock to mock PostgreSQL connection.
"""
import pytest
from unittest.mock import MagicMock, patch, call
from utils.state_tracker import StateTracker, CREATE_TABLE_SQL


@pytest.fixture
def mock_conn():
    """Create a mock psycopg2 connection with cursor context manager."""
    conn = MagicMock()
    cursor = MagicMock()
    # cursor should work as context manager
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    return conn, cursor


class TestStateTracker:
    def test_init_creates_table(self, mock_conn):
        """StateTracker should ensure _pipeline_state table exists on init."""
        conn, cursor = mock_conn
        tracker = StateTracker(conn, "test_pipeline")

        cursor.execute.assert_called_with(CREATE_TABLE_SQL)
        conn.commit.assert_called()

    def test_is_processed_returns_true_when_completed(self, mock_conn):
        """is_processed should return True when record exists with COMPLETED status."""
        conn, cursor = mock_conn
        cursor.fetchone.return_value = (1,)

        tracker = StateTracker(conn, "embed_hs")
        result = tracker.is_processed("hs_code_0306")

        assert result is True

    def test_is_processed_returns_false_when_not_found(self, mock_conn):
        """is_processed should return False when no record exists."""
        conn, cursor = mock_conn
        cursor.fetchone.return_value = None

        tracker = StateTracker(conn, "embed_hs")
        result = tracker.is_processed("hs_code_9999")

        assert result is False

    def test_mark_processed_inserts_with_completed_status(self, mock_conn):
        """mark_processed should INSERT with status=COMPLETED."""
        conn, cursor = mock_conn
        tracker = StateTracker(conn, "embed_pipeline")
        tracker.mark_processed("doc_001", "embedded 5 chunks")

        # Check that execute was called with COMPLETED
        calls = cursor.execute.call_args_list
        # Last call should be the INSERT (first is CREATE TABLE)
        insert_call = calls[-1]
        sql = insert_call[0][0]
        params = insert_call[0][1]

        assert "COMPLETED" in sql
        assert params == ("embed_pipeline", "doc_001", "embedded 5 chunks")
        conn.commit.assert_called()

    def test_mark_failed_inserts_with_failed_status(self, mock_conn):
        """mark_failed should INSERT with status=FAILED."""
        conn, cursor = mock_conn
        tracker = StateTracker(conn, "embed_pipeline")
        tracker.mark_failed("doc_002", "API timeout")

        calls = cursor.execute.call_args_list
        insert_call = calls[-1]
        sql = insert_call[0][0]
        params = insert_call[0][1]

        assert "FAILED" in sql
        assert params == ("embed_pipeline", "doc_002", "API timeout")

    def test_mark_skipped(self, mock_conn):
        """mark_skipped should INSERT with status=SKIPPED."""
        conn, cursor = mock_conn
        tracker = StateTracker(conn, "embed_pipeline")
        tracker.mark_skipped("doc_003", "too short")

        calls = cursor.execute.call_args_list
        insert_call = calls[-1]
        sql = insert_call[0][0]

        assert "SKIPPED" in sql

    def test_get_progress_returns_status_counts(self, mock_conn):
        """get_progress should return dict of status -> count."""
        conn, cursor = mock_conn
        cursor.fetchall.return_value = [("COMPLETED", 10), ("FAILED", 2)]

        tracker = StateTracker(conn, "embed_pipeline")
        progress = tracker.get_progress()

        assert progress == {"COMPLETED": 10, "FAILED": 2}

    def test_get_failed_keys_returns_list(self, mock_conn):
        """get_failed_keys should return list of source_keys with FAILED status."""
        conn, cursor = mock_conn
        cursor.fetchall.return_value = [("doc_002",), ("doc_005",)]

        tracker = StateTracker(conn, "embed_pipeline")
        failed = tracker.get_failed_keys()

        assert failed == ["doc_002", "doc_005"]

    def test_reset_failed_deletes_failed_entries(self, mock_conn):
        """reset_failed should DELETE all FAILED entries for the pipeline."""
        conn, cursor = mock_conn
        tracker = StateTracker(conn, "embed_pipeline")
        tracker.reset_failed()

        calls = cursor.execute.call_args_list
        delete_call = calls[-1]
        sql = delete_call[0][0]

        assert "DELETE" in sql
        assert "FAILED" in sql
        conn.commit.assert_called()
