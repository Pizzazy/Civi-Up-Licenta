"""Chat message schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.user import UserMinimal


class ChatMessageCreate(BaseModel):
    text: str
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    text: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    sender: Optional[UserMinimal] = None

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    other_user: UserMinimal
    last_message: Optional[ChatMessageResponse] = None
    unread_count: int = 0


__all__ = [
    "ChatMessageCreate",
    "ChatMessageResponse",
    "ConversationResponse",
]
