import asyncio
import os
import logging
from ..core.supabase import supabase
from ..schemas.models import UserBase, EventBase, PermissionBase, AchievementBase, AttendanceBase, InquiryBase
from typing import List, Optional
from . import sqlite_db

logger = logging.getLogger("app.database")

# Config option to force local SQLite
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"

from .telemetry import TelemetrySpan

def _run(fn):
    """Wrap a synchronous supabase call so it runs in a thread pool,
    keeping the async event loop unblocked."""
    return asyncio.to_thread(fn)

async def _execute(supabase_fn, sqlite_fn):
    """Executes the supabase query. If it fails due to network/DNS, falls back to SQLite."""
    with TelemetrySpan("database", "Database Transaction"):
        if USE_SQLITE:
            return await sqlite_fn()
        try:
            # Test connection or directly execute
            return await supabase_fn()
        except Exception as e:
            # Fallback to local sqlite
            logger.warning(f"Supabase connection/operation failed: {e}. Falling back to local SQLite.")
            return await sqlite_fn()

# ── Users ──────────────────────────────────────────────────────────────────

async def get_users() -> List[UserBase]:
    async def _supa():
        response = await _run(lambda: supabase.table("users").select("*").execute())
        return [UserBase(**u) for u in response.data]
    return await _execute(_supa, sqlite_db.get_users)

async def get_user_by_email(email: str) -> Optional[UserBase]:
    async def _supa():
        response = await _run(lambda: supabase.table("users").select("*").eq("email", email).execute())
        if response.data:
            return UserBase(**response.data[0])
        return None
    return await _execute(_supa, lambda: sqlite_db.get_user_by_email(email))

async def save_user(user: UserBase):
    async def _supa():
        payload = user.model_dump()
        await _run(lambda: supabase.table("users").upsert(payload, on_conflict="id").execute())
    return await _execute(_supa, lambda: sqlite_db.save_user(user))


# ── Events ─────────────────────────────────────────────────────────────────

async def get_events() -> List[EventBase]:
    async def _supa():
        response = await _run(lambda: supabase.table("events").select("*").execute())
        return [EventBase(**e) for e in response.data]
    return await _execute(_supa, sqlite_db.get_events)

async def save_event(event: EventBase):
    async def _supa():
        await _run(lambda: supabase.table("events").upsert(event.model_dump(), on_conflict="id").execute())
    return await _execute(_supa, lambda: sqlite_db.save_event(event))

async def delete_event(event_id: str):
    async def _supa():
        await _run(lambda: supabase.table("events").delete().eq("id", event_id).execute())
    return await _execute(_supa, lambda: sqlite_db.delete_event(event_id))


# ── Permissions ────────────────────────────────────────────────────────────

async def get_permissions() -> List[PermissionBase]:
    async def _supa():
        response = await _run(
            lambda: supabase.table("permissions").select("*").order("created_at", desc=True).execute()
        )
        return [PermissionBase(**p) for p in response.data]
    return await _execute(_supa, sqlite_db.get_permissions)

async def save_permission(perm: PermissionBase):
    async def _supa():
        await _run(lambda: supabase.table("permissions").upsert(perm.model_dump(), on_conflict="id").execute())
    return await _execute(_supa, lambda: sqlite_db.save_permission(perm))

async def delete_permission(perm_id: str):
    async def _supa():
        await _run(lambda: supabase.table("permissions").delete().eq("id", perm_id).execute())
    return await _execute(_supa, lambda: sqlite_db.delete_permission(perm_id))


# ── Achievements ───────────────────────────────────────────────────────────

async def get_achievements() -> List[AchievementBase]:
    async def _supa():
        response = await _run(lambda: supabase.table("achievements").select("*").execute())
        return [AchievementBase(**a) for a in response.data]
    return await _execute(_supa, sqlite_db.get_achievements)

async def save_achievement(ach: AchievementBase):
    async def _supa():
        await _run(lambda: supabase.table("achievements").upsert(ach.model_dump(), on_conflict="id").execute())
    return await _execute(_supa, lambda: sqlite_db.save_achievement(ach))

async def delete_achievement(ach_id: str):
    async def _supa():
        await _run(lambda: supabase.table("achievements").delete().eq("id", ach_id).execute())
    return await _execute(_supa, lambda: sqlite_db.delete_achievement(ach_id))


# ── Attendance ─────────────────────────────────────────────────────────────

async def get_attendance() -> List[AttendanceBase]:
    async def _supa():
        response = await _run(lambda: supabase.table("attendance").select("*").execute())
        return [AttendanceBase(**a) for a in response.data]
    return await _execute(_supa, sqlite_db.get_attendance)

async def mark_attendance(att: AttendanceBase):
    async def _supa():
        await _run(
            lambda: supabase.table("attendance")
            .upsert(att.model_dump(), on_conflict="event_id,user_id")
            .execute()
        )
    return await _execute(_supa, lambda: sqlite_db.mark_attendance(att))


# ── Unit Config (Permission Manager) ───────────────────────────────────────

async def get_unit_config() -> dict:
    async def _supa():
        response = await _run(
            lambda: supabase.table("unit_config").select("*").eq("id", "singleton").execute()
        )
        if response.data:
            return response.data[0]
        return {"id": "singleton", "permission_manager_id": None}
    return await _execute(_supa, sqlite_db.get_unit_config)


async def set_permission_manager(manager_id: str, updated_by: str):
    async def _supa():
        await _run(
            lambda: supabase.table("unit_config").upsert(
                {"id": "singleton", "permission_manager_id": manager_id, "updated_by": updated_by},
                on_conflict="id"
            ).execute()
        )
    return await _execute(_supa, lambda: sqlite_db.set_permission_manager(manager_id, updated_by))


# ── Public Inquiries ───────────────────────────────────────────────────────

async def get_inquiries() -> List[InquiryBase]:
    async def _supa():
        response = await _run(lambda: supabase.table("inquiries").select("*").order("created_at", desc=True).execute())
        return [InquiryBase(**i) for i in response.data]
    
    async def _sqlite():
        res = await sqlite_db.get_inquiries()
        return [InquiryBase(**i) for i in res]
        
    return await _execute(_supa, _sqlite)

async def get_inquiry_by_id(inquiry_id: str) -> Optional[InquiryBase]:
    async def _supa():
        response = await _run(lambda: supabase.table("inquiries").select("*").eq("id", inquiry_id).execute())
        if response.data:
            return InquiryBase(**response.data[0])
        return None
        
    async def _sqlite():
        res = await sqlite_db.get_inquiry_by_id(inquiry_id)
        if res:
            return InquiryBase(**res)
        return None
        
    return await _execute(_supa, _sqlite)

async def save_inquiry(inquiry: InquiryBase):
    async def _supa():
        await _run(lambda: supabase.table("inquiries").upsert(inquiry.model_dump(), on_conflict="id").execute())
        
    async def _sqlite():
        await sqlite_db.save_inquiry(inquiry.model_dump())
        
    return await _execute(_supa, _sqlite)
