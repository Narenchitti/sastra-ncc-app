import sys
import os
import asyncio
import datetime

# Configure standard streams to use utf-8 to prevent Windows terminal errors
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Ensure backend folder is in PATH
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.audit_service import get_syllabus_audit
from app.services.scheduler_agent import plan_training_schedule, load_syllabus, get_candidate_weekend_dates
from app.services.sqlite_db import save_unit_config, get_unit_config, get_connection

async def run_tests():
    print("--- Running AI Curriculum Planner & Audit Tests ---")
    
    # Clean up previously generated syllabus events to prevent database pollution
    from app.services.database import get_events, delete_event
    events = await get_events()
    for e in events:
        if e.title.startswith("Syllabus:"):
            await delete_event(e.id)
    
    # 1. Test Syllabus Progress Audit Service
    print("\n1. Testing Syllabus Progress Audit...")
    audit = await get_syllabus_audit()
    assert audit["success"] is True, "Audit service execution failed!"
    print(f"Overall Progress: {audit['overall']['completed']} completed out of {audit['overall']['total']} total")
    print("Category coverage:")
    for cat, data in audit["categories"].items():
        print(f"  - {cat}: {data['completed']}/{data['total']} ({data['percentage']}%)")
    assert "completed_lessons" in audit
    assert "remaining_lessons" in audit
    print("✅ Syllabus Progress Audit tests passed.")
    
    # 2. Test Sunday Date Calculations
    print("\n2. Testing Weekend Candidate Dates...")
    candidates = get_candidate_weekend_dates()
    print(f"Total weekend candidate dates calculated: {len(candidates)}")
    saturdays = [c for c in candidates if c["day_name"] == "Saturday"]
    sundays = [c for c in candidates if c["day_name"] == "Sunday"]
    print(f"  Saturdays: {len(saturdays)}, Sundays: {len(sundays)}")
    assert len(saturdays) in [4, 5], "Month should have 4 or 5 Saturdays!"
    assert len(sundays) in [4, 5], "Month should have 4 or 5 Sundays!"
    print("✅ Weekend Candidate Dates tests passed.")
    
    # 3. Test Unit Config updates (College Hours & Calendar)
    print("\n3. Testing Unit Config Settings...")
    test_config = {
        "college_start_time": "09:00",
        "college_end_time": "16:00",
        "academic_calendar": "Exam Week: July 12 to July 18. Independence Day Holiday: August 15."
    }
    await save_unit_config(test_config, "test_admin")
    
    config = await get_unit_config()
    print("Retrieved config settings:")
    print(f"  - Start: {config.get('college_start_time')}")
    print(f"  - End: {config.get('college_end_time')}")
    print(f"  - Calendar: {config.get('academic_calendar')}")
    
    assert config.get("college_start_time") == "09:00"
    assert config.get("college_end_time") == "16:00"
    assert "Exam Week" in config.get("academic_calendar")
    print("✅ Unit Config settings updates passed.")
    
    # 4. Test Planner Target Year and Sunday Overrides
    print("\n4. Testing Target Year & Sunday Overrides in Planner...")
    
    # Test 4.1: Sunday override
    print("\n4.1 Testing Sunday scheduling override query...")
    res_sunday = await plan_training_schedule("Plan training on Sundays focusing on map reading")
    assert res_sunday["success"] is True
    sunday_dates = [evt["date"] for evt in res_sunday["events"]]
    print(f"Proposed dates: {sunday_dates}")
    
    # Check if dates fall on Sundays
    for date_str in sunday_dates:
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        assert dt.weekday() == 6, f"Proposed date {date_str} is not a Sunday (weekday: {dt.weekday()})!"
    print("✅ Sunday scheduling override passed.")
    
    # Test 4.2: Target Year filtering
    print("\n4.2 Testing target year filtering query...")
    # WT-1 targets years [1, 2], WT-2 targets [2, 3]. DR-3 targets [1, 2].
    res_1st_year = await plan_training_schedule("Focus on 1st year weapon training and rifle characteristics")
    assert res_1st_year["success"] is True
    first_evt = res_1st_year["events"][0]
    print(f"Proposed 1st year event title: {first_evt['title']}")
    
    # Ensure title contains WT-1 or WT characteristics (WT-2 Aiming/Firing targets years 2,3, so it should select WT-1 Characteristics WT Deluxe Rifle)
    assert "Characteristics" in first_evt["title"] or "Stripping" in first_evt["title"], "1st year weapon training should schedule WT-1Characteristics!"
    print("✅ Target Year filtering passed.")
    
    # 5. Test Calendar Clash Detection
    print("\n5. Testing Calendar Date Clash Detection...")
    # Add a mock event on a future candidate date
    target_date = saturdays[0]["date"]
    print(f"Injecting mock clash event on {target_date}...")
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO events (id, title, date, start_time, end_time, location, type)
    VALUES ('mock-clash-evt', 'Annual Inspector General Parade', ?, '08:00', '12:00', 'Main Ground', 'Parade')
    """, (target_date,))
    conn.commit()
    conn.close()
    
    # Run planner
    res_clash = await plan_training_schedule("Plan monthly balanced training")
    assert res_clash["success"] is True
    clash_dates = [evt["date"] for evt in res_clash["events"]]
    print(f"Proposed dates: {clash_dates}")
    assert target_date not in clash_dates, f"Clash date {target_date} was scheduled when it should have been skipped!"
    print("✅ Calendar Date Clash Detection passed.")
    
    # Clean up mock event
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE id = 'mock-clash-evt'")
    conn.commit()
    conn.close()
    
    # Clean up syllabus events
    events = await get_events()
    for e in events:
        if e.title.startswith("Syllabus:"):
            await delete_event(e.id)
            
    print("\n🎉 All AI Curriculum Planner & Audit tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(run_tests())
