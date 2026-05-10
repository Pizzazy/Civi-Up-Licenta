"""Tasks & memos router."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, require_pm
from app.schemas.task import (
    TaskCreate,
    TaskMemoCreate,
    TaskMemoResponse,
    TaskResponse,
    TaskUpdate,
)
from app.schemas.user import UserMinimal

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _enrich_task(row: dict, include_memos: bool = False) -> TaskResponse:
    """Attach assignee profile + (optionally) memos to a task row."""
    assignee = None
    if row.get("assigned_to"):
        p = (
            supabase_admin.table("profiles")
            .select("id, full_name, avatar_initials, role")
            .eq("id", row["assigned_to"])
            .maybe_single()
            .execute()
        )
        if p.data:
            assignee = UserMinimal(**p.data)

    memos: List[TaskMemoResponse] = []
    if include_memos:
        m_resp = (
            supabase_admin.table("task_memos")
            .select("*, profiles!author_id(id, full_name, avatar_initials, role)")
            .eq("task_id", row["id"])
            .order("created_at", desc=False)
            .execute()
        )
        for m in m_resp.data or []:
            author = None
            prof = m.pop("profiles", None)
            if prof:
                author = UserMinimal(**prof)
            memos.append(TaskMemoResponse(**m, author=author))

    return TaskResponse(**row, assignee=assignee, memos=memos)


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_to: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    q = supabase_admin.table("tasks").select("*")
    if project_id:
        q = q.eq("project_id", project_id)
    if status_filter:
        q = q.eq("status", status_filter)
    if assigned_to:
        q = q.eq("assigned_to", assigned_to)
    q = q.order(order_by, desc=(order_dir.lower() == "desc"))
    q = q.range(offset, offset + limit - 1)
    resp = q.execute()
    return [_enrich_task(r) for r in (resp.data or [])]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("tasks")
        .select("*")
        .eq("id", task_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Task negăsit.")
    return _enrich_task(resp.data, include_memos=True)


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    body: TaskCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    data = body.model_dump(mode="json", exclude_unset=True)
    data["created_by"] = current_user["id"]
    resp = supabase_admin.table("tasks").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare task.")
    return _enrich_task(resp.data[0])


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    body: TaskUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    # Check ownership or privileged role
    existing = (
        supabase_admin.table("tasks")
        .select("assigned_to, created_by")
        .eq("id", task_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Task negăsit.")

    uid = current_user["id"]
    role = current_user.get("role")
    is_privileged = role in ("ceo", "project_manager")
    is_assigned = existing.data.get("assigned_to") == uid
    is_creator = existing.data.get("created_by") == uid
    if not (is_privileged or is_assigned or is_creator):
        raise HTTPException(status_code=403, detail="Nu ai permisiuni pentru acest task.")

    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nicio modificare trimisă.")

    # Auto-set completed_at
    if update_data.get("status") == "done":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    resp = (
        supabase_admin.table("tasks")
        .update(update_data)
        .eq("id", task_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Task negăsit.")
    return _enrich_task(resp.data[0])


class StatusBody(BaseModel):
    status: str


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: str,
    body: StatusBody,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    update_data: Dict[str, Any] = {
        "status": body.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.status == "done":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

    resp = (
        supabase_admin.table("tasks")
        .update(update_data)
        .eq("id", task_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Task negăsit.")
    return _enrich_task(resp.data[0])


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: Dict[str, Any] = Depends(require_pm),
):
    supabase_admin.table("task_memos").delete().eq("task_id", task_id).execute()
    supabase_admin.table("tasks").delete().eq("id", task_id).execute()


# ══════════════════════════════════════════════════════════════════════════════
# Memos
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/{task_id}/memos", response_model=TaskMemoResponse, status_code=201)
async def create_memo(
    task_id: str,
    body: TaskMemoCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    # Verify task exists
    t = supabase_admin.table("tasks").select("id").eq("id", task_id).maybe_single().execute()
    if not t.data:
        raise HTTPException(status_code=404, detail="Task negăsit.")

    data = body.model_dump(mode="json")
    data["task_id"] = task_id
    data["author_id"] = current_user["id"]
    resp = supabase_admin.table("task_memos").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare memo.")

    row = resp.data[0]
    return TaskMemoResponse(
        **row,
        author=UserMinimal(
            id=current_user["id"],
            full_name=current_user.get("full_name"),
            avatar_initials=current_user.get("avatar_initials"),
            role=current_user.get("role"),
        ),
    )


@router.get("/{task_id}/memos", response_model=List[TaskMemoResponse])
async def list_memos(
    task_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("task_memos")
        .select("*, profiles!author_id(id, full_name, avatar_initials, role)")
        .eq("task_id", task_id)
        .order("created_at", desc=False)
        .execute()
    )
    result: List[TaskMemoResponse] = []
    for m in resp.data or []:
        author = None
        prof = m.pop("profiles", None)
        if prof:
            author = UserMinimal(**prof)
        result.append(TaskMemoResponse(**m, author=author))
    return result


@router.delete("/{task_id}/memos/{memo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memo(
    task_id: str,
    memo_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    memo = (
        supabase_admin.table("task_memos")
        .select("author_id")
        .eq("id", memo_id)
        .eq("task_id", task_id)
        .maybe_single()
        .execute()
    )
    if not memo.data:
        raise HTTPException(status_code=404, detail="Memo negăsit.")

    is_author = memo.data["author_id"] == current_user["id"]
    is_ceo = current_user.get("role") == "ceo"
    if not is_author and not is_ceo:
        raise HTTPException(status_code=403, detail="Doar autorul sau CEO-ul poate șterge acest memo.")

    supabase_admin.table("task_memos").delete().eq("id", memo_id).execute()
