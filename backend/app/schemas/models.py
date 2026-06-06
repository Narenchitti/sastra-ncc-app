from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime

class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class UserBase(APIModel):
    id: str
    name: str
    email: str
    password: str
    rank: str
    role: str
    batch_year: int
    regimental_number: Optional[str] = None
    registration_number: Optional[str] = None
    dob: Optional[str] = None
    year_branch: Optional[str] = None
    hostel_info: Optional[str] = None
    camp_count: Optional[int] = 0


class UserPublic(APIModel):
    """Safe user schema — never includes the password field."""
    id: str
    name: str
    email: str
    rank: str
    role: str
    batch_year: int
    regimental_number: Optional[str] = None
    registration_number: Optional[str] = None
    dob: Optional[str] = None
    year_branch: Optional[str] = None
    hostel_info: Optional[str] = None
    camp_count: Optional[int] = 0

class EventBase(APIModel):
    id: str
    title: str
    date: str
    start_time: str
    end_time: str
    location: str
    type: str

class PermissionBase(APIModel):
    id: str
    cadet_id: str
    cadet_name: str
    start_date: str
    end_date: str
    reason: str
    evidence_url: Optional[str] = None
    status: str
    suo_comment: Optional[str] = None
    ano_comment: Optional[str] = None
    created_at: str

class AchievementBase(APIModel):
    id: str
    cadet_id: str
    title: str
    date: str
    end_date: Optional[str] = None
    category: str
    location: Optional[str] = None
    description: str
    certificate_url: Optional[str] = None
    status: str
    is_verified: bool
    ano_comment: Optional[str] = None

class AttendanceBase(APIModel):
    event_id: str
    user_id: str
    status: str
    marked_by: str
    timestamp: Optional[str] = None
