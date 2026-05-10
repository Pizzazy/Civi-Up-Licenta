"""Contacts router — CRUD, CSV import, group counts."""

from __future__ import annotations

import io
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, require_role
from app.services.email_resolver import get_recipient_preview

router = APIRouter(prefix="/contacts", tags=["contacts"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

require_comms = require_role("ceo", "communications")


# ── Schemas ───────────────────────────────────────────────────────────────────


class ContactCreate(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None
    source: Optional[str] = None
    gdpr_consent: bool = False


class ContactUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    is_subscribed: Optional[bool] = None
    gdpr_consent: Optional[bool] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/")
async def list_contacts(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    tag: Optional[str] = None,
    subscribed: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    q = supabase_admin.table("contacts").select("*", count="exact")

    if tag:
        q = q.contains("tags", [tag])
    if subscribed is not None:
        q = q.eq("is_subscribed", subscribed)
    if search:
        q = q.or_(
            f"email.ilike.%{search}%,first_name.ilike.%{search}%,last_name.ilike.%{search}%"
        )

    q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
    resp = q.execute()
    return {"data": resp.data or [], "total": resp.count or 0}


@router.post("/", status_code=201)
async def create_contact(
    body: ContactCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    data = body.model_dump(mode="json", exclude_unset=True)
    if body.gdpr_consent:
        data["gdpr_consent_at"] = datetime.now(timezone.utc).isoformat()
    resp = supabase_admin.table("contacts").insert(data).execute()
    if not resp.data:
        raise HTTPException(500, "Eroare la creare contact.")
    return resp.data[0]


@router.put("/{contact_id}")
async def update_contact(
    contact_id: str,
    body: ContactUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(400, "Nicio modificare trimisă.")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("contacts")
        .update(update_data)
        .eq("id", contact_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Contact negăsit.")
    return resp.data[0]


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    current_user: Dict[str, Any] = Depends(require_comms),
):
    supabase_admin.table("contacts").delete().eq("id", contact_id).execute()


# ── CSV import ────────────────────────────────────────────────────────────────


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    source: str = Form("import_csv"),
    default_tags: str = Form(""),
    current_user: Dict[str, Any] = Depends(require_comms),
):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(400, f"Fișier CSV invalid: {exc}")

    if "email" not in df.columns:
        raise HTTPException(400, "Coloana 'email' este obligatorie.")

    tags = [t.strip() for t in default_tags.split(",") if t.strip()]
    imported = 0
    skipped = 0

    for _, row in df.iterrows():
        email = str(row.get("email", "")).strip().lower()
        if not _EMAIL_RE.match(email):
            skipped += 1
            continue

        record: dict = {
            "email": email,
            "source": source,
        }
        if tags:
            record["tags"] = tags
        for col in ("first_name", "last_name", "phone", "organization"):
            val = row.get(col)
            if pd.notna(val):
                record[col] = str(val).strip()

        try:
            supabase_admin.table("contacts").upsert(
                record, on_conflict="email"
            ).execute()
            imported += 1
        except Exception:
            skipped += 1

    return {"imported": imported, "skipped": skipped}


# ── Group counts ──────────────────────────────────────────────────────────────

GROUPS = ["Newsletter", "Donatori", "Parteneri", "Voluntari", "Echipa", "PM", "Toti"]


@router.get("/groups-count")
async def groups_count(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    result: dict[str, int] = {}
    for group in GROUPS:
        try:
            preview = await get_recipient_preview([group])
            result[group] = preview["total"]
        except Exception:
            result[group] = 0
    return result
