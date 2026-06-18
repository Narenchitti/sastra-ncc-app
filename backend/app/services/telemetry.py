import time
import contextvars
import threading
from typing import List, Dict, Any

# Thread-safe global trace storage
_store_lock = threading.Lock()
telemetry_store: List[Dict[str, Any]] = []
MAX_TRACES = 20

# Request-scoped spans context variable
current_spans: contextvars.ContextVar[List[Dict[str, Any]] | None] = contextvars.ContextVar("current_spans", default=None)

class TelemetrySpan:
    """Context manager to measure and log code block execution latency in a request trace."""
    def __init__(self, category: str, name: str):
        self.category = category
        self.name = name
        self.start_time = 0.0

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.perf_counter() - self.start_time) * 1000.0
        record_span(self.category, self.name, duration_ms)

def record_span(category: str, name: str, duration_ms: float):
    """Appends a span segment to the request context."""
    spans = current_spans.get()
    if spans is not None:
        spans.append({
            "name": name,
            "category": category,
            "duration_ms": round(duration_ms, 2)
        })

def add_trace(trace: Dict[str, Any]):
    """Appends a completed request trace profile to the storage list."""
    with _store_lock:
        telemetry_store.append(trace)
        if len(telemetry_store) > MAX_TRACES:
            telemetry_store.pop(0)

def get_traces() -> List[Dict[str, Any]]:
    """Retrieves a list of collected traces ordered from newest to oldest."""
    with _store_lock:
        return list(reversed(telemetry_store))
