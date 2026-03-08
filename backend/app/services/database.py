from ..core.supabase import supabase
from ..schemas.models import UserBase, EventBase, PermissionBase, AchievementBase, AttendanceBase
from typing import List

async def get_users() -> List[UserBase]:
    response = supabase.table("users").select("*").execute()
    return [UserBase(**u) for u in response.data]

async def save_user(user: UserBase):
    payload = user.dict()
    # Supabase uses snake_case for columns usually, but Pydantic uses snake_case too
    # Assuming original field names match in DB or mapping is needed:
    # regimental_number, batch_year, dob, camp_count
    supabase.table("users").upsert(payload, on_conflict="id").execute()

async def get_events() -> List[EventBase]:
    response = supabase.table("events").select("*").execute()
    return [EventBase(**e) for e in response.data]

async def save_event(event: EventBase):
    supabase.table("events").upsert(event.dict(), on_conflict="id").execute()

async def get_permissions() -> List[PermissionBase]:
    response = supabase.table("permissions").select("*").order("created_at", descending=True).execute()
    return [PermissionBase(**p) for p in response.data]

async def save_permission(perm: PermissionBase):
    supabase.table("permissions").upsert(perm.dict(), on_conflict="id").execute()

async def get_achievements() -> List[AchievementBase]:
    response = supabase.table("achievements").select("*").execute()
    return [AchievementBase(**a) for a in response.data]

async def save_achievement(ach: AchievementBase):
    supabase.table("achievements").upsert(ach.dict(), on_conflict="id").execute()

async def get_attendance() -> List[AttendanceBase]:
    response = supabase.table("attendance").select("*").execute()
    return [AttendanceBase(**a) for a in response.data]

async def mark_attendance(att: AttendanceBase):
    supabase.table("attendance").upsert(att.dict(), on_conflict="event_id, user_id").execute()
