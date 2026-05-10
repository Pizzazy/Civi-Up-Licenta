"""Email & email template schemas."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class EmailGroup(str, Enum):
    PM = "PM"
    Donatori = "Donatori"
    Newsletter = "Newsletter"
    Voluntari = "Voluntari"
    Parteneri = "Parteneri"
    Echipa = "Echipa"
    Toti = "Toti"


class EmailColumn(str, Enum):
    inbox = "inbox"
    in_lucru = "in_lucru"
    rezolvat = "rezolvat"
    arhiva = "arhiva"


class EmailBase(BaseModel):
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    to_groups: List[EmailGroup] = []
    to_emails: List[str] = []
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    kanban_column: EmailColumn = EmailColumn.inbox
    is_draft: bool = False
    email_group: Optional[str] = None
    thread_id: Optional[str] = None
    parent_id: Optional[str] = None
    attachments: List[str] = []


class EmailCreate(EmailBase):
    pass


class EmailUpdate(BaseModel):
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    kanban_column: Optional[EmailColumn] = None
    is_read: Optional[bool] = None
    is_starred: Optional[bool] = None
    is_draft: Optional[bool] = None
    to_groups: Optional[List[EmailGroup]] = None
    to_emails: Optional[List[str]] = None
    attachments: Optional[List[str]] = None


class EmailResponse(EmailBase):
    id: str
    from_user_id: Optional[str] = None
    is_read: bool = False
    is_starred: bool = False
    sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Templates ────────────────────────────────────────────────────────────────

class EmailTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    blocks: Optional[dict] = None
    thumbnail_url: Optional[str] = None
    is_public: bool = True


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    blocks: Optional[dict] = None
    thumbnail_url: Optional[str] = None
    is_public: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    blocks: Optional[dict] = None
    thumbnail_url: Optional[str] = None
    is_public: bool = True
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


__all__ = [
    "EmailGroup",
    "EmailColumn",
    "EmailBase",
    "EmailCreate",
    "EmailUpdate",
    "EmailResponse",
    "EmailTemplateCreate",
    "EmailTemplateUpdate",
    "EmailTemplateResponse",
]
