"""Brevo email provider — send single / bulk emails via httpx."""

from __future__ import annotations

import asyncio
from typing import List

import httpx
from fastapi import HTTPException
from pydantic import BaseModel

from app.config import settings


# ── Models ────────────────────────────────────────────────────────────────────


class EmailRecipient(BaseModel):
    email: str
    name: str = ""


class EmailMessage(BaseModel):
    to: List[EmailRecipient]
    subject: str
    html_content: str
    text_content: str = ""
    from_email: str = ""
    from_name: str = ""
    tags: List[str] = []
    custom_id: str = ""


class EmailResult(BaseModel):
    success: bool
    message_id: str = ""
    error: str = ""


class BulkEmailResult(BaseModel):
    total: int
    sent: int
    failed: int
    errors: List[str] = []
    message_ids: List[str] = []


# ── Provider ──────────────────────────────────────────────────────────────────


class BrevoProvider:
    """Thin async wrapper around the Brevo transactional-email API."""

    BREVO_BASE = "https://api.brevo.com/v3"

    def _headers(self) -> dict:
        return {
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # ── single ────────────────────────────────────────────────

    async def send_single(self, message: EmailMessage) -> EmailResult:
        sender_email = (settings.EMAIL_FROM_ADDRESS or "").strip()
        sender_name = (settings.EMAIL_FROM_NAME or "").strip() or "CiviUp"
        if not sender_email:
            return EmailResult(
                success=False,
                error="EMAIL_FROM_ADDRESS nu este configurat în backend/.env.",
            )

        to_recipients = []
        for recipient in message.to:
            item = {"email": recipient.email}
            recipient_name = (recipient.name or "").strip()
            if recipient_name:
                item["name"] = recipient_name
            to_recipients.append(item)

        payload = {
            "sender": {
                "email": sender_email,
                "name": sender_name,
            },
            "to": to_recipients,
            "subject": message.subject,
            "htmlContent": message.html_content,
        }
        reply_to_email = (message.from_email or "").strip()
        if reply_to_email and reply_to_email.lower() != sender_email.lower():
            payload["replyTo"] = {
                "email": reply_to_email,
                "name": (message.from_name or "").strip() or sender_name,
            }
        if message.text_content:
            payload["textContent"] = message.text_content
        if message.tags:
            payload["tags"] = message.tags
        if message.custom_id:
            payload["headers"] = {"X-Mailin-custom": message.custom_id}

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.BREVO_BASE}/smtp/email",
                    json=payload,
                    headers=self._headers(),
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return EmailResult(
                        success=True,
                        message_id=data.get("messageId", ""),
                    )
                return EmailResult(
                    success=False,
                    error=f"Brevo {resp.status_code}: {resp.text}",
                )
        except Exception as exc:
            return EmailResult(success=False, error=str(exc))

    # ── bulk ──────────────────────────────────────────────────

    async def send_bulk(self, messages: List[EmailMessage]) -> BulkEmailResult:
        batch_size = settings.EMAIL_BATCH_SIZE
        delay = settings.EMAIL_BATCH_DELAY
        all_results: List[EmailResult] = []

        for i in range(0, len(messages), batch_size):
            chunk = messages[i : i + batch_size]
            results = await asyncio.gather(
                *[self.send_single(m) for m in chunk],
                return_exceptions=True,
            )
            for r in results:
                if isinstance(r, Exception):
                    all_results.append(EmailResult(success=False, error=str(r)))
                else:
                    all_results.append(r)
            # Rate-limit pause between batches
            if i + batch_size < len(messages):
                await asyncio.sleep(delay)

        sent = sum(1 for r in all_results if r.success)
        failed = len(all_results) - sent
        errors = [r.error for r in all_results if not r.success]
        message_ids = [r.message_id for r in all_results if r.success and r.message_id]

        return BulkEmailResult(
            total=len(messages),
            sent=sent,
            failed=failed,
            errors=errors,
            message_ids=message_ids,
        )

    # ── stats ─────────────────────────────────────────────────

    async def get_stats(self, days: int = 30) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.BREVO_BASE}/smtp/statistics/events",
                    params={"limit": 100},
                    headers=self._headers(),
                )
                if resp.status_code != 200:
                    return {"error": f"Brevo {resp.status_code}"}
                data = resp.json()
                events = data.get("events", [])
                counts: dict[str, int] = {}
                for ev in events:
                    t = ev.get("event", "unknown")
                    counts[t] = counts.get(t, 0) + 1
                total = sum(counts.values()) or 1
                return {
                    "counts": counts,
                    "delivered": counts.get("delivered", 0),
                    "opened": counts.get("opened", 0),
                    "clicked": counts.get("click", 0),
                    "bounced": counts.get("hardBounce", 0) + counts.get("softBounce", 0),
                    "open_rate": round(counts.get("opened", 0) / total * 100, 1),
                    "click_rate": round(counts.get("click", 0) / total * 100, 1),
                }
        except Exception as exc:
            return {"error": str(exc)}

    # ── validation ────────────────────────────────────────────

    async def validate_connection(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{self.BREVO_BASE}/account",
                    headers=self._headers(),
                )
                return resp.status_code == 200
        except Exception:
            return False


# ── Factory ───────────────────────────────────────────────────────────────────


def get_email_provider() -> BrevoProvider:
    if not settings.BREVO_API_KEY:
        raise HTTPException(503, "Email provider neconfigurat.")
    return BrevoProvider()
