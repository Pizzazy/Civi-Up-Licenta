"""Task & memo schemas."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.user import UserMinimal


class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    in_review = "in_review"
    done = "done"
    anulat = "anulat"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.pending
    priority: TaskPriority = TaskPriority.medium
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    sort_order: Optional[int] = None
    tags: List[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def _normalize_tags(cls, value: object) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v) for v in value if str(v).strip()]
        return [str(value)]


class TaskCreate(TaskBase):
    project_id: str


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    sort_order: Optional[int] = None
    tags: Optional[List[str]] = None


class TaskMemoCreate(BaseModel):
    text: str
    attachments: List[str] = Field(default_factory=list)


class TaskMemoResponse(BaseModel):
    id: str
    task_id: str
    text: str
    author_id: Optional[str] = None
    attachments: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    author: Optional[UserMinimal] = None

    model_config = {"from_attributes": True}


class TaskResponse(TaskBase):
    id: str
    project_id: str
    created_by: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    assignee: Optional[UserMinimal] = None
    memos: List[TaskMemoResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


__all__ = [
    "TaskStatus",
    "TaskPriority",
    "TaskBase",
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskMemoCreate",
    "TaskMemoResponse",
]
