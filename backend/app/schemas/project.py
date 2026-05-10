"""Project schemas."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.user import UserMinimal


class ProjectStatus(str, Enum):
    planificat = "planificat"
    activ = "activ"
    suspendat = "suspendat"
    finalizat = "finalizat"


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.planificat
    category: Optional[str] = None
    color: Optional[str] = None
    grant_total: Optional[float] = None
    deadline: Optional[date] = None
    start_date: Optional[date] = None
    beneficiari_directi: Optional[int] = None
    cover_image_url: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    category: Optional[str] = None
    color: Optional[str] = None
    grant_total: Optional[float] = None
    deadline: Optional[date] = None
    start_date: Optional[date] = None
    beneficiari_directi: Optional[int] = None
    cover_image_url: Optional[str] = None


class ProjectMemberResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    joined_at: Optional[datetime] = None
    profile: Optional[UserMinimal] = None

    model_config = {"from_attributes": True}


class ProjectStatsResponse(BaseModel):
    project_id: str
    project_name: str
    grant_total: float = 0
    total_cheltuieli: float = 0
    sold: float = 0
    procent_utilizare: float = 0
    cheltuieli_aprobate: float = 0
    cheltuieli_in_asteptare: float = 0


class ProjectResponse(ProjectBase):
    id: str
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    members: List[UserMinimal] = []
    stats: Optional[ProjectStatsResponse] = None

    model_config = {"from_attributes": True}


__all__ = [
    "ProjectStatus",
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectMemberResponse",
    "ProjectStatsResponse",
]
