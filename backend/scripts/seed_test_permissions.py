import sys
import os
import asyncio
import bcrypt
import uuid

# Ensure backend folder is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.models import UserBase, PermissionBase
from app.services import database

async def seed_test_permissions():
    print("--- SEEDING TEST LEAVE PERMISSIONS DATA ---")
    
    # 1. Setup Password hashing helper
    password_hash = bcrypt.hashpw(b"12345678", bcrypt.gensalt()).decode("utf-8")
    
    # 2. Seed Test Cadet: Rahul Kumar
    cadet_id = "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1"
    cadet = UserBase(
        id=cadet_id,
        name="Rahul Kumar",
        email="rahul.127003001@sastra.ncc",
        password=password_hash,
        rank="Cadet",
        role="cadet",
        batch_year=5,
        regimental_number="TN2026SDA023601",
        registration_number="127003001",
        dob="2005-09-15",
        year_branch="III Year, B.Tech. CSE",
        hostel_info="Vinaya Block-1, Room 104",
        camp_count=0,
        status="APPROVED"
    )
    print("Saving test cadet (Rahul Kumar)...")
    await database.save_user(cadet)
    
    # 3. Seed Test Permission Manager: SUO Aditya Vardhan
    manager_id = "b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2"
    manager = UserBase(
        id=manager_id,
        name="Aditya Vardhan",
        email="aditya.127003002@sastra.ncc",
        password=password_hash,
        rank="SUO",
        role="cadet",
        batch_year=5,
        regimental_number="TN2026SDA023602",
        registration_number="127003002",
        dob="2005-10-15",
        year_branch="III Year, B.Tech. ECE",
        hostel_info="Vinaya Block-2, Room 302",
        camp_count=1,
        status="APPROVED"
    )
    print("Saving test Permission Manager SUO (Aditya Vardhan)...")
    await database.save_user(manager)
    
    # 4. Set Aditya Vardhan as the designated Permission Manager
    print("Designating Aditya Vardhan as the Permission Manager...")
    await database.set_permission_manager(manager_id, "6ced2391-0526-446a-bf3f-32565eb09a0d")
    
    # Create static uploads directory and placeholder files for evidence URL references
    os.makedirs("static/uploads", exist_ok=True)
    placeholders = [
        "sample_medical_certificate.pdf",
        "sample_exam_timetable.pdf",
        "hotel_booking.pdf"
    ]
    for filename in placeholders:
        filepath = os.path.join("static/uploads", filename)
        with open(filepath, "w") as f:
            f.write(f"Sample dummy evidence content for {filename}\n")
            
    # 5. Seed Leave Request 1: PENDING_REVIEW (Rahul Kumar)
    req1 = PermissionBase(
        id="c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3",
        cadet_id=cadet_id,
        cadet_name="Rahul Kumar",
        start_date="2026-07-01",
        end_date="2026-07-05",
        reason="Severe throat infection and high fever. Advised bed rest by doctor.",
        evidence_url="http://127.0.0.1:8000/static/uploads/sample_medical_certificate.pdf",
        status="PENDING_REVIEW",
        suo_comment=None,
        ano_comment=None,
        ai_status="VERIFIED",
        ai_remarks="🟢 AI Review (Simulated): Medical document detected. Dates appear to cover the requested leave period.",
        created_at="2026-06-20T10:00:00Z"
    )
    print("Seeding permission request 1 (PENDING_REVIEW)...")
    await database.save_permission(req1)
    
    # 6. Seed Leave Request 2: FORWARDED_TO_ANO (Rahul Kumar)
    req2 = PermissionBase(
        id="d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4",
        cadet_id=cadet_id,
        cadet_name="Rahul Kumar",
        start_date="2026-07-12",
        end_date="2026-07-14",
        reason="Semester laboratory practical examination clashing with weekend camp parade.",
        evidence_url="http://127.0.0.1:8000/static/uploads/sample_exam_timetable.pdf",
        status="FORWARDED_TO_ANO",
        suo_comment="Verified date sheets. Recommended for duty leave.",
        ano_comment=None,
        ai_status="VERIFIED",
        ai_remarks="🟢 AI Review (Simulated): Academic letter/timetable detected. Verified relevant request period.",
        created_at="2026-06-20T11:00:00Z"
    )
    print("Seeding permission request 2 (FORWARDED_TO_ANO)...")
    await database.save_permission(req2)
    
    # 7. Seed Leave Request 3: REJECTED_BY_SUO (Rahul Kumar)
    req3 = PermissionBase(
        id="e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5",
        cadet_id=cadet_id,
        cadet_name="Rahul Kumar",
        start_date="2026-07-20",
        end_date="2026-07-22",
        reason="Family outstation tour scheduled.",
        evidence_url="http://127.0.0.1:8000/static/uploads/hotel_booking.pdf",
        status="REJECTED_BY_SUO",
        suo_comment="Personal family trips/tours are not valid exemptions from unit training.",
        ano_comment=None,
        ai_status="FLAGGED",
        ai_remarks="⚠️ AI Review (Simulated): Document uploaded is a hotel booking confirmation, not an official leave request or medical certificate.",
        created_at="2026-06-20T12:00:00Z"
    )
    print("Seeding permission request 3 (REJECTED_BY_SUO)...")
    await database.save_permission(req3)
    
    print("\n" + "=" * 50)
    print("TEST PERMISSIONS SEEDED SUCCESSFULLY!")
    print("Credentials:")
    print("- Cadet: rahul.127003001@sastra.ncc (pwd: 12345678)")
    print("- Permission Manager (SUO): aditya.127003002@sastra.ncc (pwd: 12345678)")
    print("- ANO Officer: ano@sastra.ncc (pwd: 12345678)")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(seed_test_permissions())
