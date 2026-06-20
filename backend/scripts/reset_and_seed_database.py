import sys
import os
import asyncio
import bcrypt
import logging
import uuid

# Ensure backend folder is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reset_and_seed")

from app.schemas.models import UserBase, EventBase, PermissionBase, AchievementBase, AttendanceBase
from app.services import database, sqlite_db
from app.core.supabase import supabase

async def clear_supabase():
    logger.info("Clearing Supabase tables...")
    try:
        # Delete from Supabase in order of foreign key constraints
        # Using a delete filter that matches all rows (neq id to a dummy UUID)
        dummy_uuid = "00000000-0000-0000-0000-000000000000"
        
        # 1. Attendance (composite key)
        logger.info("Clearing Supabase attendance...")
        await asyncio.to_thread(lambda: supabase.table("attendance").delete().neq("status", "dummy_status").execute())
        
        # 2. Permissions
        logger.info("Clearing Supabase permissions...")
        await asyncio.to_thread(lambda: supabase.table("permissions").delete().neq("id", dummy_uuid).execute())
        
        # 3. Achievements
        logger.info("Clearing Supabase achievements...")
        await asyncio.to_thread(lambda: supabase.table("achievements").delete().neq("id", dummy_uuid).execute())
        
        # 4. Unit Config
        logger.info("Clearing Supabase unit_config...")
        await asyncio.to_thread(lambda: supabase.table("unit_config").delete().neq("id", "dummy").execute())
        
        # 5. Events
        logger.info("Clearing Supabase events...")
        await asyncio.to_thread(lambda: supabase.table("events").delete().neq("id", dummy_uuid).execute())
        
        # 6. Users
        logger.info("Clearing Supabase users...")
        await asyncio.to_thread(lambda: supabase.table("users").delete().neq("id", dummy_uuid).execute())
        
        # 7. Inquiries
        logger.info("Clearing Supabase inquiries...")
        try:
            await asyncio.to_thread(lambda: supabase.table("inquiries").delete().neq("id", dummy_uuid).execute())
        except Exception as e:
            logger.info(f"Skipping inquiries table (might not exist in Supabase schema yet): {e}")
        
        logger.info("Supabase tables cleared successfully.")
    except Exception as e:
        logger.warning(f"Failed to clear Supabase (probably RLS or connection offline): {e}")

async def clear_sqlite():
    logger.info("Clearing SQLite tables...")
    try:
        conn = sqlite_db.get_connection()
        cursor = conn.cursor()
        
        tables = ["attendance", "permissions", "achievements", "unit_config", "events", "users", "inquiries"]
        for table in tables:
            logger.info(f"Clearing SQLite table: {table}")
            cursor.execute(f"DELETE FROM {table}")
            
        conn.commit()
        conn.close()
        logger.info("SQLite tables cleared successfully.")
    except Exception as e:
        logger.error(f"Failed to clear SQLite tables: {e}")

