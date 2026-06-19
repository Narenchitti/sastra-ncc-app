import os
import json
import logging
import datetime
import httpx
from typing import Dict, Any, List
from . import database

logger = logging.getLogger("app.scheduler_agent")

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
        history = []
        
    weekends = get_next_month_weekends()
    
    api_key = os.getenv("GEMINI_API_KEY")
    
    # ── Simulated Fallback Logic ──────────────────────────────────────────
    if not api_key:
        logger.info("GEMINI_API_KEY not found. Performing simulated planning logic.")
        query_lower = query_text.lower()
        
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
            
        # Select matching lessons
        selected_lessons = []
        for cat in focus_categories:
            lessons = [l for l in syllabus if l["category"] == cat]
            # Avoid repeating recently taught lessons if possible
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
        while len(selected_lessons) < len(weekends) and cat_idx < len(all_categories):
            cat = all_categories[cat_idx]
            if cat not in focus_categories:
                lessons = [l for l in syllabus if l["category"] == cat]
                for l in lessons:
                    if l["title"] not in history and l not in selected_lessons:
                        selected_lessons.append(l)
                        break
            cat_idx += 1
            
        # Hard fallback to first 4 lessons if still underfilled
        while len(selected_lessons) < len(weekends):
            selected_lessons.append(syllabus[len(selected_lessons) % len(syllabus)])
            
        # Generate proposed events list
        events = []
        for i, date_str in enumerate(weekends):
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
            
        focus_desc = ", ".join(focus_categories) if focus_categories else "balanced curriculum"
        explanation = f"📋 Automated planning agent compiled a 4-week schedule for next month. The plan focuses on a {focus_desc}, avoiding repeating the {len(history)} recently scheduled unit events."
        
        return {
            "success": True,
            "explanation": explanation,
            "events": events
        }
        
    # ── Gemini 1.5 Flash Live Planner ────────────────────────────────────
    try:
        system_prompt = f"""
You are the Training Planner Agent for the SASTRA NCC Unit.
Your task is to plan a 4-week weekend parade schedule for next month (using specific Saturday dates: {json.dumps(weekends)}).

Guidelines:
1. Match the user's natural language scheduling request.
2. Cross-reference the official NCC syllabus lessons:
{json.dumps(syllabus, indent=2)}
3. Do NOT repeat topics that have already been covered recently (avoid titles in this history):
{json.dumps(history)}
4. Each scheduled event MUST specify:
   - `title`: Starts with "Syllabus: " followed by the lesson title.
   - `date`: One of the pre-defined Saturday dates: {json.dumps(weekends)}.
   - `start_time` (e.g. "08:00") and `end_time` (e.g. "11:00").
   - `location`: Pick matching location (e.g., 'Parade Ground', 'NCC Classrooms', 'Rifle Range', 'SASTRA Grasslands').
   - `type`: One of 'Parade', 'Theory', 'Camp', 'Event'.
   - `equipment`: A list of strings matching the required syllabus gear.

Respond with a JSON object containing 'explanation' (why this plan fits syllabus goals) and 'events' (list of 4 scheduled events).
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

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            with TelemetrySpan("ai", "Gemini Training Schedule Planner"):
                res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise ValueError(f"Gemini API returned status {res.status_code}: {res.text}")
                
            plan_res = res.json()
            plan_data = json.loads(plan_res["candidates"][0]["content"]["parts"][0]["text"])
            
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
