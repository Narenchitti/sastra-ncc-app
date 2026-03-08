from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from ..services import database, news
from ..schemas.models import UserBase, EventBase, PermissionBase, AchievementBase, AttendanceBase, APIModel

class DashboardResponse(APIModel):
    events: List[EventBase]
    permissions: List[PermissionBase]
    achievements: List[AchievementBase]
    attendance: List[AttendanceBase]
    users: List[UserBase]

class LoginResponse(APIModel):
    success: bool
    user: UserBase

router = APIRouter()

@router.post("/auth/login", response_model=LoginResponse)
async def login(data: Dict[str, str]):
    email = data.get("email")
    password = data.get("password")
    users = await database.get_users()
    user = next((u for u in users if u.email == email and u.password == password), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Credentials")
    return {"success": True, "user": user}

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_data():
    events = await database.get_events()
    permissions = await database.get_permissions()
    achievements = await database.get_achievements()
    attendance = await database.get_attendance()
    users = await database.get_users()
    return {
        "events": events,
        "permissions": permissions,
        "achievements": achievements,
        "attendance": attendance,
        "users": users
    }

@router.get("/news")
async def get_news():
    items = await news.get_army_news()
    return items

@router.get("/events", response_model=List[EventBase])
async def get_events():
    return await database.get_events()

@router.post("/events")
async def save_event(event: EventBase):
    await database.save_event(event)
    return {"success": True}

@router.get("/permissions", response_model=List[PermissionBase])
async def get_permissions():
    return await database.get_permissions()

@router.post("/permissions")
async def save_permission(perm: PermissionBase):
    await database.save_permission(perm)
    return {"success": True}

@router.get("/achievements", response_model=List[AchievementBase])
async def get_achievements():
    return await database.get_achievements()

@router.post("/achievements")
async def save_achievement(ach: AchievementBase):
    await database.save_achievement(ach)
    return {"success": True}

@router.post("/attendance/bulk")
async def submit_bulk_attendance(data: Dict[str, Any]):
    event_id = data.get("eventId")
    records = data.get("records")
    marked_by = data.get("markedBy")
    
    for r in records:
        att = AttendanceBase(
            event_id=event_id,
            user_id=r["userId"],
            status=r["status"],
            marked_by=marked_by
        )
        await database.mark_attendance(att)
    return {"success": True}
