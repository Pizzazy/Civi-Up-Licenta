"""Social post schemas."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import AliasChoices, BaseModel, Field


class SocialPlatform(str, Enum):
    Facebook = "Facebook"
    Instagram = "Instagram"
    LinkedIn = "LinkedIn"
    Twitter = "Twitter"


class SocialPostBase(BaseModel):
    text: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    platforms: List[SocialPlatform] = Field(
        default_factory=list,
        validation_alias=AliasChoices("platforms", "platform"),
        serialization_alias="platforms",
    )
    status: str = "draft"
    scheduled_at: Optional[datetime] = None
    ai_prompt: Optional[str] = None
    ai_generated: bool = False
    project_id: Optional[str] = None


class SocialPostCreate(SocialPostBase):
    pass


class SocialPostUpdate(BaseModel):
    text: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    platforms: Optional[List[SocialPlatform]] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    ai_prompt: Optional[str] = None
    ai_generated: Optional[bool] = None
    project_id: Optional[str] = None


class SocialPostResponse(SocialPostBase):
    id: str
    published_at: Optional[datetime] = None
    likes: int = 0
    shares: int = 0
    comments: int = 0
    reach: int = 0
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SocialAnalytics(BaseModel):
    total_reach: int = 0
    total_likes: int = 0
    total_shares: int = 0
    total_comments: int = 0
    by_platform: dict = {}  # { platform: {reach, likes, shares, comments} }
    top_posts: List[SocialPostResponse] = []


class AITextRequest(BaseModel):
    prompt: str
    project_name: Optional[str] = None
    tone: Optional[str] = None
    include_hashtags: bool = True
    correct_diacritics: bool = True


class AITextResponse(BaseModel):
    generated_text: str


__all__ = [
    "SocialPlatform",
    "SocialPostBase",
    "SocialPostCreate",
    "SocialPostUpdate",
    "SocialPostResponse",
    "SocialAnalytics",
    "AITextRequest",
    "AITextResponse",
]
