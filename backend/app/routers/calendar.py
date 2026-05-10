"""Calendar events router."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import supabase_admin
from app.dependencies import get_current_user
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[CalendarEventResponse])
async def list_events(
    project_id: Optional[str] = None,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_by: str = Query("event_date"),
    order_dir: str = Query("asc"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    q = supabase_admin.table("calendar_events").select("*")
    if project_id:
        q = q.eq("project_id", project_id)
    if year and month:
        start = f"{year}-{month:02d}-01"
        # last day of month
        if month == 12:
            end = f"{year + 1}-01-01"
        else:
            end = f"{year}-{month + 1:02d}-01"
        q = q.gte("event_date", start).lt("event_date", end)
    elif year:
        q = q.gte("event_date", f"{year}-01-01").lte("event_date", f"{year}-12-31")
    q = q.order(order_by, desc=(order_dir.lower() == "desc"))
    q = q.range(offset, offset + limit - 1)
    resp = q.execute()
    return [CalendarEventResponse(**r) for r in (resp.data or [])]


@router.post("/", response_model=CalendarEventResponse, status_code=201)
async def create_event(
    body: CalendarEventCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    data = body.model_dump(mode="json", exclude_unset=True)
    data["added_by"] = current_user["id"]
    resp = supabase_admin.table("calendar_events").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare eveniment.")
    return CalendarEventResponse(**resp.data[0])


@router.put("/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: str,
    body: CalendarEventUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    # Check ownership or privileged role
    existing = (
        supabase_admin.table("calendar_events")
        .select("added_by")
        .eq("id", event_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Eveniment negăsit.")

    is_adder = existing.data.get("added_by") == current_user["id"]
    is_privileged = current_user.get("role") in ("ceo", "project_manager")
    if not is_adder and not is_privileged:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni pentru acest eveniment.")

    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nicio modificare trimisă.")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("calendar_events")
        .update(update_data)
        .eq("id", event_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Eveniment negăsit.")
    return CalendarEventResponse(**resp.data[0])


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    existing = (
        supabase_admin.table("calendar_events")
        .select("added_by")
        .eq("id", event_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Eveniment negăsit.")

    is_adder = existing.data.get("added_by") == current_user["id"]
    is_privileged = current_user.get("role") in ("ceo", "project_manager")
    if not is_adder and not is_privileged:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni pentru acest eveniment.")

    supabase_admin.table("calendar_events").delete().eq("id", event_id).execute()
