"""Expenses router."""

from __future__ import annotations

from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from postgrest.exceptions import APIError

from app.config import settings
from app.database import supabase_admin
from app.dependencies import get_current_user, require_finance
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.schemas.user import UserMinimal

router = APIRouter(prefix="/expenses", tags=["expenses"])

ALLOWED_DOC_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}


# ── helpers ──────────────────────────────────────────────────────────────────

def _enrich_expense(row: dict) -> ExpenseResponse:
    """Attach profile data to added_by / approved_by."""
    resp = ExpenseResponse(**row)
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
    if row.get("approved_by"):
        p = (
            supabase_admin.table("profiles")
            .select("id, full_name, avatar_initials, role")
            .eq("id", row["approved_by"])
            .maybe_single()
            .execute()
        )
        if p.data:
            resp.approved_by_profile = UserMinimal(**p.data)
    return resp


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ExpenseResponse])
async def list_expenses(
    project_id: Optional[str] = None,
    is_null: Optional[str] = None,  # 'project_id' to filter ONG-level expenses (project_id IS NULL)
    is_not_null: Optional[str] = None,  # 'project_id' to filter project-level expenses (project_id IS NOT NULL)
    status_filter: Optional[str] = Query(None, alias="status"),
    document_type: Optional[str] = None,
    category: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    q = supabase_admin.table("expenses").select("*")
    if project_id:
        q = q.eq("project_id", project_id)
    if is_null == "project_id":
        q = q.is_("project_id", "null")
    if is_not_null == "project_id":
        q = q.not_.is_("project_id", "null")
    if status_filter:
        q = q.eq("status", status_filter)
    if document_type:
        q = q.eq("document_type", document_type)
    if category:
        q = q.eq("category", category)
    if min_amount is not None:
        q = q.gte("suma", min_amount)
    if max_amount is not None:
        q = q.lte("suma", max_amount)
    if date_from:
        q = q.gte("expense_date", date_from)
    if date_to:
        q = q.lte("expense_date", date_to)
    q = q.order(order_by, desc=(order_dir.lower() == "desc"))
    q = q.range(offset, offset + limit - 1)
    resp = q.execute()
    return [_enrich_expense(r) for r in (resp.data or [])]


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("expenses")
        .select("*")
        .eq("id", expense_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Cheltuială negăsită.")
    return _enrich_expense(resp.data)


@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    body: ExpenseCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    data = body.model_dump(mode="json", exclude_unset=True)
    data["added_by"] = current_user["id"]
    data["status"] = "in_asteptare"
    if not data.get("payment_status"):
        data["payment_status"] = "achitat" if data.get("proof_url") else "in_asteptare_dovada"
    try:
        resp = supabase_admin.table("expenses").insert(data).execute()
    except APIError as exc:
        msg = str(exc)
        if "Could not find the 'document_type' column" in msg or "schema cache" in msg:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Schema DB incomplet pentru cheltuieli. Lipsesc coloane noi (document_type, invoice_url, proof_url, payment_status). "
                    "Rulează migrarea SQL pentru tabelul expenses."
                ),
            ) from exc
        raise
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare cheltuială.")
    return _enrich_expense(resp.data[0])


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    body: ExpenseUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nicio modificare trimisă.")
    if "proof_url" in update_data and "payment_status" not in update_data:
        update_data["payment_status"] = "achitat" if update_data.get("proof_url") else "in_asteptare_dovada"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("expenses")
        .update(update_data)
        .eq("id", expense_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Cheltuială negăsită.")
    return _enrich_expense(resp.data[0])


@router.patch("/{expense_id}/approve", response_model=ExpenseResponse)
async def approve_expense(
    expense_id: str,
    current_user: Dict[str, Any] = Depends(require_finance),
):
    existing = (
        supabase_admin.table("expenses")
        .select("status")
        .eq("id", expense_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cheltuială negăsită.")
    if existing.data["status"] != "in_asteptare":
        raise HTTPException(status_code=422, detail="Cheltuiala nu mai este în așteptare.")

    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("expenses")
        .update({
            "status": "aprobat",
            "approved_by": current_user["id"],
            "approved_at": now,
            "updated_at": now,
        })
        .eq("id", expense_id)
        .execute()
    )
    return _enrich_expense(resp.data[0])


class RejectBody(BaseModel):
    rejection_reason: str


@router.patch("/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_id: str,
    body: RejectBody,
    current_user: Dict[str, Any] = Depends(require_finance),
):
    existing = (
        supabase_admin.table("expenses")
        .select("status")
        .eq("id", expense_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cheltuială negăsită.")
    if existing.data["status"] != "in_asteptare":
        raise HTTPException(status_code=422, detail="Cheltuiala nu mai este în așteptare.")

    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("expenses")
        .update({
            "status": "respins",
            "approved_by": current_user["id"],
            "approved_at": now,
            "rejection_reason": body.rejection_reason,
            "updated_at": now,
        })
        .eq("id", expense_id)
        .execute()
    )
    return _enrich_expense(resp.data[0])


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    is_finance = current_user.get("role") in ("ceo", "financial_officer")

    if not is_finance:
        # Non-finance can only delete own pending expenses
        existing = (
            supabase_admin.table("expenses")
            .select("added_by, status")
            .eq("id", expense_id)
            .maybe_single()
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Cheltuială negăsită.")
        if existing.data["added_by"] != current_user["id"] or existing.data["status"] != "in_asteptare":
            raise HTTPException(
                status_code=403,
                detail="Poți șterge doar cheltuielile proprii aflate în așteptare.",
            )

    supabase_admin.table("expenses").delete().eq("id", expense_id).execute()


@router.post("/upload-document")
async def upload_expense_document(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Tip fișier nepermis. Sunt acceptate PDF/JPG/PNG/WEBP.")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fișierul depășește limita de 10MB.")

    uid = current_user["id"]
    safe_name = (file.filename or "document").replace(" ", "_")
    storage_path = f"finance-docs/expenses/{uid}/{uuid.uuid4()}_{safe_name}"

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


@router.patch("/{expense_id}/proof", response_model=ExpenseResponse)
async def add_expense_proof(
    expense_id: str,
    body: dict,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    proof_url = body.get("proof_url")
    if not proof_url:
        raise HTTPException(status_code=400, detail="proof_url este obligatoriu.")

    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("expenses")
        .update({"proof_url": proof_url, "payment_status": "achitat", "updated_at": now})
        .eq("id", expense_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Cheltuială negăsită.")
    return _enrich_expense(resp.data[0])
