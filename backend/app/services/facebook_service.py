"""Meta / Facebook publishing helpers."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

import httpx
from fastapi import HTTPException

from app.config import settings


class FacebookPublisher:
    """Publish posts to a Facebook Page via the Graph API."""

    def __init__(self) -> None:
        self.page_id = settings.FACEBOOK_PAGE_ID or ""
        self.access_token = settings.FACEBOOK_PAGE_ACCESS_TOKEN or ""
        self.graph_version = settings.META_GRAPH_API_VERSION or "v20.0"

    def is_configured(self) -> bool:
        return bool(self.page_id and self.access_token)

    def _require_config(self) -> None:
        if not self.is_configured():
            raise HTTPException(
                status_code=503,
                detail="Facebook nu este configurat complet. Lipsesc FACEBOOK_PAGE_ID sau FACEBOOK_PAGE_ACCESS_TOKEN.",
            )

    async def publish_post(
        self,
        *,
        message: str,
        link_url: Optional[str] = None,
    ) -> dict:
        self._require_config()

        payload = {
            "message": message,
            "access_token": self.access_token,
        }
        if link_url:
            payload["link"] = link_url

        url = f"https://graph.facebook.com/{self.graph_version}/{self.page_id}/feed"

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, data=payload)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Eroare la conectarea cu Facebook: {exc}") from exc

        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=502,
                detail=f"Facebook {resp.status_code}: {resp.text}",
            )

        data = resp.json()
        if isinstance(data, dict) and data.get("error"):
            error = data["error"]
            message_text = error.get("message") if isinstance(error, dict) else str(error)
            raise HTTPException(status_code=502, detail=f"Facebook: {message_text}")

        return data

    async def fetch_post_metrics(self, post_id: str) -> dict:
        self._require_config()

        post_url = f"https://graph.facebook.com/{self.graph_version}/{post_id}"
        params = {
            "fields": (
                "id,message,created_time,permalink_url,shares,"
                "reactions.summary(true).limit(0),"
                "comments.summary(true).limit(0)"
            ),
            "access_token": self.access_token,
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(post_url, params=params)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Eroare la conectarea cu Facebook: {exc}") from exc

        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Facebook {resp.status_code}: {resp.text}")

        data = resp.json()
        if isinstance(data, dict) and data.get("error"):
            error = data["error"]
            message_text = error.get("message") if isinstance(error, dict) else str(error)
            raise HTTPException(status_code=502, detail=f"Facebook: {message_text}")

        reactions = 0
        comments = 0
        shares = 0
        if isinstance(data, dict):
            reactions = int(
                ((data.get("reactions") or {}).get("summary") or {}).get("total_count")
                or 0
            )
            comments = int(
                ((data.get("comments") or {}).get("summary") or {}).get("total_count")
                or 0
            )
            shares = int((data.get("shares") or {}).get("count") or 0)

        return {
            "facebook_post_id": data.get("id") if isinstance(data, dict) else None,
            "facebook_permalink_url": data.get("permalink_url") if isinstance(data, dict) else None,
            "created_time": data.get("created_time") if isinstance(data, dict) else None,
            "likes": reactions,
            "comments": comments,
            "shares": shares,
            "reach": reactions + comments + shares,
        }

    async def fetch_recent_posts(self, limit: int = 25) -> list[dict]:
        self._require_config()

        feed_url = f"https://graph.facebook.com/{self.graph_version}/{self.page_id}/posts"
        params = {
            "fields": (
                "id,message,created_time,permalink_url,shares,"
                "reactions.summary(true).limit(0),"
                "comments.summary(true).limit(0)"
            ),
            "limit": str(limit),
            "access_token": self.access_token,
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(feed_url, params=params)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Eroare la conectarea cu Facebook: {exc}") from exc

        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Facebook {resp.status_code}: {resp.text}")

        payload = resp.json()
        if isinstance(payload, dict) and payload.get("error"):
            error = payload["error"]
            message_text = error.get("message") if isinstance(error, dict) else str(error)
            raise HTTPException(status_code=502, detail=f"Facebook: {message_text}")

        entries = (payload or {}).get("data") if isinstance(payload, dict) else []
        if not isinstance(entries, list):
            return []

        normalized: list[dict] = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            reactions = int(((entry.get("reactions") or {}).get("summary") or {}).get("total_count") or 0)
            comments = int(((entry.get("comments") or {}).get("summary") or {}).get("total_count") or 0)
            shares = int((entry.get("shares") or {}).get("count") or 0)
            normalized.append({
                "facebook_post_id": entry.get("id"),
                "facebook_permalink_url": entry.get("permalink_url"),
                "text": entry.get("message") or "",
                "created_time": entry.get("created_time"),
                "likes": reactions,
                "comments": comments,
                "shares": shares,
                "reach": reactions + comments + shares,
            })

        return normalized


def get_facebook_publisher() -> FacebookPublisher:
    return FacebookPublisher()