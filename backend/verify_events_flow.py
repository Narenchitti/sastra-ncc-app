import sys
import os
import uuid

# Force SQLite mode
os.environ["USE_SQLITE"] = "true"
# Set dummy Discord webhook for checking webhook flow
os.environ["DISCORD_WEBHOOK_URL"] = "https://discord.com/api/webhooks/dummy_test_webhook"

# Insert backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.services import sqlite_db

client = TestClient(app)

def test_events_flow():
    print("--- Running Schedule & Events Flow Verification Tests ---")
    
    # ── 1. Create Helper Users (ANO, Cadet) for Authentication ──
    print("\n[TEST] 1. Setting up helper auth tokens...")
    
    # Login as default ANO
    ano_login_res = client.post("/api/auth/login", json={"email": "ano@sastra.ncc", "password": "12345678"})
    assert ano_login_res.status_code == 200, "ANO login failed!"
    ano_token = ano_login_res.json()["accessToken"]
    ano_headers = {"Authorization": f"Bearer {ano_token}"}
    
    # Create and login as test Cadet (if not exists)
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email = 'event_test_cadet@sastra.ncc'")
    conn.commit()
    conn.close()
    
    signup_res = client.post("/api/auth/signup", json={
        "name": "EVENT TEST CADET",
        "email": "event_test_cadet@sastra.ncc",
        "password": "cadetpassword123",
        "rank": "Cadet",
        "regimentalNumber": "TN2026SDA023599",
        "registrationNumber": "127009990",
        "dob": "2005-08-15",
        "yearBranch": "III Year, B.Tech. CSE",
        "hostelInfo": "Vinaya Block-1",
        "batchYear": 2026
    })
    assert signup_res.status_code == 200
    
    # Approve test Cadet
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = 'event_test_cadet@sastra.ncc'")
    cadet_id = cursor.fetchone()["id"]
    cursor.execute("UPDATE users SET status = 'APPROVED' WHERE id = ?", (cadet_id,))
    conn.commit()
    conn.close()
    
    cadet_login_res = client.post("/api/auth/login", json={"email": "event_test_cadet@sastra.ncc", "password": "cadetpassword123"})
    assert cadet_login_res.status_code == 200
    cadet_token = cadet_login_res.json()["accessToken"]
    cadet_headers = {"Authorization": f"Bearer {cadet_token}"}
    
    print("  -> Auth setup complete.")

    # ── 2. Guest Access Controls ──
    print("\n[TEST] 2. Verifying Guest Access Controls...")
    
    # Public events should be accessible
    res = client.get("/api/events/public")
    assert res.status_code == 200
    
    # Protected endpoints should be blocked
    res = client.get("/api/events")
    assert res.status_code == 401
    
    res = client.post("/api/events", json={})
    assert res.status_code == 401
    
    print("  -> Guest access checks passed.")

    # ── 3. Cadet Access Controls ──
    print("\n[TEST] 3. Verifying Cadet Access Controls...")
    
    # Cadet can read events
    res = client.get("/api/events", headers=cadet_headers)
    assert res.status_code == 200
    
    # Cadet cannot write events
    bad_event = {
        "id": str(uuid.uuid4()),
        "title": "Cadet Unauthorized Event",
        "date": "2026-07-10",
        "startTime": "08:00",
        "endTime": "09:00",
        "location": "Main Ground",
        "type": "Parade"
    }
    res = client.post("/api/events", json=bad_event, headers=cadet_headers)
    assert res.status_code == 403
    
    # Cadet cannot delete events
    res = client.delete(f"/api/events/{str(uuid.uuid4())}", headers=cadet_headers)
    assert res.status_code == 403
    
    print("  -> Cadet permission checks passed.")

    # ── 4. Input Validations ──
    print("\n[TEST] 4. Verifying Event Validation Checks...")
    
    test_event_id = str(uuid.uuid4())
    
    # Chronology check: Start time after End time
    res = client.post("/api/events", json={
        "id": test_event_id,
        "title": "Invalid Chronology",
        "date": "2026-07-10",
        "startTime": "10:00",
        "endTime": "09:00",
        "location": "Main Ground",
        "type": "Parade"
    }, headers=ano_headers)
    assert res.status_code == 400
    assert "start time must be before end time" in res.json()["detail"].lower()
    print("  -> Start >= End chronology check rejected correctly.")
    
    # Invalid date format
    res = client.post("/api/events", json={
        "id": test_event_id,
        "title": "Invalid Date",
        "date": "2026/07/10",
        "startTime": "08:00",
        "endTime": "09:00",
        "location": "Main Ground",
        "type": "Parade"
    }, headers=ano_headers)
    assert res.status_code == 400
    assert "invalid date format" in res.json()["detail"].lower()
    print("  -> Invalid date format rejected correctly.")

    # Invalid time format
    res = client.post("/api/events", json={
        "id": test_event_id,
        "title": "Invalid Time",
        "date": "2026-07-10",
        "startTime": "eight AM",
        "endTime": "09:00",
        "location": "Main Ground",
        "type": "Parade"
    }, headers=ano_headers)
    assert res.status_code == 400
    assert "invalid time format" in res.json()["detail"].lower()
    print("  -> Invalid time format rejected correctly.")

    # Invalid event type
    res = client.post("/api/events", json={
        "id": test_event_id,
        "title": "Invalid Type",
        "date": "2026-07-10",
        "startTime": "08:00",
        "endTime": "09:00",
        "location": "Main Ground",
        "type": "SuperParade"
    }, headers=ano_headers)
    assert res.status_code == 400
    assert "invalid event type" in res.json()["detail"].lower()
    print("  -> Invalid event type rejected correctly.")

    # ── 5. Successful Event Creation ──
    print("\n[TEST] 5. Verifying Successful Event Creation by ANO...")
    
    valid_event = {
        "id": test_event_id,
        "title": "Test Command Parade",
        "date": "2026-07-20",
        "startTime": "06:30",
        "endTime": "08:30",
        "location": "NCC Parade Ground",
        "type": "Parade"
    }
    res = client.post("/api/events", json=valid_event, headers=ano_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True
    print("  -> Valid event published successfully.")

    # Verify presence in database
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events WHERE id = ?", (test_event_id,))
    row = cursor.fetchone()
    conn.close()
    assert row is not None
    assert row["title"] == "Test Command Parade"
    print("  -> Event verified in local SQLite database.")

    # ── 6. SQLite Referential Cascade Check ──
    print("\n[TEST] 6. Verifying SQLite Attendance Cascade Cleanup...")
    
    # Mark attendance for this event
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO attendance (event_id, user_id, status, marked_by) VALUES (?, ?, ?, ?)",
        (test_event_id, cadet_id, "Present", "ano")
    )
    conn.commit()
    
    # Assert attendance is recorded
    cursor.execute("SELECT COUNT(*) as count FROM attendance WHERE event_id = ?", (test_event_id,))
    assert cursor.fetchone()["count"] == 1
    conn.close()
    print("  -> Attendance record created.")

    # Delete the event
    res = client.delete(f"/api/events/{test_event_id}", headers=ano_headers)
    assert res.status_code == 200
    print("  -> Event deleted successfully.")

    # Verify event is removed
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM events WHERE id = ?", (test_event_id,))
    assert cursor.fetchone()["count"] == 0
    
    # Verify related attendance records are cleaned up!
    cursor.execute("SELECT COUNT(*) as count FROM attendance WHERE event_id = ?", (test_event_id,))
    attendance_count = cursor.fetchone()["count"]
    conn.close()
    assert attendance_count == 0, f"Expected 0 attendance rows, got {attendance_count}!"
    print("  -> Attendance records cascading-deleted successfully in SQLite.")

    # ── Clean up helper user ──
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email = 'event_test_cadet@sastra.ncc'")
    conn.commit()
    conn.close()
    
    print("\n============================================================")
    print("ALL SCHEDULE & EVENTS VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("============================================================")

if __name__ == "__main__":
    test_events_flow()
