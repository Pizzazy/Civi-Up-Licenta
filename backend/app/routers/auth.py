"""Authentication router — login, logout, refresh, me, register."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.database import supabase, supabase_admin
from app.dependencies import get_current_user
from app.schemas.user import ProfileResponse

router = APIRouter(prefix="/auth", tags=["auth"])


# ── request bodies ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: ProfileResponse


# ── endpoints ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """Sign in with email + password via Supabase Auth."""
    try:
        auth_resp = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Autentificare eșuată: {exc}",
        ) from exc

    session = auth_resp.session
    user_auth = auth_resp.user

    if not session or not user_auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email sau parolă incorectă.",
        )

    # Fetch profile
    profile_resp = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", user_auth.id)
        .maybe_single()
        .execute()
    )

    if not profile_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profilul utilizatorului nu există.",
        )

    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user=ProfileResponse(**profile_resp.data),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Sign out — invalidate server session."""
    try:
        supabase.auth.sign_out()
    except Exception:
        pass  # best-effort


@router.post("/refresh", response_model=LoginResponse)
async def refresh(body: RefreshRequest):
    """Exchange a refresh token for a new access token."""
    try:
        auth_resp = supabase.auth.refresh_session(body.refresh_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Refresh eșuat: {exc}",
        ) from exc

    session = auth_resp.session
    user_auth = auth_resp.user

    if not session or not user_auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalid sau expirat.",
        )

    profile_resp = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", user_auth.id)
        .maybe_single()
        .execute()
    )

    if not profile_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profilul utilizatorului nu există.",
        )

    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user=ProfileResponse(**profile_resp.data),
    )


@router.get("/me", response_model=ProfileResponse)
async def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return ProfileResponse(**current_user)


# ── Register (create organisation + CEO) ─────────────────────────────────────

class RegisterRequest(BaseModel):
    org_name: str
    full_name: str
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    message: str
    user: ProfileResponse


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: RegisterRequest):
    """Public — create a new organisation with a CEO account.

    Steps:
    1. Create a Supabase Auth user (email + password).
    2. Insert a profile row (role = ceo, department = org_name).
    """
    # Validate inputs
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Parola trebuie să aibă cel puțin 6 caractere.")
    if not body.org_name.strip():
        raise HTTPException(status_code=422, detail="Numele organizației este obligatoriu.")
    if not body.full_name.strip():
        raise HTTPException(status_code=422, detail="Numele CEO-ului este obligatoriu.")

    # 1. Create Supabase Auth user
    try:
        auth_resp = supabase_admin.auth.admin.create_user(
            {
                "email": body.email,
                "password": body.password,
                "email_confirm": True,  # auto-confirm so they can login immediately
            }
        )
    except Exception as exc:
        msg = str(exc)
        if "already been registered" in msg or "already exists" in msg:
            raise HTTPException(
                status_code=409,
                detail="Acest email este deja înregistrat.",
            ) from exc
        raise HTTPException(
            status_code=500,
            detail=f"Eroare la crearea contului: {msg}",
        ) from exc

    new_user = auth_resp.user
    if not new_user:
        raise HTTPException(status_code=500, detail="Eroare la crearea contului de autentificare.")

    # 2. Create profile row (department = org_name for now)
    initials = "".join(w[0] for w in body.full_name.split() if w).upper()[:2] or "U"
    now = datetime.now(timezone.utc).isoformat()

    profile_data = {
        "id": new_user.id,
        "full_name": body.full_name.strip(),
        "avatar_initials": initials,
        "role": "ceo",
        "status": "activ",
        "department": body.org_name.strip(),  # org name stored in department
        "created_at": now,
        "updated_at": now,
    }

    try:
        prof_resp = supabase_admin.table("profiles").insert(profile_data).execute()
    except Exception as exc:
        # Rollback: delete auth user
        try:
            supabase_admin.auth.admin.delete_user(new_user.id)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Eroare la crearea profilului: {exc}",
        ) from exc

    if not prof_resp.data:
        try:
            supabase_admin.auth.admin.delete_user(new_user.id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Eroare la crearea profilului.")

    return RegisterResponse(
        message="Organizația a fost creată cu succes.",
        user=ProfileResponse(**prof_resp.data[0]),
    )
