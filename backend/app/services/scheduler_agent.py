import os
import json
import logging
import datetime
import httpx
from typing import Dict, Any, List
from . import database

logger = logging.getLogger("app.scheduler_agent")

def parse_gemini_json(raw_text: str) -> Any:
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_text = "\n".join(lines).strip()
    
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        start_idx = raw_text.find("{")
        end_idx = raw_text.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            try:
                return json.loads(raw_text[start_idx:end_idx+1])
            except json.JSONDecodeError:
                pass
        raise

SYLLABUS_PATH = os.path.join(os.path.dirname(__file__), "..", "core", "syllabus.json")

def load_syllabus() -> List[Dict[str, Any]]:
    try:
        with open(SYLLABUS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load syllabus: {e}")
        return []

def get_next_month_weekends() -> List[str]:
    """Calculates all Saturdays of next calendar month."""
    today = datetime.date.today()
    if today.month == 12:
        next_month = 1
        year = today.year + 1
    else:
        next_month = today.month + 1
        year = today.year
        
    dates = []
    d = datetime.date(year, next_month, 1)
    # Move to first Saturday
    while d.weekday() != 5: # Saturday is index 5
        d += datetime.timedelta(days=1)
    while d.month == next_month:
        dates.append(d.strftime("%Y-%m-%d"))
        d += datetime.timedelta(days=7)
    return dates

def get_candidate_weekend_dates() -> List[Dict[str, Any]]:
    """Calculates all Saturdays and Sundays of next calendar month."""
    today = datetime.date.today()
    if today.month == 12:
        next_month = 1
        year = today.year + 1
    else:
        next_month = today.month + 1
        year = today.year
        
    dates = []
    d = datetime.date(year, next_month, 1)
    while d.month == next_month:
        if d.weekday() in [5, 6]:  # Saturday (5) or Sunday (6)
            dates.append({
                "date": d.strftime("%Y-%m-%d"),
                "day_name": "Saturday" if d.weekday() == 5 else "Sunday"
            })
        d += datetime.timedelta(days=1)
    return dates

async def plan_training_schedule(query_text: str) -> Dict[str, Any]:
    syllabus = load_syllabus()
    
    # Fetch recent events history
    try:
        db_events = await database.get_events()
        # Sort by date descending
        db_events.sort(key=lambda e: e.date, reverse=True)
        history = [e.title for e in db_events[:30]]
    except Exception as e:
        logger.error(f"Error fetching event history: {e}")
        db_events = []
        history = []
        
    weekends = get_next_month_weekends()
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Parse target cadet year from query
    query_lower = query_text.lower()
    target_year = None
    if "1st year" in query_lower or "first year" in query_lower or "year 1" in query_lower:
        target_year = 1
    elif "2nd year" in query_lower or "second year" in query_lower or "year 2" in query_lower:
        target_year = 2
    elif "3rd year" in query_lower or "third year" in query_lower or "year 3" in query_lower:
        target_year = 3
        
    filtered_syllabus = syllabus
    if target_year:
        filtered_syllabus = [l for l in syllabus if target_year in l.get("target_year", [])]
    if not filtered_syllabus:
        filtered_syllabus = syllabus
        
    # Analyze candidate weekend dates for clashes
    candidate_dates = get_candidate_weekend_dates()
    date_clashes = {}
    for evt in db_events:
        date_clashes[evt.date] = evt.title
        
    dates_with_status = []
    for cd in candidate_dates:
        date_str = cd["date"]
        clash_event = date_clashes.get(date_str)
        cd_copy = cd.copy()
        if clash_event:
            cd_copy["status"] = f"CLASH: {clash_event}"
        else:
            cd_copy["status"] = "FREE"
        dates_with_status.append(cd_copy)
    
    # ── Simulated Fallback Logic ──────────────────────────────────────────
    if not api_key:
        logger.info("GEMINI_API_KEY not found. Performing simulated planning logic.")
        
        # Determine day preference: default to Saturday, override to Sunday if requested
        prefer_sunday = "sunday" in query_lower
        
        # Group candidate dates by calendar week to ensure one event per week
        weeks = {}
        for d in dates_with_status:
            if "CLASH" not in d["status"]:
                if prefer_sunday and d["day_name"] != "Sunday":
                    continue
                is_preferred = (d["day_name"] == "Sunday" if prefer_sunday else d["day_name"] == "Saturday")
                dt = datetime.datetime.strptime(d["date"], "%Y-%m-%d").date()
                week_number = dt.isocalendar()[1]
                if week_number not in weeks or is_preferred:
                    weeks[week_number] = d["date"]
                    
        target_count = len(weeks)
        selected_dates = sorted(list(weeks.values()))
        
        # If still less than target_count, fill from any free weekend date
        if len(selected_dates) < target_count:
            all_free = [
                d["date"] for d in dates_with_status
                if "CLASH" not in d["status"] and (d["day_name"] == "Sunday" if prefer_sunday else True)
            ]
            for fd in all_free:
                if fd not in selected_dates:
                    selected_dates.append(fd)
            selected_dates = sorted(selected_dates)[:target_count]
            
        # Pick topics based on focus keyword or default to balanced rotation
        focus_categories = []
        if "weapon" in query_lower or "rifle" in query_lower:
            focus_categories.append("Weapon Training")
        if "drill" in query_lower:
            focus_categories.append("Drill")
        if "map" in query_lower or "compass" in query_lower:
            focus_categories.append("Map Reading")
        if "field" in query_lower or "camouflage" in query_lower:
            focus_categories.append("Field Craft")
        if "leader" in query_lower:
            focus_categories.append("Leadership")
            
        selected_lessons = []
        for cat in focus_categories:
            lessons = [l for l in filtered_syllabus if l["category"] == cat]
            for l in lessons:
                if l["title"] not in history:
                    selected_lessons.append(l)
                    break
            else:
                if lessons:
                    selected_lessons.append(lessons[0])
                    
        # Fill remaining slots with balanced lessons
        all_categories = ["Drill", "Weapon Training", "Map Reading", "Field Craft", "Leadership"]
        cat_idx = 0
        while len(selected_lessons) < len(selected_dates) and cat_idx < len(all_categories):
            cat = all_categories[cat_idx]
            if cat not in focus_categories:
                lessons = [l for l in filtered_syllabus if l["category"] == cat]
                for l in lessons:
                    if l["title"] not in history and l not in selected_lessons:
                        selected_lessons.append(l)
                        break
            cat_idx += 1
            
        while len(selected_lessons) < len(selected_dates):
            selected_lessons.append(filtered_syllabus[len(selected_lessons) % len(filtered_syllabus)])
            
        # Generate proposed events list
        events = []
        for i, date_str in enumerate(selected_dates):
            lesson = selected_lessons[i]
            
            # Formulate location and type
            location = "Parade Ground"
            event_type = "Parade"
            if lesson["category"] == "Weapon Training":
                location = "Rifle Range"
                event_type = "Theory"
            elif lesson["category"] == "Map Reading":
                location = "NCC Classrooms"
                event_type = "Theory"
            elif lesson["category"] == "Field Craft":
                location = "SASTRA Grasslands"
                event_type = "Parade"
            elif lesson["category"] == "Leadership":
                location = "Auditorium"
                event_type = "Event"
                
            events.append({
                "title": f"Syllabus: {lesson['title']}",
                "date": date_str,
                "start_time": "08:00",
                "end_time": "11:00",
                "location": location,
                "type": event_type,
                "equipment": lesson["equipment"]
            })
            
        year_str = f" for {target_year} Year cadets" if target_year else ""
        focus_desc = ", ".join(focus_categories) if focus_categories else "balanced curriculum"
        explanation = f"📋 Automated planning agent compiled a {len(events)}-event schedule{year_str} for next month. The plan focuses on a {focus_desc}, avoiding repeating recently scheduled unit events."
        
        return {
            "success": True,
            "explanation": explanation,
            "events": events
        }
        
    # ── Gemini 1.5 Flash Live Planner ────────────────────────────────────
    try:
        config = await database.get_unit_config()
        college_start = config.get("college_start_time", "08:45")
        college_end = config.get("college_end_time", "17:15")
        academic_cal = config.get("academic_calendar") or "None"
        
        system_prompt = f"""
You are the Training Planner Agent for the SASTRA NCC Unit.
Your task is to plan a 4-week training calendar schedule for next month using the provided candidate weekend dates: {json.dumps(dates_with_status)}.

Sastra University Constraints:
- College Working Hours: {college_start} to {college_end}.
- Academic Calendar / Holiday Info: {academic_cal}.
- DO NOT schedule any training events during regular college hours on weekdays or working days listed in the academic calendar.
- Weekday events (if any) must be scheduled outside college hours (e.g., early morning 06:00-08:00 or evening 17:30-19:30).
- Weekend (Saturday/Sunday) events can be scheduled during the day (e.g., 08:00 to 11:00).
- By default, schedule events on Saturdays. If the user query explicitly requests Sundays, use Sundays.
- Avoid dates marked as "CLASH: [Event Title]".

Guidelines:
1. Match the user's natural language scheduling request (including any target year or topic focus).
2. Cross-reference the official NCC syllabus lessons (filtered for the target cadet batch):
{json.dumps(filtered_syllabus, indent=2)}
3. Do NOT repeat topics that have already been covered recently (avoid titles in this history):
{json.dumps(history)}
4. Each scheduled event MUST specify:
   - `title`: Starts with "Syllabus: " followed by the lesson title.
   - `date`: One of the free candidate weekend dates (format: YYYY-MM-DD).
   - `start_time` (e.g. "08:00") and `end_time` (e.g. "11:00").
   - `location`: Pick matching location (e.g., 'Parade Ground', 'NCC Classrooms', 'Rifle Range', 'SASTRA Grasslands').
   - `type`: One of 'Parade', 'Theory', 'Camp', 'Event'.
   - `equipment`: A list of strings matching the required syllabus gear.

Respond with a JSON object containing 'explanation' (why this plan fits syllabus goals and respects Sastra constraints) and 'events' (list of 4 scheduled events).
"""
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": system_prompt},
                        {"text": f"Request: {query_text}"}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "explanation": {"type": "STRING"},
                        "events": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "title": {"type": "STRING"},
                                    "date": {"type": "STRING"},
                                    "start_time": {"type": "STRING"},
                                    "end_time": {"type": "STRING"},
                                    "location": {"type": "STRING"},
                                    "type": {"type": "STRING"},
                                    "equipment": {
                                        "type": "ARRAY",
                                        "items": {"type": "STRING"}
                                    }
                                },
                                "required": ["title", "date", "start_time", "end_time", "location", "type", "equipment"]
                            }
                        }
                    },
                    "required": ["explanation", "events"]
                }
            }
        }
        
        from .telemetry import TelemetrySpan

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            with TelemetrySpan("ai", "Gemini Training Schedule Planner"):
                res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise ValueError(f"Gemini API returned status {res.status_code}: {res.text}")
                
            plan_res = res.json()
            plan_data = parse_gemini_json(plan_res["candidates"][0]["content"]["parts"][0]["text"])
            
            return {
                "success": True,
                "explanation": plan_data["explanation"],
                "events": plan_data["events"]
            }
            
    except Exception as e:
        logger.error(f"Planning Agent execution failed: {e}")
        return {
            "success": False,
            "explanation": f"⚠️ Planning Agent Error: {str(e)}",
            "events": []
        }
