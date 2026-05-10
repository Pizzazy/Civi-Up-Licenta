"""Projects router."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, get_project_member, require_ceo, require_pm
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectStatsResponse,
    ProjectUpdate,
)
from app.schemas.user import UserMinimal

router = APIRouter(prefix="/projects", tags=["projects"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _enrich_project(row: dict) -> ProjectResponse:
    """Attach member list to a project row."""
    members_resp = (
        supabase_admin.table("project_members")
        .select("user_id, profiles!user_id(id, full_name, avatar_initials, role)")
        .eq("project_id", row["id"])
        .execute()
    )
    members: List[UserMinimal] = []
    for m in members_resp.data or []:
        prof = m.get("profiles")
        if prof:
            members.append(UserMinimal(**prof))
    return ProjectResponse(**row, members=members)


def _project_stats(project_id: str, grant_total: float) -> ProjectStatsResponse:
    """Compute financial stats for a project."""
    exp_resp = (
        supabase_admin.table("expenses")
        .select("suma, status")
        .eq("project_id", project_id)
        .execute()
    )
    rows = exp_resp.data or []
    aprobat = sum(r["suma"] for r in rows if r["status"] == "aprobat")
    in_asteptare = sum(r["suma"] for r in rows if r["status"] == "in_asteptare")
    total = aprobat + in_asteptare
    gt = grant_total or 0
    pct = (total / gt * 100) if gt else 0

    # Also get project name
    p_resp = (
        supabase_admin.table("projects")
        .select("name")
        .eq("id", project_id)
        .maybe_single()
        .execute()
    )
    name = p_resp.data["name"] if p_resp.data else ""

    return ProjectStatsResponse(
        project_id=project_id,
        project_name=name,
        grant_total=gt,
        total_cheltuieli=total,
        sold=gt - total,
        procent_utilizare=round(pct, 2),
        cheltuieli_aprobate=aprobat,
        cheltuieli_in_asteptare=in_asteptare,
    )


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    q = supabase_admin.table("projects").select("*")
    if status_filter:
        q = q.eq("status", status_filter)
    q = q.order(order_by, desc=(order_dir.lower() == "desc"))
    q = q.range(offset, offset + limit - 1)
    resp = q.execute()
    return [_enrich_project(r) for r in (resp.data or [])]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("projects")
        .select("*")
        .eq("id", project_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Proiect negăsit.")
    proj = _enrich_project(resp.data)
    proj.stats = _project_stats(project_id, resp.data.get("grant_total") or 0)
    return proj


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: ProjectCreate,
    current_user: Dict[str, Any] = Depends(require_pm),
):
    data = body.model_dump(mode="json", exclude_unset=True)
    data["created_by"] = current_user["id"]
    resp = supabase_admin.table("projects").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare proiect.")
    project = resp.data[0]

    # Auto-add creator as member
    supabase_admin.table("project_members").insert({
        "project_id": project["id"],
        "user_id": current_user["id"],
    }).execute()

    return _enrich_project(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    current_user: Dict[str, Any] = Depends(require_pm),
):
    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nicio modificare trimisă.")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    resp = (
        supabase_admin.table("projects")
        .update(update_data)
        .eq("id", project_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Proiect negăsit.")
    return _enrich_project(resp.data[0])


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(require_ceo),
):
    supabase_admin.table("project_members").delete().eq("project_id", project_id).execute()
    supabase_admin.table("projects").delete().eq("id", project_id).execute()


# ── Members ──────────────────────────────────────────────────────────────────

class AddMemberBody(BaseModel):
    user_id: str


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=201)
async def add_member(
    project_id: str,
    body: AddMemberBody,
    current_user: Dict[str, Any] = Depends(require_pm),
):
    # Check project exists
    proj = supabase_admin.table("projects").select("id").eq("id", project_id).maybe_single().execute()
    if not proj.data:
        raise HTTPException(status_code=404, detail="Proiect negăsit.")

    # Check not already member
    existing = (
        supabase_admin.table("project_members")
        .select("id")
        .eq("project_id", project_id)
        .eq("user_id", body.user_id)
        .maybe_single()
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=422, detail="Utilizatorul este deja membru.")

    resp = supabase_admin.table("project_members").insert({
        "project_id": project_id,
        "user_id": body.user_id,
    }).execute()

    row = resp.data[0]
    # Fetch profile for response
    profile_resp = (
        supabase_admin.table("profiles")
        .select("id, full_name, avatar_initials, role")
        .eq("id", body.user_id)
        .maybe_single()
        .execute()
    )
    return ProjectMemberResponse(
        **row,
        profile=UserMinimal(**profile_resp.data) if profile_resp.data else None,
    )


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: str,
    user_id: str,
    current_user: Dict[str, Any] = Depends(require_pm),
):
    supabase_admin.table("project_members").delete().eq(
        "project_id", project_id
    ).eq("user_id", user_id).execute()


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/stats", response_model=ProjectStatsResponse)
async def project_stats(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    proj = (
        supabase_admin.table("projects")
        .select("id, grant_total")
        .eq("id", project_id)
        .maybe_single()
        .execute()
    )
    if not proj.data:
        raise HTTPException(status_code=404, detail="Proiect negăsit.")
    return _project_stats(project_id, proj.data.get("grant_total") or 0)
