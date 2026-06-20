import json
import logging
from typing import Dict, Any, List
from . import database
from .scheduler_agent import load_syllabus

logger = logging.getLogger("app.audit_service")

async def get_syllabus_audit() -> Dict[str, Any]:
    """
    Audits the syllabus completion progress against all historical events.
    Returns categories breakdown, total progress, list of completed and remaining lessons.
    """
    syllabus = load_syllabus()
    try:
        db_events = await database.get_events()
    except Exception as e:
        logger.error(f"Failed to fetch events for syllabus audit: {e}")
        db_events = []

    # Map lesson title to lesson dict for easy lookup
    lesson_map = {l["title"]: l for l in syllabus}
    
    # Audit matches
    completed_lessons = []
    completed_titles = set()
    
    # Sort events by date descending so we find the most recent completion first
    sorted_events = sorted(db_events, key=lambda e: e.date, reverse=True)
    
    for event in sorted_events:
        title = event.title
        # Check if starts with "Syllabus: " or exactly matches a lesson title
        matched_title = None
        if title.startswith("Syllabus: "):
            candidate = title[len("Syllabus: "):].strip()
            if candidate in lesson_map:
                matched_title = candidate
        elif title in lesson_map:
            matched_title = title
            
        if matched_title and matched_title not in completed_titles:
            completed_titles.add(matched_title)
            lesson = lesson_map[matched_title].copy()
            lesson["completed_date"] = event.date
            completed_lessons.append(lesson)
            
    # Remaining lessons
    remaining_lessons = []
    for l in syllabus:
        if l["title"] not in completed_titles:
            remaining_lessons.append(l)
            
    # Compute stats per category
    categories = ["Drill", "Weapon Training", "Map Reading", "Field Craft", "Leadership"]
    stats = {}
    for cat in categories:
        cat_total = sum(1 for l in syllabus if l["category"] == cat)
        cat_completed = sum(1 for l in completed_lessons if l["category"] == cat)
        stats[cat] = {
            "completed": cat_completed,
            "total": cat_total,
            "percentage": int((cat_completed / cat_total) * 100) if cat_total > 0 else 0
        }
        
    total_total = len(syllabus)
    total_completed = len(completed_lessons)
    overall_percentage = int((total_completed / total_total) * 100) if total_total > 0 else 0
    
    return {
        "success": True,
        "overall": {
            "completed": total_completed,
            "total": total_total,
            "percentage": overall_percentage
        },
        "categories": stats,
        "completed_lessons": completed_lessons,
        "remaining_lessons": remaining_lessons
    }
