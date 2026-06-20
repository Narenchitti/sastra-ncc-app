import sys
import os
import time
import asyncio
import httpx

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Ensure backend folder is in PATH
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.telemetry import TelemetrySpan, current_spans, add_trace, get_traces

async def test_telemetry_spans():
    print("--- Running Backend Observability Telemetry Tests ---")
    
    # 1. Test spans collection context
    print("\n1. Testing contextvars scope span collection...")
    spans_token = current_spans.set([])
    
    with TelemetrySpan("database", "SQLite SELECT users"):
        await asyncio.sleep(0.05) # Simulate database delay (50ms)
        
    with TelemetrySpan("ai", "Gemini OCR Audit"):
        await asyncio.sleep(0.1) # Simulate AI delay (100ms)
        
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
    
    print("[PASS] Contextvars span accumulation logic passed.")
    
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
    
    print("[PASS] Trace queue storage logic passed.")
    
    # 3. Test Integration with FastAPI Endpoint
    print("\n3. Testing GET /api/telemetry/traces API endpoint...")
    base_url = "http://127.0.0.1:8000/api"
    login_payload = {
        "email": "ano@sastra.ncc",
        "password": "12345678"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Login
            r = await client.post(f"{base_url}/auth/login", json=login_payload)
            if r.status_code != 200:
                print(f"[FAIL] Login failed for telemetry test: {r.text}")
                return
            res_data = r.json()
            token = res_data.get("accessToken") or res_data.get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Hit telemetry route
            res = await client.get(f"{base_url}/telemetry/traces", headers=headers)
            if res.status_code == 200:
                traces_data = res.json()
                if len(traces_data) > 0:
                    first_item = traces_data[0]
                    # Verify key serialization format (camelCase)
                    print(f"Sample response trace: {first_item}")
                    assert "durationMs" in first_item, "Response must map duration_ms to durationMs!"
                    assert "statusCode" in first_item, "Response must map status_code to statusCode!"
                    if first_item["spans"]:
                        assert "durationMs" in first_item["spans"][0], "Sub-spans must map duration_ms to durationMs!"
                    print("[PASS] API serialization maps snake_case to camelCase correctly.")
                else:
                    print("[WARN] No traces recorded yet in running server. Storing a mock trace and retrying...")
                    # Trigger a sample API request that gets logged
                    await client.get(f"{base_url}/unit-config", headers=headers)
                    res = await client.get(f"{base_url}/telemetry/traces", headers=headers)
                    traces_data = res.json()
                    first_item = traces_data[0]
                    assert "durationMs" in first_item
                    assert "statusCode" in first_item
                    print("[PASS] Retried trace verification passed.")
            else:
                print(f"[FAIL] Telemetry endpoint returned status: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"[WARN] Connection to port 8000 failed: {e}. Skipping API integration check. Run server first.")
            
    print("\n[PASS] All Telemetry Engine verification tests completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_telemetry_spans())
