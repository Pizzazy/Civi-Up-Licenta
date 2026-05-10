"""FastAPI dependencies — authentication, authorisation, project membership."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, Dict, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import supabase_admin

security = HTTPBearer()


# ── helpers ──────────────────────────────────────────────────────────────────

def _verify_token(token: str) -> str:
    """Verify JWT via Supabase Auth and return the user ID."""
    try:
        auth_resp = supabase_admin.auth.get_user(token)
        if auth_resp and auth_resp.user:
            return auth_resp.user.id
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid sau expirat.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalid sau expirat: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ── get_current_user ─────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """Validate JWT via Supabase, fetch profile, bump *last_login_at*."""

    user_id = _verify_token(credentials.credentials)

    # Fetch profile
    resp = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )

    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profilul utilizatorului nu a fost găsit.",
        )

    # Bump last_login_at (fire-and-forget style)
    try:
        supabase_admin.table("profiles").update(
            {"last_login_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", user_id).execute()
    except Exception:
        pass  # non-critical

    return resp.data


# ── role checks ──────────────────────────────────────────────────────────────

def require_role(*roles: str) -> Callable:
    """Factory: returns a dependency that enforces role membership."""

    async def _checker(
        current_user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acces interzis. Rolul '{current_user.get('role')}' nu are permisiuni. Roluri necesare: {', '.join(roles)}.",
            )
        return current_user

    return _checker


require_ceo = require_role("ceo")
require_finance = require_role("ceo", "financial_officer")
require_pm = require_role("ceo", "project_manager")


# ── project membership ───────────────────────────────────────────────────────

async def get_project_member(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Verify user is a member of *project_id* or has a privileged role."""

    privileged_roles = ("ceo", "project_manager")
    if current_user.get("role") in privileged_roles:
        return current_user

    membership = (
        supabase_admin.table("project_members")
        .select("id")
        .eq("project_id", project_id)
        .eq("user_id", current_user["id"])
        .maybe_single()
        .execute()
    )

    if not membership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nu ești membru al acestui proiect.",
        )

    return current_user


__all__ = [
    "get_current_user",
    "require_role",
    "require_ceo",
    "require_finance",
    "require_pm",
    "get_project_member",
    "security",
]
