# Verification Script: Attendance & Camp Count Auto-Increment
import sys
import os
import asyncio
import uuid

# Configure standard streams to use UTF-8
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Ensure backend folder is in PATH
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services import database
from app.schemas.models import UserBase, EventBase
from app.api.endpoints import submit_bulk_attendance

async def run_tests():
    print("--- Running Attendance & Camp Count Verification Tests ---")

    # 1. Create a test cadet
    cadet_id = str(uuid.uuid4())
    cadet_email = f"test.cadet.{uuid.uuid4().hex[:6]}@sastra.ncc"
    cadet = UserBase(
        id=cadet_id,
        name="Test Cadet Attendance",
        email=cadet_email,
        password="hashedpassword123",
        rank="Cadet",
        role="cadet",
        batch_year=5,
        regimental_number="TN2023SDA999999",
        registration_number="999999",
        dob="01-01-2005",
        year_branch="III Year B.Tech",
        hostel_info="Vinaya Block",
        camp_count=0,
        status="APPROVED"
    )
    
    print(f"Creating test cadet: {cadet.name} (ID: {cadet_id})")
    await database.save_user(cadet)

    # 2. Create a test Camp event
    camp_id = str(uuid.uuid4())
    camp_event = EventBase(
        id=camp_id,
        title="Test Annual Training Camp",
        date="2026-07-10",
        start_time="06:00",
        end_time="18:00",
        location="Camp Site",
        type="Camp"
    )
    
    print(f"Creating test Camp event: {camp_event.title} (ID: {camp_id})")
    await database.save_event(camp_event)

    # 3. Mark cadet as Present for the Camp event
    print("\nMarking cadet as Present...")
    bulk_data = {
        "eventId": camp_id,
        "markedBy": "Capt. ANO Officer",
        "records": [
            {"userId": cadet_id, "status": "Present"}
        ]
    }
    
    # Run the bulk attendance endpoint function directly
    # Mock current_user as ANO
    mock_ano = {"sub": "ano-id", "role": "ANO", "rank": "Captain"}
    res = await submit_bulk_attendance(bulk_data, current_user=mock_ano)
    assert res["success"] is True, "Bulk attendance submission failed!"

    # 4. Verify camp_count incremented to 1
    users = await database.get_users()
    updated_cadet = next((u for u in users if u.id == cadet_id), None)
    assert updated_cadet is not None, "Test cadet not found after marking!"
    print(f"Updated cadet camp count: {updated_cadet.camp_count}")
    assert updated_cadet.camp_count == 1, f"Expected camp count 1, got {updated_cadet.camp_count}"
    print("✅ Camp count increment verified successfully.")

    # 5. Mark cadet as Absent for the Camp event
    print("\nMarking cadet as Absent (unmarking)...")
    bulk_data_absent = {
        "eventId": camp_id,
        "markedBy": "Capt. ANO Officer",
        "records": [
            {"userId": cadet_id, "status": "Absent"}
        ]
    }
    res_absent = await submit_bulk_attendance(bulk_data_absent, current_user=mock_ano)
    assert res_absent["success"] is True, "Bulk attendance update failed!"

    # 6. Verify camp_count decremented back to 0
    users = await database.get_users()
    updated_cadet_absent = next((u for u in users if u.id == cadet_id), None)
    print(f"Updated cadet camp count: {updated_cadet_absent.camp_count}")
    assert updated_cadet_absent.camp_count == 0, f"Expected camp count 0, got {updated_cadet_absent.camp_count}"
    print("✅ Camp count decrement verified successfully.")

    # 7. Cleanup
    print("\nCleaning up test data...")
    # SQLite fallback deletes or manual cleanup
    await database.delete_event(camp_id)
    # We don't have a direct delete_user function in database.py, but deleting event is enough
    # and we can leave the test user or ignore it for local sqlite
    print("✅ Cleanup complete.")
    print("🎉 All Attendance and Camp Count tests passed!")

if __name__ == "__main__":
    asyncio.run(run_tests())
