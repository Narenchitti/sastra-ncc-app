import sys
import os

# Force SQLite mode
os.environ["USE_SQLITE"] = "true"

# Insert backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.services import sqlite_db

client = TestClient(app)

def test_full_auth_flow():
    # ── 1. Clean test environment users ──
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email IN ('test_cadet@sastra.ncc', 'test_cadet_rejected@sastra.ncc')")
    conn.commit()
    conn.close()

    # ── 2. Cadet Enlistment (Sign Up) ──
    signup_payload = {
        "name": "TEST CADET",
        "email": "test_cadet@sastra.ncc",
        "password": "cadetpassword123",
        "rank": "Cadet",
        "regimentalNumber": "TN2026SDA023501",
        "registrationNumber": "127009999",
        "dob": "2005-05-15",
        "yearBranch": "III Year, B.Tech. CSE",
        "hostelInfo": "Vinaya Block-1, S-101",
        "batchYear": 2026
    }
    
    print("\n[TEST] 1. Creating new enlistment signup...")
    res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code == 200, f"Signup failed: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert "Awaiting verification" in data["message"]
    print("  -> Signup API response verified.")

    # Verify status in database
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, status FROM users WHERE email = 'test_cadet@sastra.ncc'")
    user_row = cursor.fetchone()
    conn.close()
    
    assert user_row is not None, "Cadet not found in DB after signup"
    cadet_id = user_row["id"]
    assert user_row["status"] == "PENDING_APPROVAL", f"Expected PENDING_APPROVAL, got {user_row['status']}"
    print(f"  -> User record verified in database with PENDING_APPROVAL status (ID: {cadet_id}).")

    # ── 3. Attempt Login (Should fail with PENDING_APPROVAL) ──
    print("\n[TEST] 2. Attempting login as pending cadet...")
    login_payload = {
        "email": "test_cadet@sastra.ncc",
        "password": "cadetpassword123"
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    assert "pending approval" in res.json()["detail"]
    print("  -> Login rejected as expected for pending user.")

    # ── 4. ANO Login for verification ──
    print("\n[TEST] 3. Logging in as ANO...")
    ano_login = {
        "email": "ano@sastra.ncc",
        "password": "12345678"
    }
    res = client.post("/api/auth/login", json=ano_login)
    assert res.status_code == 200, f"ANO login failed: {res.text}"
    ano_token = res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {ano_token}"}
    print("  -> ANO login successful. Token acquired.")

    # ── 5. Retrieve Pending Signups ──
    print("\n[TEST] 4. Retrieving pending signups list...")
    res = client.get("/api/users/pending", headers=headers)
    assert res.status_code == 200, f"Pending fetch failed: {res.text}"
    pending_list = res.json()
    assert any(u["email"] == "test_cadet@sastra.ncc" for u in pending_list), "Test cadet not in pending list"
    print("  -> Test cadet successfully retrieved from pending approvals list.")

    # ── 6. Approve Cadet Account ──
    print("\n[TEST] 5. Approving cadet account...")
    res = client.put(f"/api/users/{cadet_id}/approve", json={"status": "APPROVED"}, headers=headers)
    assert res.status_code == 200, f"Approval failed: {res.text}"
    
    # Check DB status
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM users WHERE email = 'test_cadet@sastra.ncc'")
    db_status = cursor.fetchone()["status"]
    conn.close()
    assert db_status == "APPROVED", f"Expected APPROVED, got {db_status}"
    print("  -> Database user status successfully updated to APPROVED.")

    # ── 7. Login as Approved Cadet ──
    print("\n[TEST] 6. Logging in as newly approved cadet...")
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Cadet login failed after approval: {res.text}"
    cadet_data = res.json()
    assert cadet_data["success"] is True
    assert "accessToken" in cadet_data
    print("  -> Cadet login successful. Secure Link established.")

    # ── 8. Rejection Flow ──
    print("\n[TEST] 7. Testing rejection flow...")
    signup_rejected = {
        "name": "TEST REJECTED CADET",
        "email": "test_cadet_rejected@sastra.ncc",
        "password": "cadetpassword123",
        "rank": "Cadet",
        "regimentalNumber": "TN2026SDA023502",
        "registrationNumber": "127009998",
        "dob": "2005-06-20",
        "yearBranch": "III Year, B.Tech. EEE",
        "hostelInfo": "Vinaya Block-1, S-102",
        "batchYear": 2026
    }
    # Signup
    res = client.post("/api/auth/signup", json=signup_rejected)
    assert res.status_code == 200
    
    # Get ID from DB
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = 'test_cadet_rejected@sastra.ncc'")
    rejected_id = cursor.fetchone()["id"]
    conn.close()

    # Reject
    res = client.put(f"/api/users/{rejected_id}/approve", json={"status": "REJECTED"}, headers=headers)
    assert res.status_code == 200

    # Attempt login
    res = client.post("/api/auth/login", json={"email": "test_cadet_rejected@sastra.ncc", "password": "cadetpassword123"})
    assert res.status_code == 401
    assert "declined" in res.json()["detail"]
    print("  -> Rejection handled correctly. Login blocked with declined status message.")

    # ── Clean up ──
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email IN ('test_cadet@sastra.ncc', 'test_cadet_rejected@sastra.ncc')")
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY! AUTHENTICATION FLOW IS FLAWLESS.")
    print("=" * 60)

if __name__ == "__main__":
    test_full_auth_flow()
