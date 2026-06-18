from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Dict, Any

from ..services import database, news
from ..schemas.models import UserBase, UserPublic, EventBase, PermissionBase, AchievementBase, AttendanceBase, APIModel
from ..core.auth import verify_password, create_access_token, get_current_user


# ── Response Models ────────────────────────────────────────────────────────

class LoginResponse(APIModel):
    success: bool
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class DashboardResponse(APIModel):
    events: List[EventBase]
    permissions: List[PermissionBase]
    achievements: List[AchievementBase]
    attendance: List[AttendanceBase]
    users: List[UserPublic]
    permissionManagerId: str | None = None



# ── Rank Hierarchy ─────────────────────────────────────────────────────────

RANK_HIERARCHY = {
    "ANO": 9,
    "Captain": 9,
    "SUO": 8,
    "CUO": 7,
    "CSM": 6,
    "CQMS": 5,
    "SGT": 4,
    "CPL": 3,
    "L/CPL": 2,
    "CDT": 1,
    "Cadet": 1
}

def get_rank_level(rank: str) -> int:
    return RANK_HIERARCHY.get(rank, 1)

def is_rank_at_least(user_rank: str, min_rank: str) -> bool:
    return get_rank_level(user_rank) >= get_rank_level(min_rank)


router = APIRouter()


# ── Auth ───────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=LoginResponse)
async def login(data: Dict[str, str]):
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    users = await database.get_users()
    user = next((u for u in users if u.email == email), None)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Try bcrypt verification first; fall back to plain-text for
    # legacy accounts that haven't been re-hashed yet.
    try:
        password_valid = verify_password(password, user.password)
    except Exception:
        password_valid = (password == user.password)

    if not password_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email, "rank": user.rank})
    user_public = UserPublic(**user.model_dump())

    return LoginResponse(success=True, access_token=token, user=user_public)


# ── Dashboard (protected) ──────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    events, permissions, achievements, attendance, users, unit_config = await _gather_all()

    user_id = current_user.get("sub")
    user_role = current_user.get("role")
    user_rank = current_user.get("rank")

    # Resolve from DB to handle updates
    caller = next((u for u in users if u.id == user_id), None)
    if caller:
        user_role = caller.role
        user_rank = caller.rank

    permission_manager_id = unit_config.get("permission_manager_id")
    is_manager = (permission_manager_id == user_id)
    is_admin = (user_role == "ANO" or user_rank in ["SUO", "CUO"] or is_manager)

    if not is_admin:
        permissions = [p for p in permissions if p.cadet_id == user_id]
        achievements = [a for a in achievements if a.cadet_id == user_id]
        attendance = [a for a in attendance if a.user_id == user_id]

    return DashboardResponse(
        events=events,
        permissions=permissions,
        achievements=achievements,
        attendance=attendance,
        users=[UserPublic(**u.model_dump()) for u in users],
        permissionManagerId=permission_manager_id,
    )


async def _gather_all():
    """Helper: fetch all collections concurrently."""
    # Execute sequentially because supabase-py's internal httpx client 
    # throws LocalProtocolError on concurrent thread access (HTTP/2 issue)
    events = await database.get_events()
    permissions = await database.get_permissions()
    achievements = await database.get_achievements()
    attendance = await database.get_attendance()
    users = await database.get_users()
    unit_config = await database.get_unit_config()
    
    return events, permissions, achievements, attendance, users, unit_config


# ── News (public) ──────────────────────────────────────────────────────────

@router.get("/news")
async def get_news():
    return await news.get_army_news()


# ── Events (public) ──────────────────────────────────────────────────────────

@router.get("/events/public", response_model=List[EventBase])
async def get_public_events():
    return await database.get_events()


# ── Events (protected) ────────────────────────────────────────────────────

@router.get("/events", response_model=List[EventBase])
async def get_events(current_user: dict = Depends(get_current_user)):
    return await database.get_events()


