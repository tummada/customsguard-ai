"""
Tests for utils/rate_limiter.py — token-bucket rate limiter.
"""
import time
import pytest
from unittest.mock import patch
from utils.rate_limiter import RateLimiter, ConcurrentRateLimiter


class TestRateLimiter:
    def test_first_request_no_wait(self):
        """First request should not block."""
        limiter = RateLimiter(requests_per_minute=60)
        start = time.monotonic()
        limiter.acquire()
        elapsed = time.monotonic() - start
        assert elapsed < 0.1  # should be nearly instant

    def test_interval_calculation(self):
        """Interval should be 60/RPM seconds."""
        limiter = RateLimiter(requests_per_minute=30)
        assert limiter.interval == pytest.approx(2.0)

        limiter2 = RateLimiter(requests_per_minute=60)
        assert limiter2.interval == pytest.approx(1.0)

    def test_context_manager_works(self):
        """RateLimiter should work as context manager."""
        limiter = RateLimiter(requests_per_minute=600)
        with limiter:
            pass  # should not raise


class TestConcurrentRateLimiter:
    def test_context_manager_acquire_release(self):
        """ConcurrentRateLimiter should acquire semaphore and rate limit, then release."""
        limiter = ConcurrentRateLimiter(requests_per_minute=600, max_concurrent=5)

        with limiter:
            pass  # should not raise

        # After exit, semaphore should be released (we can acquire again)
        limiter.semaphore.acquire(blocking=False)
        limiter.semaphore.release()

    def test_max_concurrent_default(self):
        """Default max_concurrent should be 5."""
        limiter = ConcurrentRateLimiter(requests_per_minute=60)
        assert limiter.semaphore._value == 5
