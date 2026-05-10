"""Users & account-requests router."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, require_ceo
from app.schemas.user import (
    AccountRequestCreate,
    AccountRequestResponse,
    ProfileResponse,
    ProfileUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])


# ── list all profiles (CEO only) ────────────────────────────────────────────

@router.get("/", response_model=List[ProfileResponse])
async def list_users(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    current_user: Dict[str, Any] = Depends(require_ceo),
):
    desc = order_dir.lower() == "desc"
    resp = (
        supabase_admin.table("profiles")
        .select("*")
        .order(order_by, desc=desc)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [ProfileResponse(**r) for r in (resp.data or [])]


@router.get("/peers", response_model=List[ProfileResponse])
async def list_peers(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Return peers (all other active profiles) for chat/mentions.

    This endpoint is available to any authenticated user and purposely
    does not require CEO privileges like the admin `GET /users/` route.
    """
    resp = (
        supabase_admin.table("profiles")
        .select("id, full_name, avatar_initials, role, status")
        .neq("id", current_user["id"])
        .order("full_name")
        .execute()
    )
    return [ProfileResponse(**r) for r in (resp.data or [])]


# ── get single profile ──────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Utilizator negăsit.")
    return ProfileResponse(**resp.data)


# ── update profile (own or CEO) ─────────────────────────────────────────────

@router.put("/{user_id}", response_model=ProfileResponse)
async def update_user(
    user_id: str,
    body: ProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    is_own = current_user["id"] == user_id
    is_ceo = current_user.get("role") == "ceo"
    if not is_own and not is_ceo:
        raise HTTPException(status_code=403, detail="Poți modifica doar propriul profil.")

    # Non-CEO cannot change their own role
    if not is_ceo and body.role is not None:
        raise HTTPException(status_code=403, detail="Nu poți schimba propriul rol.")

    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nicio modificare trimisă.")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    resp = (
        supabase_admin.table("profiles")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Utilizator negăsit.")
    return ProfileResponse(**resp.data[0])


# ── deactivate user (CEO) ───────────────────────────────────────────────────

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(require_ceo),
):
    if current_user["id"] == user_id:
        raise HTTPException(status_code=422, detail="Nu te poți dezactiva pe tine însuți.")
    supabase_admin.table("profiles").update(
        {"status": "suspendat", "updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", user_id).execute()


# ══════════════════════════════════════════════════════════════════════════════
# Account requests
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/account-requests", response_model=AccountRequestResponse, status_code=201)
async def create_account_request(body: AccountRequestCreate):
    """Public — anyone can request a new account or password reset."""
    insert_data = body.model_dump(mode="json", exclude_unset=True)
    insert_data["status"] = "pending"
    resp = supabase_admin.table("account_requests").insert(insert_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare cerere.")
    return AccountRequestResponse(**resp.data[0])


@router.get("/account-requests", response_model=List[AccountRequestResponse])
async def list_account_requests(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(require_ceo),
):
    resp = (
        supabase_admin.table("account_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [AccountRequestResponse(**r) for r in (resp.data or [])]


class RejectBody(BaseModel):
    rejection_reason: str


@router.patch("/account-requests/{request_id}/approve", response_model=AccountRequestResponse)
async def approve_account_request(
    request_id: str,
    current_user: Dict[str, Any] = Depends(require_ceo),
):
    now = datetime.now(timezone.utc).isoformat()

    # Fetch request
    req_resp = (
        supabase_admin.table("account_requests")
        .select("*")
        .eq("id", request_id)
        .maybe_single()
        .execute()
    )
    if not req_resp.data:
        raise HTTPException(status_code=404, detail="Cerere negăsită.")
    if req_resp.data["status"] != "pending":
        raise HTTPException(status_code=422, detail="Cererea nu mai este în așteptare.")

    update_resp = (
        supabase_admin.table("account_requests")
        .update({
            "status": "approved",
            "processed_by": current_user["id"],
            "processed_at": now,
        })
        .eq("id", request_id)
        .execute()
    )
    return AccountRequestResponse(**update_resp.data[0])


@router.patch("/account-requests/{request_id}/reject", response_model=AccountRequestResponse)
async def reject_account_request(
    request_id: str,
    body: RejectBody,
    current_user: Dict[str, Any] = Depends(require_ceo),
):
    now = datetime.now(timezone.utc).isoformat()

    req_resp = (
        supabase_admin.table("account_requests")
        .select("*")
        .eq("id", request_id)
        .maybe_single()
        .execute()
    )
    if not req_resp.data:
        raise HTTPException(status_code=404, detail="Cerere negăsită.")
    if req_resp.data["status"] != "pending":
        raise HTTPException(status_code=422, detail="Cererea nu mai este în așteptare.")

    update_resp = (
        supabase_admin.table("account_requests")
        .update({
            "status": "rejected",
            "processed_by": current_user["id"],
            "processed_at": now,
            "rejection_reason": body.rejection_reason,
        })
        .eq("id", request_id)
        .execute()
    )
    return AccountRequestResponse(**update_resp.data[0])
