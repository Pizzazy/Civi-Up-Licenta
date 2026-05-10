"""Campaign helpers — personalisation, unsubscribe tokens, send orchestration."""

from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException

from app.config import settings
from app.database import supabase_admin
from app.services.email_resolver import resolve_groups
from app.services.email_service import (
    BulkEmailResult,
    EmailMessage,
    EmailRecipient,
    get_email_provider,
)

# ── Unsubscribe token ────────────────────────────────────────────────────────


def generate_unsubscribe_token(email: str) -> str:
    digest = hmac.new(
        settings.JWT_SECRET.encode(),
        email.encode(),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def verify_unsubscribe_token(email: str, token: str) -> bool:
    return hmac.compare_digest(generate_unsubscribe_token(email), token)


# ── Footer ────────────────────────────────────────────────────────────────────

UNSUBSCRIBE_FOOTER = """
<table width="100%" cellpadding="0" cellspacing="0"
  style="margin-top:32px;border-top:1px solid #e2e8f0;">
  <tr><td style="padding:16px 40px;text-align:center;background:#f8fafc;">
    <p style="font-size:11px;color:#94a3b8;margin:0;font-family:sans-serif;">
      Ai primit acest email deoarece ești în baza noastră de date.<br/>
      <a href="https://civiup.ro/unsubscribe?email={{email}}&token={{token}}"
        style="color:#7c3aed;text-decoration:underline;">Dezabonare newsletter</a>
    &nbsp;&middot;&nbsp;CIviUp România
    </p>
  </td></tr>
</table>
"""


def add_unsubscribe_footer(html: str, email: str) -> str:
    token = generate_unsubscribe_token(email)
    footer = UNSUBSCRIBE_FOOTER.replace("{{email}}", email).replace(
        "{{token}}", token
    )
    if "</body>" in html:
        return html.replace("</body>", footer + "</body>")
    return html + footer


# ── Personalisation ───────────────────────────────────────────────────────────


def personalize(html: str, recipient: EmailRecipient) -> str:
    first = recipient.name.split()[0] if recipient.name.strip() else "cititor"
    html = html.replace("{{first_name}}", first)
    html = html.replace("{{first name}}", first)
    html = html.replace("{{firstname}}", first)
    html = html.replace("{{full_name}}", recipient.name)
    html = html.replace("{{email}}", recipient.email)
    return add_unsubscribe_footer(html, recipient.email)


# ── Campaign orchestration ────────────────────────────────────────────────────


async def send_campaign(
    subject: str,
    body_html: str,
    body_text: str,
    to_groups: List[str],
    to_emails: List[str],
    created_by: str,
    email_id: str | None = None,
) -> dict:
    """Resolve recipients, personalise, send, persist campaign record."""

    sender_email = (settings.EMAIL_FROM_ADDRESS or "").strip()
    sender_name = (settings.EMAIL_FROM_NAME or "").strip() or "CiviUp"
    if not sender_email:
        raise HTTPException(503, "EMAIL_FROM_ADDRESS nu este configurat.")

    recipients = await resolve_groups(to_groups, to_emails)
    if not recipients:
        raise HTTPException(400, "Niciun destinatar găsit.")

    # 1. Insert campaign with status=sending (best effort, schema may differ)
    campaign_data = {
        "subject": subject,
        "body_html": body_html,
        "body_text": body_text or "",
        "to_groups": to_groups,
        "to_emails": to_emails,
        "recipient_count": len(recipients),
        "status": "sending",
        "created_by": created_by,
    }
    campaign_id = None
    try:
        camp_resp = (
            supabase_admin.table("email_campaigns").insert(campaign_data).execute()
        )
        campaign_id = camp_resp.data[0]["id"] if camp_resp.data else None
    except Exception:
        # Do not block delivery if campaign logging schema is outdated.
        campaign_id = None

    # 2. Build personalised messages
    provider = get_email_provider()
    messages: List[EmailMessage] = []
    for r in recipients:
        personalised_html = personalize(body_html, r)
        messages.append(
            EmailMessage(
                to=[r],
                subject=subject,
                html_content=personalised_html,
                text_content=body_text,
                from_email=sender_email,
                from_name=sender_name,
                tags=["campaign", campaign_id or "unknown"],
                custom_id=campaign_id or "",
            )
        )

    # 3. Send
    result: BulkEmailResult = await provider.send_bulk(messages)

    # 4. Update campaign record
    now_iso = datetime.now(timezone.utc).isoformat()
    update_payload = {
        "status": "sent" if result.failed == 0 else ("failed" if result.sent == 0 else "partial"),
        "sent_count": result.sent,
        "failed_count": result.failed,
        "sent_at": now_iso,
        "provider_ids": result.message_ids,
        "errors": result.errors[:20],  # cap stored errors
    }
    if campaign_id:
        try:
            supabase_admin.table("email_campaigns").update(update_payload).eq(
                "id", campaign_id
            ).execute()
        except Exception:
            pass

    # 5. Optionally mark the source email as sent
    if email_id:
        email_update = {"updated_at": now_iso}
        if result.sent > 0:
            email_update.update({"sent_at": now_iso, "is_draft": False})
        else:
            email_update.update({"sent_at": None, "is_draft": True})
        try:
            supabase_admin.table("emails").update(email_update).eq("id", email_id).execute()
        except Exception:
            pass

    return {
        "campaign_id": campaign_id,
        "recipient_count": len(recipients),
        "sent": result.sent,
        "failed": result.failed,
        "errors": result.errors[:10],
    }


async def sync_campaign_stats(campaign_id: str) -> dict:
    """Fetch latest stats from Brevo and update the campaign row."""
    provider = get_email_provider()
    stats = await provider.get_stats()

    if campaign_id:
        try:
            supabase_admin.table("email_campaigns").update(
                {"brevo_stats": stats}
            ).eq("id", campaign_id).execute()
        except Exception:
            pass

    try:
        resp = (
            supabase_admin.table("email_campaigns")
            .select("*")
            .eq("id", campaign_id)
            .maybe_single()
            .execute()
        )
        return resp.data or {}
    except Exception:
        return {"id": campaign_id, "brevo_stats": stats}
