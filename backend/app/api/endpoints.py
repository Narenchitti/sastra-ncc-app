from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Dict, Any
import datetime
import uuid

from ..services import database, news
from ..services.notifications import send_discord_notification, send_email_notification
from ..schemas.models import UserBase, UserPublic, EventBase, PermissionBase, AchievementBase, AttendanceBase, APIModel, InquiryBase, InquiryResponse
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

    user = await database.get_user_by_email(email)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check approval status
    if getattr(user, "status", "APPROVED") == "PENDING_APPROVAL":
        raise HTTPException(
            status_code=401,
            detail="Your registration is pending approval. You can login only after the ANO approves it. Please try again later."
        )
    elif getattr(user, "status", "APPROVED") == "REJECTED":
        raise HTTPException(
            status_code=401,
            detail="Your registration request was declined/rejected by the ANO. Please sign up again with correct details."
        )

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

def validate_event_times_and_dates(event: EventBase):
    valid_types = {"Parade", "Theory", "Camp", "Event"}
    if event.type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event type '{event.type}'. Must be one of: {', '.join(valid_types)}"
        )

    try:
        datetime.datetime.strptime(event.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Must be YYYY-MM-DD")

    try:
        start = datetime.datetime.strptime(event.start_time, "%H:%M")
        end = datetime.datetime.strptime(event.end_time, "%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Must be HH:MM")

    if start >= end:
        raise HTTPException(status_code=400, detail="Event start time must be before end time")

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
    
    validate_event_times_and_dates(event)
    await database.save_event(event)
    
    # Broadcast to Discord
    description = (
        f"**Type:** {event.type}\n"
        f"**Date:** {event.date}\n"
        f"**Time:** {event.start_time} - {event.end_time}\n"
        f"**Location:** {event.location}"
    )
    send_discord_notification(
        title=f"New Event Published: {event.title}",
        description=description,
        color=3447003
    )
    
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

async def recalculate_user_camp_count(user_id: str):
    # Fetch all attendance for this user marked 'Present' or 'Permission'
    all_att = await database.get_attendance()
    user_presents = [a for a in all_att if a.user_id == user_id and a.status in ("Present", "Permission")]
    
    if not user_presents:
        camp_count = 0
    else:
        # Fetch all events to filter by type 'Camp'
        all_events = await database.get_events()
        camp_ids = {e.id for e in all_events if e.type == "Camp"}
        camp_count = sum(1 for a in user_presents if a.event_id in camp_ids)
        
    # Get user, update, and save
    all_users = await database.get_users()
    user = next((u for u in all_users if u.id == user_id), None)
    if user:
        user.camp_count = camp_count
        await database.save_user(user)

@router.post("/attendance/bulk")
async def submit_bulk_attendance(data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    rank = current_user.get("rank")
    user_id = current_user.get("sub")

    # Fetch unit config to check if user is the assigned Permission Manager
    unit_config = await database.get_unit_config()
    is_pm = unit_config.get("permission_manager_id") == user_id if unit_config else False

    # Check if user is a rank holder (any rank other than Cadet or CDT)
    is_rank_holder = rank not in ("Cadet", "CDT")

    if role != "ANO" and not is_pm and not is_rank_holder:
        raise HTTPException(status_code=403, detail="Unauthorized to mark attendance")

    event_id = data.get("eventId")
    records = data.get("records", [])
    marked_by = data.get("markedBy")

    # Fetch events to check type
    events = await database.get_events()
    event = next((e for e in events if e.id == event_id), None)
    is_camp = event and event.type == "Camp"

    for r in records:
        att = AttendanceBase(
            event_id=event_id,
            user_id=r["userId"],
            status=r["status"],
            marked_by=marked_by
        )
        await database.mark_attendance(att)
        
        if is_camp:
            await recalculate_user_camp_count(r["userId"])

    return {"success": True}


# ── Unit Config (protected) ──────────────────────────────────────────

@router.get("/unit-config")
async def get_unit_config(current_user: dict = Depends(get_current_user)):
    config = await database.get_unit_config()
    return config


@router.put("/unit-config")
async def update_unit_config(data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "ANO":
        raise HTTPException(status_code=403, detail="Only ANO can modify unit configurations")
        
    config_payload = {}
    if "permissionManagerId" in data:
        config_payload["permission_manager_id"] = data["permissionManagerId"]
    if "collegeStartTime" in data:
        config_payload["college_start_time"] = data["collegeStartTime"]
    if "collegeEndTime" in data:
        config_payload["college_end_time"] = data["collegeEndTime"]
    if "academicCalendar" in data:
        config_payload["academic_calendar"] = data["academicCalendar"]
        
    await database.save_unit_config(config_payload, current_user.get("sub"))
    return {"success": True}


@router.post("/unit-config/upload-calendar")
async def upload_academic_calendar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "ANO":
        raise HTTPException(status_code=403, detail="Only ANO can modify unit configurations")
        
    import io
    filename = file.filename or ""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        
    text = ""
    try:
        if ext == "pdf":
            import pypdf
            pdf_file = io.BytesIO(file_bytes)
            reader = pypdf.PdfReader(pdf_file)
            pages_text = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            text = "\n".join(pages_text)
        elif ext == "docx":
            import docx
            doc_file = io.BytesIO(file_bytes)
            doc = docx.Document(doc_file)
            text = "\n".join([para.text for para in doc.paragraphs])
        elif ext in ["xlsx", "xls"]:
            import openpyxl
            excel_file = io.BytesIO(file_bytes)
            wb = openpyxl.load_workbook(excel_file, data_only=True)
            text_lines = []
            for sheet in wb.worksheets:
                text_lines.append(f"--- Sheet: {sheet.title} ---")
                for row in sheet.iter_rows(values_only=True):
                    row_str = " | ".join([str(val) for val in row if val is not None])
                    if row_str.strip():
                        text_lines.append(row_str)
            text = "\n".join(text_lines)
        elif ext in ["txt", "csv"]:
            text = file_bytes.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, XLSX, TXT, or CSV.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse document: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text could be extracted from the uploaded file.")
        
    if len(text) > 8000:
        text = text[:8000] + "\n... [TRUNCATED DUE TO LENGTH]"
        
    # Save directly to config database
    config_payload = {"academic_calendar": text}
    await database.save_unit_config(config_payload, current_user.get("sub"))
    
    return {"success": True, "text": text}



# ── File Upload ────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    import os
    import shutil
    import uuid
    import logging

    # Try uploading to Supabase Storage first if not running on SQLite fallback
    from ..services.database import USE_SQLITE
    from ..core.supabase import supabase
    
    if not USE_SQLITE:
        try:
            # Read file bytes
            file_bytes = await file.read()
            file_ext = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            
            # Upload to 'evidence' bucket (user should make sure it's created and public)
            supabase.storage.from_("evidence").upload(
                path=unique_filename,
                file=file_bytes,
                file_options={"content-type": file.content_type}
            )
            
            # Retrieve the public url
            public_url = supabase.storage.from_("evidence").get_public_url(unique_filename)
            return {"url": public_url}
        except Exception as e:
            logger = logging.getLogger("app.upload")
            logger.warning(f"Supabase storage upload failed: {e}. Falling back to local filesystem.")
            
    # Local filesystem fallback
    os.makedirs("static/uploads", exist_ok=True)
    file_path = f"static/uploads/{file.filename}"
    
    # Reset read pointer in case it was read for Supabase upload
    await file.seek(0)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"http://127.0.0.1:8000/static/uploads/{file.filename}"}


# ── Command Center Text-to-SQL (protected) ─────────────────────────────────

@router.post("/query")
async def natural_query(data: Dict[str, str], current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role != "ANO":
        raise HTTPException(status_code=403, detail="Only the ANO can query the Command Center")
        
    query_text = data.get("query")
    if not query_text:
        raise HTTPException(status_code=400, detail="Query text is required")
        
    from ..services import query_agent
    res = await query_agent.execute_natural_query(query_text)
    return res


# ── Training Planner Scheduler (protected) ───────────────────────────────────

@router.get("/schedule/audit")
async def get_schedule_audit(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role != "ANO":
        raise HTTPException(status_code=403, detail="Only the ANO can audit the curriculum")
        
    from ..services import audit_service
    res = await audit_service.get_syllabus_audit()
    return res


@router.post("/schedule/plan")
async def schedule_plan(data: Dict[str, str], current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role != "ANO":
        raise HTTPException(status_code=403, detail="Only the ANO can plan schedules")
        
    query_text = data.get("query")
    if not query_text:
        raise HTTPException(status_code=400, detail="Query text is required")
        
    from ..services import scheduler_agent
    res = await scheduler_agent.plan_training_schedule(query_text)
    return res


@router.post("/events/bulk")
async def save_events_bulk(data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role != "ANO":
        raise HTTPException(status_code=403, detail="Only the ANO can save events in bulk")
        
    events_data = data.get("events", [])
    if not events_data:
        raise HTTPException(status_code=400, detail="No events provided")
        
    import uuid
    event_objs = []
    for ev_dict in events_data:
        if "id" not in ev_dict or not ev_dict["id"]:
            ev_dict["id"] = str(uuid.uuid4())
        event_obj = EventBase(**ev_dict)
        validate_event_times_and_dates(event_obj)
        event_objs.append(event_obj)
        
    for event_obj in event_objs:
        await database.save_event(event_obj)
        
    # Broadcast to Discord as a single batch summary
    description = f"**Total Events Published:** {len(event_objs)}\n\n"
    for e in event_objs:
        description += f"• **{e.title}** ({e.type}) on {e.date} at {e.location} ({e.start_time} - {e.end_time})\n"
    send_discord_notification(
        title="Training Calendar Batch Published",
        description=description,
        color=2121755
    )
        
    return {"success": True, "count": len(events_data)}


@router.get("/telemetry/traces")
async def get_telemetry_traces(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role != "ANO":
        raise HTTPException(status_code=403, detail="Only the ANO can access performance metrics telemetry")
        
    from ..services import telemetry
    raw_traces = telemetry.get_traces()
    formatted_traces = []
    for t in raw_traces:
        spans = []
        for s in t.get("spans", []):
            spans.append({
                "name": s.get("name"),
                "category": s.get("category"),
                "durationMs": s.get("duration_ms")
            })
        formatted_traces.append({
            "path": t.get("path"),
            "method": t.get("method"),
            "durationMs": t.get("duration_ms"),
            "statusCode": t.get("status_code"),
            "timestamp": t.get("timestamp"),
            "spans": spans
        })
    return formatted_traces


# ── Cadet Signup & Approval Flow ───────────────────────────────────────────

@router.post("/auth/signup")
async def signup(data: Dict[str, Any]):
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    rank = data.get("rank")
    regimental_number = data.get("regimentalNumber")
    registration_number = data.get("registrationNumber")
    dob = data.get("dob")
    year_branch = data.get("yearBranch")
    hostel_info = data.get("hostelInfo")
    batch_year = data.get("batchYear", 2026)

    if not email or not password or not name or not rank:
        raise HTTPException(status_code=400, detail="Missing required registration fields")

    existing_user = await database.get_user_by_email(email)
    import uuid
    user_id = str(uuid.uuid4())
    
    if existing_user:
        if getattr(existing_user, "status", "APPROVED") == "REJECTED":
            user_id = existing_user.id
        else:
            raise HTTPException(status_code=400, detail="Email address already registered")

    from ..core.auth import hash_password
    
    hashed_pwd = hash_password(password)
    
    new_user = UserBase(
        id=user_id,
        name=name,
        email=email,
        password=hashed_pwd,
        rank=rank,
        role="cadet",
        batch_year=batch_year,
        regimental_number=regimental_number,
        registration_number=registration_number,
        dob=dob,
        year_branch=year_branch,
        hostel_info=hostel_info,
        camp_count=0,
        status="PENDING_APPROVAL"
    )
    
    await database.save_user(new_user)
    return {"success": True, "message": "Signup successful. Awaiting verification by ANO or cadet heads."}


@router.get("/users/pending", response_model=List[UserPublic])
async def get_pending_users(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    user_role = current_user.get("role")
    user_rank = current_user.get("rank")
    
    unit_config = await database.get_unit_config()
    manager_id = unit_config.get("permission_manager_id")
    
    is_manager = (manager_id == user_id)
    is_admin = (user_role == "ANO" or user_rank in ["SUO", "CUO"] or is_manager)
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to review pending accounts")
        
    users = await database.get_users()
    pending = [UserPublic(**u.model_dump()) for u in users if getattr(u, "status", "APPROVED") == "PENDING_APPROVAL"]
    return pending


@router.put("/users/{user_id}/approve")
async def approve_user(user_id: str, data: Dict[str, str], current_user: dict = Depends(get_current_user)):
    caller_id = current_user.get("sub")
    caller_role = current_user.get("role")
    caller_rank = current_user.get("rank")
    
    unit_config = await database.get_unit_config()
    manager_id = unit_config.get("permission_manager_id")
    
    is_manager = (manager_id == caller_id)
    is_admin = (caller_role == "ANO" or caller_rank in ["SUO", "CUO"] or is_manager)
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to approve signup requests")
        
    status = data.get("status")
    if status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be APPROVED or REJECTED")
        
    users = await database.get_users()
    target_user = next((u for u in users if u.id == user_id), None)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user.status = status
    await database.save_user(target_user)
    
    return {"success": True, "message": f"User status updated to {status}"}


# ── Public Inquiries & Broadcast Alerts ────────────────────────────────────

@router.post("/inquiries", response_model=InquiryResponse)
async def create_inquiry(data: Dict[str, Any]):
    name = data.get("name")
    email = data.get("email")
    message = data.get("message")
    subscribed = data.get("subscribed", True)

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Name, email, and message are required")

    inquiry_id = str(uuid.uuid4())
    inquiry = InquiryBase(
        id=inquiry_id,
        name=name,
        email=email,
        message=message,
        status="PENDING",
        reply_message=None,
        subscribed=subscribed,
        created_at=datetime.datetime.utcnow().isoformat() + "Z"
    )

    await database.save_inquiry(inquiry)
    
    # Optionally trigger a Discord alert so the ANO gets notified immediately
    send_discord_notification(
        title="New Public Inquiry Received",
        description=f"**Visitor:** {name} ({email})\n**Inquiry:** {message}",
        color=13743895  # Golden color
    )

    return InquiryResponse(success=True, message="Inquiry submitted and subscription verified", data=inquiry)


@router.get("/inquiries", response_model=List[InquiryBase])
async def get_all_inquiries(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_rank = current_user.get("rank")
    
    # Only ANO or SUO/CUO can review public inquiries
    if user_role != "ANO" and user_rank not in ["SUO", "CUO"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return await database.get_inquiries()


@router.post("/inquiries/{inquiry_id}/reply")
async def reply_to_inquiry(inquiry_id: str, data: Dict[str, str], current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    user_rank = current_user.get("rank")
    
    # Only ANO or SUO/CUO can reply to queries
    if user_role != "ANO" and user_rank not in ["SUO", "CUO"]:
        raise HTTPException(status_code=403, detail="Access denied")

    reply_message = data.get("replyMessage")
    if not reply_message:
        raise HTTPException(status_code=400, detail="Reply message is required")

    inquiry = await database.get_inquiry_by_id(inquiry_id)
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    inquiry.status = "REPLIED"
    inquiry.reply_message = reply_message
    await database.save_inquiry(inquiry)

    # Trigger SMTP email notification to the visitor
    subject = "Response to your NCC inquiry"
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background-color: #4A5D23; color: white; padding: 15px; font-size: 18px; font-weight: bold;">
                🎖️ SASTRA NCC ARMY contingent
            </div>
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                <p>Hello <strong>{inquiry.name}</strong>,</p>
                <p>Thank you for reaching out to us. We have received your inquiry:</p>
                <blockquote style="background-color: #f9f9f9; border-left: 3px solid #ccc; padding: 10px; margin: 10px 0;">
                    <em>"{inquiry.message}"</em>
                </blockquote>
                <p><strong>Response from Command Staff:</strong></p>
                <p>{reply_message}</p>
                <br />
                <p>Best regards,<br />
                <strong>Command Office</strong><br />
                06/34 (TN) Indep Coy NCC (Army)<br />
                SASTRA Deemed University</p>
            </div>
        </body>
    </html>
    """
    send_email_notification(to_email=inquiry.email, subject=subject, html_body=html_body)

    return {"success": True, "message": "Reply saved and response email sent"}


@router.post("/inquiries/broadcast")
async def broadcast_alert(data: Dict[str, str], current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role")
    
    # Only ANO can issue broadcast announcements to public subscribers
    if user_role != "ANO":
        raise HTTPException(status_code=403, detail="Only the ANO can send public broadcasts")

    subject = data.get("subject")
    message = data.get("message")

    if not subject or not message:
        raise HTTPException(status_code=400, detail="Subject and message are required")

    inquiries = await database.get_inquiries()
    
    # Filter unique subscribed emails
    subscribed_emails = {}
    for i in inquiries:
        if i.subscribed and i.email not in subscribed_emails:
            subscribed_emails[i.email] = i.name

    if not subscribed_emails:
        return {"success": True, "message": "No active newsletter subscribers found", "recipientCount": 0}

    # Broadcast emails
    count = 0
    for email, name in subscribed_emails.items():
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="background-color: #D21034; color: white; padding: 15px; font-size: 18px; font-weight: bold;">
                    🎖️ SASTRA NCC RECRUITMENT BULLETIN
                </div>
                <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                    <p>Hello <strong>{name}</strong>,</p>
                    <p>This is an official announcement from SASTRA NCC Army Wing:</p>
                    <div style="background-color: #fdf8e2; border-left: 4px solid #D4AF37; padding: 15px; margin: 15px 0;">
                        <h3 style="margin-top: 0; color: #856404;">{subject}</h3>
                        <p style="white-space: pre-wrap; margin-bottom: 0;">{message}</p>
                    </div>
                    <p>You received this email because you registered for recruitment alerts at our landing page. If you wish to unsubscribe, please reply to this email.</p>
                    <br />
                    <p>Best regards,<br />
                    <strong>Command Office</strong><br />
                    06/34 (TN) Indep Coy NCC (Army)<br />
                    SASTRA Deemed University</p>
                </div>
            </body>
        </html>
        """
        send_email_notification(to_email=email, subject=subject, html_body=html_body)
        count += 1

    return {"success": True, "message": f"Broadcast email sent to {count} subscribers", "recipientCount": count}


