import sys
import os
import asyncio
import datetime

# Configure standard streams to use utf-8 to prevent Windows terminal errors
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Ensure backend folder is in PATH
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.scheduler_agent import plan_training_schedule, load_syllabus, get_next_month_weekends

async def run_tests():
    print("--- Running Training Scheduler Agent (Planning) Tests ---")
    
    # 1. Test syllabus loading
    print("\n1. Testing syllabus.json curriculum registry loading...")
    syllabus = load_syllabus()
    print(f"Total syllabus lessons loaded: {len(syllabus)}")
    assert len(syllabus) > 0, "Syllabus should not be empty!"
    print("Sample lesson categories:", list(set(l["category"] for l in syllabus)))
    
    # 2. Test date calculation
    print("\n2. Testing next month weekend date calculation...")
    weekends = get_next_month_weekends()
    print(f"Calculated next month's Saturdays: {weekends}")
    assert len(weekends) in [4, 5], "Month should have 4 or 5 Saturdays!"
    for date_str in weekends:
        d = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        assert d.weekday() == 5, f"Date {date_str} is not a Saturday!"
    print("✅ Date verification passed (All dates are future Saturdays).")
    
    # 3. Test planning agent fallbacks
    print("\n3. Testing planning agent schedule generation...")
    queries = [
        "Focus on weapon training and rifle theory",
        "Plan a strict drill & sizing routine",
        "Balanced training monthly calendar"
    ]
    
    for q in queries:
        print(f"\nQuery: '{q}'")
        res = await plan_training_schedule(q)
        assert res["success"] is True, "Planner execution failed!"
        print(f"Explanation: {res['explanation']}")
        print(f"Events planned: {len(res['events'])}")
        assert len(res["events"]) == len(weekends), "Should plan exactly one event per weekend!"
        
        # Verify event schema
        first_evt = res["events"][0]
        print("Sample proposed event schema:")
        print(f"  - Title: {first_evt.get('title')}")
        print(f"  - Date: {first_evt.get('date')}")
        print(f"  - Time: {first_evt.get('start_time')} - {first_evt.get('end_time')}")
        print(f"  - Location: {first_evt.get('location')}")
        print(f"  - Type: {first_evt.get('type')}")
        print(f"  - Equipment: {first_evt.get('equipment')}")
        
        assert "title" in first_evt
        assert "date" in first_evt
        assert "location" in first_evt
        assert "type" in first_evt
        assert "equipment" in first_evt
        
    # 4. Test database bulk saving logic
    print("\n4. Testing SQLite database bulk insertion...")
    from app.services.database import save_event, get_events
    from app.schemas.models import EventBase
    import uuid
    
    proposed_evts = res["events"]
    original_count = len(await get_events())
    
    print(f"Original calendar event count: {original_count}")
    
    for pe in proposed_evts:
        pe_copy = pe.copy()
        pe_copy["id"] = str(uuid.uuid4())
        await save_event(EventBase(**pe_copy))
        
    new_count = len(await get_events())
    print(f"New calendar event count: {new_count}")
    assert new_count == original_count + len(proposed_evts), "Bulk save failed to insert all events!"
    print("✅ Database bulk save test passed.")
        
    print("\n✅ All Scheduler Agent verification tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(run_tests())