async def seed_data():
    logger.info("Starting database seeding...")
    
    # Common hashed password
    hashed_pwd = bcrypt.hashpw(b"12345678", bcrypt.gensalt()).decode("utf-8")
    
    # ── 1. Create the 4 Requested Accounts (with valid hex UUIDs) ──
    
    # ANO Officer (Naren Chittibabu)
    # Using 'a' prefix to distinguish ANO, followed by valid hex 0s
    ano_id = "a0000000-0000-0000-0000-000000000000"
    ano_user = UserBase(
        id=ano_id,
        name="Capt. Naren Chittibabu",
        email="ano@sastra.ncc",
        password=hashed_pwd,
        rank="Captain",
        role="ANO",
        batch_year=0,
        regimental_number="TN2023SDA011267",
        registration_number="127018037",
        dob="1980-01-01",
        year_branch="Faculty, ANO",
        hostel_info="Staff Quarters",
        camp_count=0,
        status="APPROVED"
    )
    
    # SUO (Permission Manager)
    # Using 'b' prefix
    suo_id = "b0000000-0000-0000-0000-000000000000"
    suo_user = UserBase(
        id=suo_id,
        name="SUO Aditya Vardhan",
        email="suo@sastra.ncc",
        password=hashed_pwd,
        rank="SUO",
        role="cadet",
        batch_year=5,
        regimental_number="TN2023SDA011268",
        registration_number="127018038",
        dob="2005-09-15",
        year_branch="III Year, B.Tech. CSE",
        hostel_info="Vinaya Block-2, Room 302",
        camp_count=1,
        status="APPROVED"
    )
    
    # Sergeant
    # Using 'c' prefix
    sergaent_id = "c0000000-0000-0000-0000-000000000000"
    sergaent_user = UserBase(
        id=sergaent_id,
        name="Sgt. Rahul Kumar",
        email="sergaent@sastra.ncc",
        password=hashed_pwd,
        rank="Sergeant",
        role="cadet",
        batch_year=5,
        regimental_number="TN2023SDA011269",
        registration_number="127018039",
        dob="2005-10-15",
        year_branch="III Year, B.Tech. ECE",
        hostel_info="Vinaya Block-1, Room 104",
        camp_count=0,
        status="APPROVED"
    )
    
    # Cadet
    # Using 'd' prefix
    cadet_id = "d0000000-0000-0000-0000-000000000000"
    cadet_user = UserBase(
        id=cadet_id,
        name="Cdt. Suresh Raina",
        email="cadet@sastra.ncc",
        password=hashed_pwd,
        rank="Cadet",
        role="cadet",
        batch_year=5,
        regimental_number="TN2023SDA011270",
        registration_number="127018040",
        dob="2005-11-15",
        year_branch="III Year, B.Tech. ME",
        hostel_info="Sastri Block, Room 205",
        camp_count=0,
        status="APPROVED"
    )
    
    # Save users
    logger.info("Saving seeded users...")
    await database.save_user(ano_user)
    await database.save_user(suo_user)
    await database.save_user(sergaent_user)
    await database.save_user(cadet_user)
    
    # Set SUO as the Permission Manager
    logger.info("Setting SUO as the Permission Manager...")
    await database.set_permission_manager(suo_id, ano_id)
    
    # ── 2. Create Events ──
    logger.info("Saving seeded events...")
    
    past_event_id = "e0000000-0000-0000-0000-000000000000"
    past_event = EventBase(
        id=past_event_id,
        title="Pre-Camp Briefing Parade",
        date="2026-06-15",
        start_time="07:00",
        end_time="09:00",
        location="Main Ground",
        type="Parade"
    )
    
    event1_id = "e1000000-0000-0000-0000-000000000000"
    event1 = EventBase(
        id=event1_id,
        title="Saturday Drill Parade",
        date="2026-07-04",
        start_time="07:00",
        end_time="09:30",
        location="Main Parade Ground, SASTRA",
        type="Parade"
    )
    
    event2_id = "e2000000-0000-0000-0000-000000000000"
    event2 = EventBase(
        id=event2_id,
        title="Theory Class - Map Reading",
        date="2026-07-11",
        start_time="10:00",
        end_time="12:00",
        location="Chanakya Block, Room 102",
        type="Theory"
    )
    
    await database.save_event(past_event)
    await database.save_event(event1)
    await database.save_event(event2)
    
    # ── 3. Seed Attendance for Past Event ──
    logger.info("Marking attendance register for past event...")
    att1 = AttendanceBase(event_id=past_event_id, user_id=cadet_id, status="Present", marked_by="Capt. Naren Chittibabu")
    att2 = AttendanceBase(event_id=past_event_id, user_id=sergaent_id, status="Present", marked_by="Capt. Naren Chittibabu")
    att3 = AttendanceBase(event_id=past_event_id, user_id=suo_id, status="Present", marked_by="Capt. Naren Chittibabu")
    
    await database.mark_attendance(att1)
    await database.mark_attendance(att2)
    await database.mark_attendance(att3)
    
    # ── 4. Seed Leave Permissions ──
    logger.info("Seeding leave permission requests...")
    
    # Create static uploads directory and placeholders
    os.makedirs("static/uploads", exist_ok=True)
    with open("static/uploads/sample_medical_certificate.pdf", "w") as f:
        f.write("Sample medical certificate placeholder content\n")
    with open("static/uploads/sample_sports_od.pdf", "w") as f:
        f.write("Sample sports OD placeholder content\n")
        
    req1 = PermissionBase(
        id="f1000000-0000-0000-0000-000000000000",
        cadet_id=cadet_id,
        cadet_name="Cdt. Suresh Raina",
        start_date="2026-07-04",
        end_date="2026-07-04",
        reason="Severe throat infection and high fever. Doctor advised bed rest.",
        evidence_url="http://127.0.0.1:8000/static/uploads/sample_medical_certificate.pdf",
        status="PENDING_REVIEW",
        suo_comment=None,
        ano_comment=None,
        ai_status="VERIFIED",
        ai_remarks="🟢 AI Review (Simulated): Medical document detected. Dates appear to cover the requested leave period.",
        created_at="2026-06-20T10:00:00Z"
    )
    
    req2 = PermissionBase(
        id="f2000000-0000-0000-0000-000000000000",
        cadet_id=sergaent_id,
        cadet_name="Sgt. Rahul Kumar",
        start_date="2026-07-11",
        end_date="2026-07-11",
        reason="Representing university in Inter-College Basketball tournament.",
        evidence_url="http://127.0.0.1:8000/static/uploads/sample_sports_od.pdf",
        status="FORWARDED_TO_ANO",
        suo_comment="Sports department letter verified. Recommended.",
        ano_comment=None,
        ai_status="VERIFIED",
        ai_remarks="🟢 AI Review (Simulated): Official letterhead detected. Dates and name align with request details.",
        created_at="2026-06-20T11:00:00Z"
    )
    
    await database.save_permission(req1)
    await database.save_permission(req2)
    
    # ── 5. Seed Achievements ──
    logger.info("Seeding achievements...")
    
    ach1 = AchievementBase(
        id="80000000-0000-0000-0000-000000000001",
        cadet_id=cadet_id,
        title="Best Cadet Award - CATC Camp",
        date="2026-05-10",
        category="Camp",
        location="Trichy NCC HQ",
        description="Awarded Best Cadet during the Combined Annual Training Camp.",
        certificate_url=None,
        status="DRAFT",
        is_verified=False,
        ano_comment=None
    )
    
    ach2 = AchievementBase(
        id="80000000-0000-0000-0000-000000000002",
        cadet_id=sergaent_id,
        title="Republic Day Camp Selection",
        date="2026-06-01",
        category="Other",
        location="NCC Directorate, Chennai",
        description="Selected for RDC training camp after multi-level drill selections.",
        certificate_url=None,
        status="PENDING",
        is_verified=False,
        ano_comment=None
    )
    
    await database.save_achievement(ach1)
    await database.save_achievement(ach2)
    
    logger.info("Seeding completed successfully.")

async def main():
    # Detect active mode and clean both databases
    await clear_supabase()
    await clear_sqlite()
    await seed_data()

if __name__ == "__main__":
    asyncio.run(main())
