"""Resolve email groups → list of EmailRecipient via Supabase RPC."""

from __future__ import annotations

import re
from typing import List

from app.database import supabase_admin
from app.services.email_service import EmailRecipient

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


async def resolve_groups(
    groups: List[str],
    extra_emails: List[str] | None = None,
) -> List[EmailRecipient]:
    """Combine Supabase group members + manually supplied addresses."""
    seen: dict[str, EmailRecipient] = {}

    for group in groups:
        try:
            resp = supabase_admin.rpc(
                "get_users_by_group", {"group_name": group}
            ).execute()
            for row in resp.data or []:
                email = (row.get("email") or "").strip().lower()
                if email and email not in seen:
                    seen[email] = EmailRecipient(
                        email=email,
                        name=row.get("full_name") or "",
                    )
        except Exception:
            pass  # group may not exist

    for addr in extra_emails or []:
        addr = addr.strip().lower()
        if _EMAIL_RE.match(addr) and addr not in seen:
            seen[addr] = EmailRecipient(email=addr)

    return list(seen.values())


async def get_recipient_preview(
    groups: List[str],
    extra_emails: List[str] | None = None,
) -> dict:
    """Return per-group counts + sample of first 5."""
    breakdown: dict[str, int] = {}
    seen_all: dict[str, EmailRecipient] = {}

    for group in groups:
        try:
            resp = supabase_admin.rpc(
                "get_users_by_group", {"group_name": group}
            ).execute()
            rows = resp.data or []
            breakdown[group] = len(rows)
            for row in rows:
                email = (row.get("email") or "").strip().lower()
                if email and email not in seen_all:
                    seen_all[email] = EmailRecipient(
                        email=email,
                        name=row.get("full_name") or "",
                    )
        except Exception:
            breakdown[group] = 0

    for addr in extra_emails or []:
        addr = addr.strip().lower()
        if _EMAIL_RE.match(addr) and addr not in seen_all:
            seen_all[addr] = EmailRecipient(email=addr)

    sample = [{"email": r.email, "name": r.name} for r in list(seen_all.values())[:5]]
    return {
        "total": len(seen_all),
        "groups_breakdown": breakdown,
        "sample": sample,
    }
