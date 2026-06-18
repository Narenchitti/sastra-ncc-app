import sys
import os
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Ensure backend folder is in PATH
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.telemetry import TelemetrySpan, current_spans, add_trace, get_traces

def test_telemetry_spans():
    print("--- Running Backend Observability Telemetry Tests ---")
    
    # 1. Test spans collection context
    print("\n1. Testing contextvars scope span collection...")
    
    # Initialize request spans token
    spans_token = current_spans.set([])
    
    with TelemetrySpan("database", "SQLite SELECT users"):
        time.sleep(0.05) # Simulate database delay (50ms)
        
    with TelemetrySpan("ai", "Gemini OCR Audit"):
        time.sleep(0.1) # Simulate AI delay (100ms)
        
    collected = current_spans.get()
    current_spans.reset(spans_token)
    
    print(f"Collected spans: {collected}")
    assert len(collected) == 2, "Should collect exactly 2 spans!"
    
    db_span = collected[0]
    assert db_span["category"] == "database"
    assert db_span["name"] == "SQLite SELECT users"
    assert db_span["duration_ms"] >= 45.0, "Database span duration should be >= 45ms!"
    
    ai_span = collected[1]
    assert ai_span["category"] == "ai"
    assert ai_span["name"] == "Gemini OCR Audit"
    assert ai_span["duration_ms"] >= 95.0, "AI span duration should be >= 95ms!"
    
    print("✅ Contextvars span accumulation logic passed.")
    
    # 2. Test trace queue insertion
    print("\n2. Testing rolling trace storage queue...")
    
    mock_trace = {
        "path": "/api/query",
        "method": "POST",
        "duration_ms": 150.0,
        "status_code": 200,
        "timestamp": "2026-06-18T10:00:00Z",
        "spans": collected
    }
    
    add_trace(mock_trace)
    traces = get_traces()
    
    print(f"Total traces stored: {len(traces)}")
    assert len(traces) > 0, "Traces store should have our mock trace!"
    
    first_trace = traces[0]
    assert first_trace["path"] == "/api/query"
    assert first_trace["duration_ms"] == 150.0
    assert len(first_trace["spans"]) == 2
    
    print("✅ Trace queue storage logic passed.")
    print("\n✅ All Telemetry Engine verification tests passed successfully!")

if __name__ == "__main__":
    test_telemetry_spans()
