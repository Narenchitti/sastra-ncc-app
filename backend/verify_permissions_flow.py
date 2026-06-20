import sys
import os
import uuid
import json

# Reconfigure stdout for UTF-8 to support emoji logs on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Force SQLite mode
os.environ["USE_SQLITE"] = "true"

# Insert backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.services import sqlite_db
from app.schemas.models import UserBase

client = TestClient(app)

def test_permissions_flow():
    print("--- Running Leave Permissions & AI Auditing Flow Verification Tests ---")
    
    # ── 1. Create Helper Users (ANO, Cadet, Manager) for Authentication ──
    print("\n[TEST] 1. Setting up helper users...")
    
    # Clean old test users
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email IN ('perm_test_cadet@sastra.ncc', 'perm_test_manager@sastra.ncc')")
    cursor.execute("DELETE FROM permissions WHERE cadet_name IN ('PERM TEST CADET', 'PERM TEST MANAGER')")
    conn.commit()
    conn.close()

    # Login as default ANO
    ano_login_res = client.post("/api/auth/login", json={"email": "ano@sastra.ncc", "password": "12345678"})
    assert ano_login_res.status_code == 200, "ANO login failed!"
    ano_token = ano_login_res.json()["accessToken"]
    ano_headers = {"Authorization": f"Bearer {ano_token}"}
    
    # Create test Cadet
    signup_cadet_res = client.post("/api/auth/signup", json={
        "name": "PERM TEST CADET",
        "email": "perm_test_cadet@sastra.ncc",
        "password": "cadetpassword123",
        "rank": "Cadet",
        "regimentalNumber": "TN2026SDA023597",
        "registrationNumber": "127009997",
        "dob": "2005-09-15",
        "yearBranch": "III Year, B.Tech. CSE",
        "hostelInfo": "Vinaya Block-1",
        "batchYear": 2026
    })
    assert signup_cadet_res.status_code == 200, signup_cadet_res.text
    
    # Create test Manager (e.g., SUO)
    signup_manager_res = client.post("/api/auth/signup", json={
        "name": "PERM TEST MANAGER",
        "email": "perm_test_manager@sastra.ncc",
        "password": "managerpassword123",
        "rank": "SUO",
        "regimentalNumber": "TN2026SDA023596",
        "registrationNumber": "127009996",
        "dob": "2005-10-15",
        "yearBranch": "III Year, B.Tech. ECE",
        "hostelInfo": "Vinaya Block-2",
        "batchYear": 2026
    })
    assert signup_manager_res.status_code == 200, signup_manager_res.text

    # Approve test Cadet & Manager
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = 'perm_test_cadet@sastra.ncc'")
    cadet_id = cursor.fetchone()["id"]
    cursor.execute("SELECT id FROM users WHERE email = 'perm_test_manager@sastra.ncc'")
    manager_id = cursor.fetchone()["id"]
    cursor.execute("UPDATE users SET status = 'APPROVED' WHERE id IN (?, ?)", (cadet_id, manager_id))
    conn.commit()
    conn.close()

    # Login as Cadet
    cadet_login_res = client.post("/api/auth/login", json={"email": "perm_test_cadet@sastra.ncc", "password": "cadetpassword123"})
    assert cadet_login_res.status_code == 200
    cadet_token = cadet_login_res.json()["accessToken"]
    cadet_headers = {"Authorization": f"Bearer {cadet_token}"}

    # Login as Manager
    manager_login_res = client.post("/api/auth/login", json={"email": "perm_test_manager@sastra.ncc", "password": "managerpassword123"})
    assert manager_login_res.status_code == 200
    manager_token = manager_login_res.json()["accessToken"]
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    
    print("  -> Helper users configured successfully.")

    # ── 2. Designating Permission Manager ──
    print("\n[TEST] 2. Designating Permission Manager (ANO Only)...")
    
    # Cadet should fail to designate Permission Manager
    bad_config_res = client.put("/api/unit-config", json={"permissionManagerId": manager_id}, headers=cadet_headers)
    assert bad_config_res.status_code == 403, "Cadet should not be allowed to designate manager"
    
    # ANO designates manager
    config_res = client.put("/api/unit-config", json={"permissionManagerId": manager_id}, headers=ano_headers)
    assert config_res.status_code == 200, config_res.text
    assert config_res.json()["success"] is True
    
    # Verify in DB
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT permission_manager_id FROM unit_config WHERE id = 'singleton'")
    db_manager_id = cursor.fetchone()["permission_manager_id"]
    conn.close()
    assert db_manager_id == manager_id, f"Expected {manager_id}, got {db_manager_id}"
    print("  -> Permission Manager designated and verified in DB.")

    # ── 3. Cadet Submitting Leave Permission (with dummy evidence upload) ──
    print("\n[TEST] 3. Simulating file upload & permission submission...")
    
    # Create a dummy text file to act as PDF/Image evidence
    os.makedirs("static/uploads", exist_ok=True)
    dummy_file_path = "static/uploads/test_medical.pdf"
    with open(dummy_file_path, "w") as f:
        f.write("This is a dummy medical certificate. Requesting medical leave for fever.")
        
    # Test upload endpoint
    with open(dummy_file_path, "rb") as f:
        upload_res = client.post("/api/upload", files={"file": ("test_medical.pdf", f, "application/pdf")})
    assert upload_res.status_code == 200, upload_res.text
    evidence_url = upload_res.json()["url"]
    print(f"  -> File uploaded successfully. Evidence URL: {evidence_url}")

    # Submit permission request
    perm_id = str(uuid.uuid4())
    perm_payload = {
        "id": perm_id,
        "cadetId": cadet_id,
        "cadetName": "PERM TEST CADET",
        "startDate": "2026-07-01",
        "endDate": "2026-07-05",
        "reason": "Requesting sick leave due to viral fever.",
        "evidenceUrl": evidence_url,
        "status": "PENDING_REVIEW",
        "createdAt": "2026-06-20T10:00:00Z"
    }
    
    submit_res = client.post("/api/permissions", json=perm_payload, headers=cadet_headers)
    assert submit_res.status_code == 200, submit_res.text
    
    # Verify AI audit status
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, ai_status, ai_remarks FROM permissions WHERE id = ?", (perm_id,))
    perm_row = cursor.fetchone()
    conn.close()
    
    assert perm_row is not None
    assert perm_row["status"] == "PENDING_REVIEW"
    assert perm_row["ai_status"] in ["VERIFIED", "FLAGGED", "ERROR"], f"Unexpected AI Status: {perm_row['ai_status']}"
    print(f"  -> Leave permission requested. AI Auditor Status: {perm_row['ai_status']} (Remarks: {perm_row['ai_remarks']})")

    # ── 4. Access Control Checks for Reviewing ──
    print("\n[TEST] 4. Testing access controls on permission review...")
    
    # Non-manager cadet attempts to review -> should fail
    review_bad_payload = dict(perm_payload)
    review_bad_payload["status"] = "FORWARDED_TO_ANO"
    review_bad_payload["suoComment"] = "Recommended by test cadet"
    
    # We must login as another non-manager cadet to test this, or use cadet_headers
    # cadet_headers is a non-manager cadet
    bad_review_res = client.post("/api/permissions", json=review_bad_payload, headers=cadet_headers)
    assert bad_review_res.status_code == 403, "Non-manager cadet should not be allowed to review"

    # ── 5. Permission Manager Review / Forwarding ──
    print("\n[TEST] 5. Permission Manager reviews and forwards the request...")
    
    review_payload = dict(perm_payload)
    review_payload["status"] = "FORWARDED_TO_ANO"
    review_payload["suoComment"] = "Verified medical certificate. Legitimate request."
    review_payload["aiStatus"] = perm_row["ai_status"]
    review_payload["aiRemarks"] = perm_row["ai_remarks"]
    
    review_res = client.post("/api/permissions", json=review_payload, headers=manager_headers)
    assert review_res.status_code == 200, review_res.text
    
    # Verify state in DB
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, suo_comment FROM permissions WHERE id = ?", (perm_id,))
    row_after_manager = cursor.fetchone()
    conn.close()
    assert row_after_manager["status"] == "FORWARDED_TO_ANO"
    assert row_after_manager["suo_comment"] == "Verified medical certificate. Legitimate request."
    print("  -> Request successfully forwarded to ANO by Permission Manager with comments.")

    # ── 6. ANO Final Review / Approval ──
    print("\n[TEST] 6. ANO reviews and final approves the request...")
    
    ano_approve_payload = dict(review_payload)
    ano_approve_payload["status"] = "APPROVED"
    ano_approve_payload["anoComment"] = "Approved. Ensure makeup training is completed."
    ano_approve_payload["suoComment"] = row_after_manager["suo_comment"]
    
    ano_res = client.post("/api/permissions", json=ano_approve_payload, headers=ano_headers)
    assert ano_res.status_code == 200, ano_res.text
    
    # Verify in DB
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, ano_comment FROM permissions WHERE id = ?", (perm_id,))
    final_row = cursor.fetchone()
    conn.close()
    assert final_row["status"] == "APPROVED"
    assert final_row["ano_comment"] == "Approved. Ensure makeup training is completed."
    print("  -> Request approved by ANO and verified in DB.")

    # ── 7. Clean up ──
    print("\n[TEST] 7. Cleaning up test artifacts...")
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE email IN ('perm_test_cadet@sastra.ncc', 'perm_test_manager@sastra.ncc')")
    cursor.execute("DELETE FROM permissions WHERE cadet_name IN ('PERM TEST CADET', 'PERM TEST MANAGER')")
    # Reset permission manager
    cursor.execute("UPDATE unit_config SET permission_manager_id = NULL WHERE id = 'singleton'")
    conn.commit()
    conn.close()
    
    if os.path.exists(dummy_file_path):
        os.remove(dummy_file_path)
        
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY! LEAVE PERMISSION FLOW IS FLAWLESS.")
    print("=" * 60)

if __name__ == "__main__":
    test_permissions_flow()
