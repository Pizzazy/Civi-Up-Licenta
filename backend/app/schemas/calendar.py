"""Calendar event schemas."""

from __future__ import annotations

from datetime import date, datetime, time
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class EventType(str, Enum):
    meeting = "meeting"
    deadline = "deadline"
    event = "event"


class EventStatus(str, Enum):
    activ = "activ"
    finalizat = "finalizat"


class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: EventType = EventType.meeting
    event_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location: Optional[str] = None
    is_all_day: bool = False
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    attendees: List[str] = Field(default_factory=list)
    project_id: Optional[str] = None

    @field_validator("event_type", mode="before")
    @classmethod
    def _normalize_event_type(cls, value: object) -> EventType:
        if value == "eveniment":
            return EventType.event
        return value

    @field_validator("attendees", mode="before")
    @classmethod
    def _normalize_attendees(cls, value: object) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v) for v in value if str(v).strip()]
        return [str(value)]


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    event_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location: Optional[str] = None
    is_all_day: Optional[bool] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None
    attendees: Optional[List[str]] = None
    project_id: Optional[str] = None


class CalendarEventResponse(CalendarEventBase):
    id: str
    added_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    status: EventStatus = EventStatus.activ

    model_config = {"from_attributes": True}


__all__ = [
    "EventType",
    "CalendarEventBase",
    "CalendarEventCreate",
    "CalendarEventUpdate",
    "CalendarEventResponse",
    "EventStatus",
]
