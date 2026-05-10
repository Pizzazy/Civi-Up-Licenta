"""Donations router."""

from __future__ import annotations

from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from postgrest.exceptions import APIError

from app.config import settings
from app.database import supabase_admin
from app.dependencies import get_current_user, require_ceo, require_finance
from app.schemas.donation import (
    DonationCreate,
    DonationResponse,
    DonationSummary,
    DonationUpdate,
)
from app.schemas.user import UserMinimal

router = APIRouter(prefix="/donations", tags=["donations"])

ALLOWED_DOC_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}


# ── helpers ──────────────────────────────────────────────────────────────────

def _enrich_donation(row: dict) -> DonationResponse:
    resp = DonationResponse(**row)
    if row.get("added_by"):
        p = (
            supabase_admin.table("profiles")
            .select("id, full_name, avatar_initials, role")
            .eq("id", row["added_by"])
            .maybe_single()
            .execute()
        )
        if p.data:
            resp.added_by_profile = UserMinimal(**p.data)
    return resp


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[DonationResponse])
async def list_donations(
    donation_type: Optional[str] = None,
    income_category: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    project_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    current_user: Dict[str, Any] = Depends(require_finance),
):
    q = supabase_admin.table("donations").select("*")
    if donation_type:
        q = q.eq("donation_type", donation_type)
    if income_category:
        q = q.eq("income_category", income_category)
    if min_amount is not None:
        q = q.gte("suma", min_amount)
    if max_amount is not None:
        q = q.lte("suma", max_amount)
    if date_from:
        q = q.gte("donation_date", date_from)
    if date_to:
        q = q.lte("donation_date", date_to)
    if project_id:
        q = q.eq("project_id", project_id)
    q = q.order(order_by, desc=(order_dir.lower() == "desc"))
    q = q.range(offset, offset + limit - 1)
    resp = q.execute()
    return [_enrich_donation(r) for r in (resp.data or [])]


@router.get("/{donation_id}", response_model=DonationResponse)
async def get_donation(
    donation_id: str,
    current_user: Dict[str, Any] = Depends(require_finance),
):
    resp = (
        supabase_admin.table("donations")
        .select("*")
        .eq("id", donation_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Venit negăsit.")
    return _enrich_donation(resp.data)


@router.get("/summary", response_model=DonationSummary)
async def donation_summary(
    year: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(require_finance),
):
    q = supabase_admin.table("donations").select("suma, income_category, donation_date")
    if year:
        q = q.gte("donation_date", f"{year}-01-01").lte("donation_date", f"{year}-12-31")
    resp = q.execute()
    rows = resp.data or []

    by_category: Dict[str, float] = {}
    by_month: Dict[str, float] = {}
    total = 0.0

    for r in rows:
        s = float(r.get("suma") or 0)
        total += s
        cat = r.get("income_category") or "alta"
        by_category[cat] = by_category.get(cat, 0) + s

        d = r.get("donation_date")
        if d:
            month_key = d[:7]  # "2025-03"
            by_month[month_key] = by_month.get(month_key, 0) + s

    month_list = [{"month": k, "total": v} for k, v in sorted(by_month.items())]

    return DonationSummary(by_category=by_category, by_month=month_list, total=total)


@router.post("/", response_model=DonationResponse, status_code=201)
async def create_donation(
    body: DonationCreate,
    current_user: Dict[str, Any] = Depends(require_finance),
):
    data = body.model_dump(mode="json", exclude_unset=True)
    data["added_by"] = current_user["id"]
    if not data.get("payment_status"):
        data["payment_status"] = "achitat" if data.get("proof_url") else "in_asteptare_dovada"
    try:
        resp = supabase_admin.table("donations").insert(data).execute()
    except APIError as exc:
        msg = str(exc)
        if "Could not find the 'document_type' column" in msg or "schema cache" in msg:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Schema DB incomplet pentru venituri. Lipsesc coloane noi (document_type, invoice_url, proof_url, payment_status). "
                    "Rulează migrarea SQL pentru tabelul donations."
                ),
            ) from exc
        raise
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare donație.")
    return _enrich_donation(resp.data[0])


@router.put("/{donation_id}", response_model=DonationResponse)
async def update_donation(
    donation_id: str,
    body: DonationUpdate,
    current_user: Dict[str, Any] = Depends(require_finance),
):
    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nicio modificare trimisă.")
    if "proof_url" in update_data and "payment_status" not in update_data:
        update_data["payment_status"] = "achitat" if update_data.get("proof_url") else "in_asteptare_dovada"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("donations")
        .update(update_data)
        .eq("id", donation_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Donație negăsită.")
    return _enrich_donation(resp.data[0])


@router.delete("/{donation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_donation(
    donation_id: str,
    current_user: Dict[str, Any] = Depends(require_ceo),
):
    supabase_admin.table("donations").delete().eq("id", donation_id).execute()


@router.post("/upload-document")
async def upload_income_document(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_finance),
):
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Tip fișier nepermis. Sunt acceptate PDF/JPG/PNG/WEBP.")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fișierul depășește limita de 10MB.")

    uid = current_user["id"]
    safe_name = (file.filename or "document").replace(" ", "_")
    storage_path = f"finance-docs/income/{uid}/{uuid.uuid4()}_{safe_name}"

    try:
        supabase_admin.storage.from_("finance-docs").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Eroare la upload document: {exc}") from exc

    url = f"{settings.SUPABASE_URL}/storage/v1/object/public/finance-docs/{storage_path}"
    return {"url": url, "path": storage_path}


@router.patch("/{donation_id}/proof", response_model=DonationResponse)
async def add_income_proof(
    donation_id: str,
    body: dict,
    current_user: Dict[str, Any] = Depends(require_finance),
):
    proof_url = body.get("proof_url")
    if not proof_url:
        raise HTTPException(status_code=400, detail="proof_url este obligatoriu.")

    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("donations")
        .update({"proof_url": proof_url, "payment_status": "achitat", "updated_at": now})
        .eq("id", donation_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Venit negăsit.")
    return _enrich_donation(resp.data[0])
