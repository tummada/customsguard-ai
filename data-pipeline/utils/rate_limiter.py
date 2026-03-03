"""
Token-bucket rate limiter for API calls.

Vertex AI has per-minute quotas even with billing enabled.
New GCP accounts may start with lower limits (10-60 RPM).
"""

import time
import threading


class RateLimiter:
    """Thread-safe token bucket rate limiter."""

    def __init__(self, requests_per_minute: int):
        self.rpm = requests_per_minute
        self.interval = 60.0 / requests_per_minute  # seconds between requests
        self.lock = threading.Lock()
        self.last_request_time = 0.0

    def acquire(self):
        """Block until a request slot is available."""
        with self.lock:
            now = time.monotonic()
            wait_time = self.last_request_time + self.interval - now
            if wait_time > 0:
                time.sleep(wait_time)
            self.last_request_time = time.monotonic()

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, *args):
        pass


class ConcurrentRateLimiter:
    """Rate limiter with both RPM and max-concurrency control."""

    def __init__(self, requests_per_minute: int, max_concurrent: int = 5):
        self.rpm_limiter = RateLimiter(requests_per_minute)
        self.semaphore = threading.Semaphore(max_concurrent)

    def acquire(self):
        self.semaphore.acquire()
        self.rpm_limiter.acquire()

    def release(self):
        self.semaphore.release()

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, *args):
        self.release()
