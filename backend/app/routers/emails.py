"""Emails & email templates router — plus campaigns, unsubscribe, stats."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from app.config import settings
from app.database import supabase_admin
from app.dependencies import get_current_user, require_role
from app.schemas.email import (
    EmailColumn,
    EmailCreate,
    EmailResponse,
    EmailTemplateCreate,
    EmailTemplateResponse,
    EmailTemplateUpdate,
    EmailUpdate,
)
from app.services.email_campaign import (
    send_campaign,
    sync_campaign_stats,
    verify_unsubscribe_token,
)
from app.services.email_resolver import get_recipient_preview
from app.services.email_service import get_email_provider

router = APIRouter(prefix="/emails", tags=["emails"])


# ══════════════════════════════════════════════════════════════════════════════
# Emails
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=List[EmailResponse])
async def list_emails(
    kanban_column: Optional[str] = None,
    is_starred: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    q = supabase_admin.table("emails").select("*").eq("from_user_id", current_user["id"])
    if kanban_column:
        q = q.eq("kanban_column", kanban_column)
    if is_starred is not None:
        q = q.eq("is_starred", is_starred)
    q = q.order(order_by, desc=(order_dir.lower() == "desc"))
    q = q.range(offset, offset + limit - 1)
    resp = q.execute()
    return [EmailResponse(**r) for r in (resp.data or [])]


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("emails")
        .select("*")
        .eq("id", email_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Email negăsit.")
    return EmailResponse(**resp.data)


@router.post("/", response_model=EmailResponse, status_code=201)
async def create_email(
    body: EmailCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if not body.is_draft and (not body.subject or not body.subject.strip()):
        raise HTTPException(status_code=400, detail="Subiectul este obligatoriu pentru trimitere.")
    if not body.is_draft and not body.to_groups and not body.to_emails:
        raise HTTPException(status_code=400, detail="Trebuie specificat cel puțin un grup sau un email.")

    data = body.model_dump(mode="json", exclude_unset=True)
    data["from_user_id"] = current_user["id"]
    data["from_name"] = settings.EMAIL_FROM_NAME
    data["from_email"] = settings.EMAIL_FROM_ADDRESS

    # Convert enum lists to plain string lists for Postgres array columns
    if "to_groups" in data:
        data["to_groups"] = [g.value if hasattr(g, "value") else g for g in data["to_groups"]]

    data["is_draft"] = bool(body.is_draft)

    resp = supabase_admin.table("emails").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare email.")

    created = resp.data[0]
    if body.is_draft:
        return EmailResponse(**created)

    campaign_result = await send_campaign(
        subject=body.subject or "",
        body_html=body.body_html or (body.body_text or "").replace("\n", "<br />"),
        body_text=body.body_text or "",
        to_groups=data.get("to_groups") or [],
        to_emails=data.get("to_emails") or [],
        created_by=current_user["id"],
        email_id=created["id"],
    )

    if campaign_result.get("sent", 0) <= 0:
        error_text = (campaign_result.get("errors") or ["Trimiterea a eșuat în provider."])[0]
        raise HTTPException(status_code=502, detail=f"Emailul nu a fost livrat: {error_text}")

    refreshed = (
        supabase_admin.table("emails")
        .select("*")
        .eq("id", created["id"])
        .maybe_single()
        .execute()
    )
    return EmailResponse(**(refreshed.data or created))


class ColumnBody(BaseModel):
    kanban_column: EmailColumn


@router.patch("/{email_id}/column", response_model=EmailResponse)
async def move_column(
    email_id: str,
    body: ColumnBody,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("emails")
        .update({
            "kanban_column": body.kanban_column.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", email_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Email negăsit.")
    return EmailResponse(**resp.data[0])


@router.patch("/{email_id}/read", response_model=EmailResponse)
async def mark_read(
    email_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("emails")
        .update({
            "is_read": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", email_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Email negăsit.")
    return EmailResponse(**resp.data[0])


@router.patch("/{email_id}/star", response_model=EmailResponse)
async def toggle_star(
    email_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    # Fetch current value
    existing = (
        supabase_admin.table("emails")
        .select("is_starred")
        .eq("id", email_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Email negăsit.")

    resp = (
        supabase_admin.table("emails")
        .update({
            "is_starred": not existing.data["is_starred"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", email_id)
        .execute()
    )
    return EmailResponse(**resp.data[0])


@router.delete("/{email_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email(
    email_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    supabase_admin.table("emails").delete().eq("id", email_id).execute()


# ══════════════════════════════════════════════════════════════════════════════
# Email Templates
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/templates", response_model=List[EmailTemplateResponse])
async def list_templates(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("email_templates")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [EmailTemplateResponse(**r) for r in (resp.data or [])]


@router.post("/templates", response_model=EmailTemplateResponse, status_code=201)
async def create_template(
    body: EmailTemplateCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    data = body.model_dump(mode="json", exclude_unset=True)
    data["created_by"] = current_user["id"]
    resp = supabase_admin.table("email_templates").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare template.")
    return EmailTemplateResponse(**resp.data[0])


@router.put("/templates/{template_id}", response_model=EmailTemplateResponse)
async def update_template(
    template_id: str,
    body: EmailTemplateUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nicio modificare trimisă.")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase_admin.table("email_templates")
        .update(update_data)
        .eq("id", template_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Template negăsit.")
    return EmailTemplateResponse(**resp.data[0])


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    supabase_admin.table("email_templates").delete().eq("id", template_id).execute()


# ══════════════════════════════════════════════════════════════════════════════
# Campaigns
# ══════════════════════════════════════════════════════════════════════════════

require_comms = require_role("ceo", "communications", "community_manager")


class CampaignSendBody(BaseModel):
    subject: str
    body_html: str
    body_text: str = ""
    to_groups: List[str] = []
    to_emails: List[str] = []
    email_id: Optional[str] = None


@router.post("/send-campaign")
async def send_campaign_endpoint(
    body: CampaignSendBody,
    current_user: Dict[str, Any] = Depends(require_comms),
):
    if not body.to_groups and not body.to_emails:
        raise HTTPException(400, "Trebuie specificat cel puțin un grup sau un email.")
    result = await send_campaign(
        subject=body.subject,
        body_html=body.body_html,
        body_text=body.body_text,
        to_groups=body.to_groups,
        to_emails=body.to_emails,
        created_by=current_user["id"],
        email_id=body.email_id,
    )
    return result


class PreviewRecipientsBody(BaseModel):
    to_groups: List[str] = []
    to_emails: List[str] = []


@router.post("/preview-recipients")
async def preview_recipients(
    body: PreviewRecipientsBody,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await get_recipient_preview(body.to_groups, body.to_emails)


@router.get("/campaigns")
async def list_campaigns(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    q = supabase_admin.table("email_campaigns").select("*", count="exact")
    if status_filter:
        q = q.eq("status", status_filter)
    q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
    resp = q.execute()
    return {"data": resp.data or [], "total": resp.count or 0}


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = (
        supabase_admin.table("email_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Campanie negăsită.")
    return resp.data


@router.get("/campaigns/{campaign_id}/sync-stats")
async def campaign_sync_stats(
    campaign_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await sync_campaign_stats(campaign_id)


# ── Unsubscribe (public — no auth) ───────────────────────────────────────────


class UnsubscribeBody(BaseModel):
    email: str
    token: str


@router.post("/unsubscribe")
async def unsubscribe(body: UnsubscribeBody):
    if not verify_unsubscribe_token(body.email, body.token):
        raise HTTPException(403, "Token de dezabonare invalid.")
    supabase_admin.table("contacts").update(
        {"is_subscribed": False}
    ).eq("email", body.email.strip().lower()).execute()
    return {"success": True, "message": "Te-ai dezabonat cu succes."}


# ── Aggregate stats ───────────────────────────────────────────────────────────

require_stats = require_role("ceo", "communications")


@router.get("/stats")
async def email_stats(
    current_user: Dict[str, Any] = Depends(require_stats),
):
    # DB aggregates
    camp_resp = supabase_admin.table("email_campaigns").select("*").execute()
    campaigns = camp_resp.data or []
    total_campaigns = len(campaigns)
    total_sent = sum(c.get("sent_count", 0) for c in campaigns)

    # Brevo live stats
    try:
        provider = get_email_provider()
        brevo = await provider.get_stats()
    except Exception:
        brevo = {}

    return {
        "total_campaigns": total_campaigns,
        "total_sent": total_sent,
        "avg_open_rate": brevo.get("open_rate", 0),
        "avg_click_rate": brevo.get("click_rate", 0),
        "brevo_stats": brevo,
    }


# ── Image upload for email builder ───────────────────────────────────────────

ALLOWED_IMG_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}


@router.post("/upload-image")
async def upload_email_image(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Upload an image to Supabase Storage and return the public URL."""
    if file.content_type not in ALLOWED_IMG_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tip fișier nepermis: {file.content_type}. Permise: JPEG, PNG, GIF, WebP, SVG.",
        )
    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fișierul depășește limita de 5 MB.")

    uid = current_user["id"]
    file_id = str(uuid.uuid4())
    safe_name = (file.filename or "image").replace(" ", "_")
    storage_path = f"email-images/{uid}/{file_id}_{safe_name}"

    try:
        supabase_admin.storage.from_("email-images").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type or "image/png"},
        )
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/email-images/{storage_path}"
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Eroare la upload: {exc}") from exc

    return {"url": public_url, "path": storage_path}
