"""User / profile schemas."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    ceo = "ceo"
    project_manager = "project_manager"
    financial_officer = "financial_officer"
    communications = "communications"
    volunteer_coordinator = "volunteer_coordinator"
    community_manager = "community_manager"
    voluntar = "voluntar"
    cititor = "cititor"


class UserStatus(str, Enum):
    activ = "activ"
    inactiv = "inactiv"
    suspendat = "suspendat"
    in_asteptare = "in_asteptare"


_ROLE_ALIASES = {
    "projectmanager": "project_manager",
    "project-manager": "project_manager",
    "project manager": "project_manager",
    "manager_proiect": "project_manager",
    "financial": "financial_officer",
    "finance": "financial_officer",
    "financial officer": "financial_officer",
    "financial-officer": "financial_officer",
    "comms": "communications",
    "communication": "communications",
    "communitymanager": "community_manager",
    "community-manager": "community_manager",
    "community manager": "community_manager",
    "reader": "cititor",
    "volunteer": "voluntar",
}

_STATUS_ALIASES = {
    "active": "activ",
    "inactive": "inactiv",
    "pending": "in_asteptare",
    "suspended": "suspendat",
    "in asteptare": "in_asteptare",
}


def _normalize_role(value: object) -> Optional[str]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None

    normalized = raw.lower().replace("-", "_").replace(" ", "_")
    normalized = _ROLE_ALIASES.get(normalized, normalized)
    if normalized in {r.value for r in UserRole}:
        return normalized
    return None


def _normalize_status(value: object) -> Optional[str]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None

    normalized = raw.lower().replace("-", "_")
    normalized = _STATUS_ALIASES.get(normalized, normalized)
    if normalized in {s.value for s in UserStatus}:
        return normalized
    return None


def _normalize_datetime(value: object) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value

    raw = str(value).strip()
    if not raw:
        return None

    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


class _ProfileNormalizationMixin(BaseModel):
    @field_validator("role", mode="before", check_fields=False)
    @classmethod
    def _validate_role(cls, value: object) -> Optional[str]:
        return _normalize_role(value)

    @field_validator("status", mode="before", check_fields=False)
    @classmethod
    def _validate_status(cls, value: object) -> Optional[str]:
        return _normalize_status(value)


class AccountRequestType(str, Enum):
    new_account = "new_account"
    reset_password = "reset_password"
    change_role = "change_role"


# ── Minimal (for embedding inside other responses) ──────────────────────────

class UserMinimal(_ProfileNormalizationMixin):
    id: str
    full_name: Optional[str] = None
    avatar_initials: Optional[str] = None
    role: Optional[UserRole] = None

    model_config = {"from_attributes": True}


# ── Profile ─────────────────────────────────────────────────────────────────

class ProfileBase(_ProfileNormalizationMixin):
    full_name: Optional[str] = None
    avatar_initials: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileCreate(ProfileBase):
    """Used internally when creating a profile row after signup."""
    id: str  # auth.users UUID


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_initials: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileResponse(ProfileBase):
    id: str
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("last_login_at", "created_at", "updated_at", mode="before")
    @classmethod
    def _validate_dates(cls, value: object) -> Optional[datetime]:
        return _normalize_datetime(value)

    model_config = {"from_attributes": True}


# ── Account requests ────────────────────────────────────────────────────────

class AccountRequestCreate(BaseModel):
    request_type: AccountRequestType
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requested_role: Optional[UserRole] = None
    user_id: Optional[str] = None
    notes: Optional[str] = None


class AccountRequestResponse(BaseModel):
    id: str
    request_type: AccountRequestType
    user_id: Optional[str] = None
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requested_role: Optional[UserRole] = None
    status: str = "pending"
    processed_by: Optional[str] = None
    processed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


__all__ = [
    "UserRole",
    "UserStatus",
    "UserMinimal",
    "ProfileBase",
    "ProfileCreate",
    "ProfileUpdate",
    "ProfileResponse",
    "AccountRequestType",
    "AccountRequestCreate",
    "AccountRequestResponse",
]