@router.post("/events")
async def save_event(event: EventBase, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    rank = current_user.get("rank")
    if role != "ANO" and rank not in ["SUO", "CUO"]:
        raise HTTPException(status_code=403, detail="Only ANO or SUO/CUO can create/edit events")
    await database.save_event(event)
    return {"success": True}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    rank = current_user.get("rank")
    if role != "ANO" and rank not in ["SUO", "CUO"]:
        raise HTTPException(status_code=403, detail="Only ANO or SUO/CUO can delete events")
    await database.delete_event(event_id)
    return {"success": True}


# ── Permissions (protected) ────────────────────────────────────────────────

@router.get("/permissions", response_model=List[PermissionBase])
async def get_permissions(current_user: dict = Depends(get_current_user)):
    return await database.get_permissions()


@router.post("/permissions")
async def save_permission(perm: PermissionBase, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_id = current_user.get("sub")
    user_rank = current_user.get("rank")

    unit_config = await database.get_unit_config()
    manager_id = unit_config.get("permission_manager_id")
    is_manager = (manager_id == user_id)

    # 1. Fetch existing permissions
    existing_perms = await database.get_permissions()
    existing = next((p for p in existing_perms if p.id == perm.id), None)

    if existing:
        # Case 1: Status (Review Decision) is changing
        if existing.status != perm.status:
            if role != "ANO" and not is_manager:
                raise HTTPException(status_code=403, detail="Not authorized to review permissions")

            if is_manager and role != "ANO":
                if existing.cadet_id == user_id:
                    raise HTTPException(status_code=403, detail="You cannot review your own permission requests")

                # Rank hierarchy check
                db_users = await database.get_users()
                applicant = next((u for u in db_users if u.id == existing.cadet_id), None)
                if applicant:
                    if get_rank_level(user_rank) <= get_rank_level(applicant.rank):
                        raise HTTPException(status_code=403, detail="You can only review permissions for lower-ranking cadets")

                if perm.status not in ["FORWARDED_TO_ANO", "REJECTED_BY_SUO"]:
                    raise HTTPException(status_code=403, detail="Manager can only forward or reject requests")

            if role == "ANO":
                if perm.status not in ["APPROVED", "DECLINED_BY_ANO", "MEET_ANO", "FORWARDED_TO_ANO", "REJECTED_BY_SUO"]:
                    raise HTTPException(status_code=400, detail="Invalid status change by ANO")
            
            # Preserve existing AI audit results on status review
            perm.ai_status = existing.ai_status
            perm.ai_remarks = existing.ai_remarks
        # Case 2: Other details changing
        else:
            if role != "ANO":
                if existing.cadet_id != user_id:
                    raise HTTPException(status_code=403, detail="You can only edit your own requests")
                if existing.status not in ["PENDING_REVIEW", "PENDING_SUO"]:
                    raise HTTPException(status_code=403, detail="Cannot edit a request that has already been processed")
            
            # Rerun AI audit if details changed
            if existing.evidence_url != perm.evidence_url or existing.reason != perm.reason or existing.start_date != perm.start_date or existing.end_date != perm.end_date:
                import os
                from ..services import ai_auditor
                file_path = None
                if perm.evidence_url:
                    filename = perm.evidence_url.split("/uploads/")[-1]
                    file_path = f"static/uploads/{filename}"
                    if not os.path.exists(file_path):
                        file_path = None

                audit_res = await ai_auditor.audit_permission_document(
                    reason=perm.reason,
                    start_date=perm.start_date,
                    end_date=perm.end_date,
                    file_path=file_path
                )
                perm.ai_status = audit_res.get("status")
                perm.ai_remarks = audit_res.get("remarks")
            else:
                perm.ai_status = existing.ai_status
                perm.ai_remarks = existing.ai_remarks
    else:
        # Creating new permission request
        if role != "ANO":
            if perm.cadet_id != user_id:
                raise HTTPException(status_code=403, detail="You can only request permissions for yourself")
            if perm.status != "PENDING_REVIEW":
                raise HTTPException(status_code=403, detail="New requests must be in PENDING_REVIEW status")

        # Run AI Document Audit
        import os
        from ..services import ai_auditor
        file_path = None
        if perm.evidence_url:
            filename = perm.evidence_url.split("/uploads/")[-1]
            file_path = f"static/uploads/{filename}"
            if not os.path.exists(file_path):
                file_path = None

        audit_res = await ai_auditor.audit_permission_document(
            reason=perm.reason,
            start_date=perm.start_date,
            end_date=perm.end_date,
            file_path=file_path
        )
        perm.ai_status = audit_res.get("status")
        perm.ai_remarks = audit_res.get("remarks")

    await database.save_permission(perm)
    return {"success": True}


@router.delete("/permissions/{perm_id}")
async def delete_permission(perm_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_id = current_user.get("sub")

    existing_perms = await database.get_permissions()
    existing = next((p for p in existing_perms if p.id == perm_id), None)

    if not existing:
        raise HTTPException(status_code=404, detail="Permission request not found")

    if role != "ANO":
        if existing.cadet_id != user_id:
            raise HTTPException(status_code=403, detail="You can only withdraw your own requests")
        if existing.status not in ["PENDING_REVIEW", "PENDING_SUO"]:
            raise HTTPException(status_code=403, detail="Cannot withdraw a request that has already been processed")

    await database.delete_permission(perm_id)
    return {"success": True}


# ── Achievements (protected) ───────────────────────────────────────────────

@router.get("/achievements", response_model=List[AchievementBase])
async def get_achievements(current_user: dict = Depends(get_current_user)):
    return await database.get_achievements()


@router.post("/achievements")
async def save_achievement(ach: AchievementBase, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_id = current_user.get("sub")

    # 1. Fetch existing achievements
    existing_achs = await database.get_achievements()
    existing = next((a for a in existing_achs if a.id == ach.id), None)

    # 2. Check permissions
    if existing:
        if role != "ANO" and existing.cadet_id != user_id:
            raise HTTPException(status_code=403, detail="You can only edit your own achievements")
        if role != "ANO" and existing.status not in ["DRAFT", "REJECTED"]:
            raise HTTPException(status_code=403, detail="Cannot edit an achievement that is pending review or verified")
        if role != "ANO" and ach.status in ["VERIFIED", "REJECTED"]:
            raise HTTPException(status_code=403, detail="Only ANO can verify or reject achievements")
        if role != "ANO" and ach.is_verified:
            raise HTTPException(status_code=403, detail="Only ANO can mark achievements as verified")
    else:
        if role != "ANO":
            if ach.cadet_id != user_id:
                raise HTTPException(status_code=403, detail="You can only create achievements for yourself")
            if ach.status not in ["DRAFT", "PENDING"]:
                raise HTTPException(status_code=403, detail="New achievements must be in DRAFT or PENDING status")
            if ach.is_verified:
                raise HTTPException(status_code=403, detail="Cadets cannot create pre-verified achievements")

    await database.save_achievement(ach)
    return {"success": True}


@router.delete("/achievements/{ach_id}")
async def delete_achievement(ach_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    user_id = current_user.get("sub")

    existing_achs = await database.get_achievements()
    existing = next((a for a in existing_achs if a.id == ach_id), None)

    if not existing:
        raise HTTPException(status_code=404, detail="Achievement not found")

    if role != "ANO":
        if existing.cadet_id != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own achievements")
        if existing.status not in ["DRAFT", "REJECTED"]:
            raise HTTPException(status_code=403, detail="Cannot delete an achievement that is pending review or verified")

    await database.delete_achievement(ach_id)
    return {"success": True}


# ── Attendance (protected) ─────────────────────────────────────────────────

@router.post("/attendance/bulk")
async def submit_bulk_attendance(data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    rank = current_user.get("rank")
    if role != "ANO" and not is_rank_at_least(rank, "SGT"):
        raise HTTPException(status_code=403, detail="Only Sergeants (SGT) and above can mark attendance")

    event_id = data.get("eventId")
    records = data.get("records", [])
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


# ── Unit Config (protected) ──────────────────────────────────────────

@router.get("/unit-config")
async def get_unit_config(current_user: dict = Depends(get_current_user)):
    config = await database.get_unit_config()
    return config


@router.put("/unit-config")
async def update_unit_config(data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "ANO":
        raise HTTPException(status_code=403, detail="Only ANO can designate the Permission Manager")
    manager_id = data.get("permissionManagerId")
    if not manager_id:
        raise HTTPException(status_code=400, detail="permissionManagerId is required")
    await database.set_permission_manager(manager_id, current_user.get("sub"))
    return {"success": True}


# ── File Upload ────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    import os
    import shutil
    os.makedirs("static/uploads", exist_ok=True)
    file_path = f"static/uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"http://127.0.0.1:8000/static/uploads/{file.filename}"}
