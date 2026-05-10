"""Social posts router with AI text generation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.config import settings
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.schemas.social import (
    AITextRequest,
    AITextResponse,
    SocialAnalytics,
    SocialPostCreate,
    SocialPostResponse,
    SocialPostUpdate,
)
from app.services.facebook_service import get_facebook_publisher

router = APIRouter(prefix="/social", tags=["social"])


def _get_instagram_access_token() -> Optional[str]:
    return settings.INSTAGRAM_ACCESS_TOKEN or settings.FACEBOOK_PAGE_ACCESS_TOKEN


@router.get("/connection-status")
async def get_connection_status(
):
    """Return the currently configured social accounts shown in the CRM UI."""
    instagram_token = _get_instagram_access_token()
    return {
        "facebook": {
            "page_id": settings.FACEBOOK_PAGE_ID,
            "connected": bool(settings.FACEBOOK_PAGE_ID and settings.FACEBOOK_PAGE_ACCESS_TOKEN),
        },
        "instagram": {
            "account_id": settings.INSTAGRAM_ACCOUNT_ID,
            "connected": bool(settings.INSTAGRAM_ACCOUNT_ID and instagram_token),
        },
    }


def _normalize_text(value: Optional[str]) -> str:
    return " ".join((value or "").split()).strip().lower()


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            return None
    return None


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _merge_facebook_metrics(post: Dict[str, Any], fb_posts: List[Dict[str, Any]]) -> Dict[str, Any]:
    if (post.get("status") or "") != "published":
        return post
    if "Facebook" not in (post.get("platforms") or []):
        return post

    post_text = _normalize_text(post.get("text"))
    if not post_text:
        return post

    post_date = _as_utc(_parse_dt(post.get("published_at") or post.get("created_at")))
    best_match: Optional[Dict[str, Any]] = None
    best_score: Optional[tuple[int, int]] = None

    for fb_post in fb_posts:
        fb_text = _normalize_text(fb_post.get("text"))
        if not fb_text:
            continue

        if fb_text == post_text or fb_text in post_text or post_text in fb_text:
            fb_date = _as_utc(_parse_dt(fb_post.get("created_time")))
            time_delta = abs(int((post_date - fb_date).total_seconds())) if post_date and fb_date else 0
            score = (0 if fb_text == post_text else 1, time_delta)
            if best_score is None or score < best_score:
                best_score = score
                best_match = fb_post

    if not best_match:
        return post

    enriched = dict(post)
    enriched["likes"] = int(best_match.get("likes") or enriched.get("likes") or 0)
    enriched["shares"] = int(best_match.get("shares") or enriched.get("shares") or 0)
    enriched["comments"] = int(best_match.get("comments") or enriched.get("comments") or 0)
    enriched["reach"] = int(best_match.get("reach") or enriched.get("reach") or 0)
    if best_match.get("created_time") and not enriched.get("published_at"):
        enriched["published_at"] = best_match.get("created_time")
    return enriched


def _social_sort_value(post: Dict[str, Any], order_by: str) -> tuple[int, Any]:
    value = post.get(order_by)
    if value is None and order_by in {"created_at", "published_at"}:
        value = post.get("published_at") or post.get("created_at")

    if isinstance(value, (int, float)):
        return 2, float(value)

    parsed = _as_utc(_parse_dt(value))
    if parsed is not None:
        return 1, parsed.timestamp()

    return 0, str(value or "")


def _is_same_social_post(existing_post: Dict[str, Any], fb_post: Dict[str, Any]) -> bool:
    existing_fb_id = str(existing_post.get("facebook_post_id") or "")
    incoming_fb_id = str(fb_post.get("facebook_post_id") or "")
    if existing_fb_id and incoming_fb_id and existing_fb_id == incoming_fb_id:
        return True

    existing_text = _normalize_text(existing_post.get("text"))
    incoming_text = _normalize_text(fb_post.get("text"))
    if not existing_text or not incoming_text:
        return False

    if not (
        existing_text == incoming_text
        or existing_text in incoming_text
        or incoming_text in existing_text
    ):
        return False

    existing_dt = _as_utc(_parse_dt(existing_post.get("published_at") or existing_post.get("created_at")))
    incoming_dt = _as_utc(_parse_dt(fb_post.get("created_time")))
    if existing_dt and incoming_dt:
        return abs((existing_dt - incoming_dt).total_seconds()) <= 6 * 3600

    return True


def _facebook_to_social_row(fb_post: Dict[str, Any]) -> Dict[str, Any]:
    created_time = fb_post.get("created_time")
    facebook_post_id = str(fb_post.get("facebook_post_id") or "")
    synthetic_id = f"facebook:{facebook_post_id}" if facebook_post_id else f"facebook:ts:{created_time or datetime.now(timezone.utc).isoformat()}"

    return {
        "id": synthetic_id,
        "text": fb_post.get("text") or "",
        "image_url": None,
        "link_url": fb_post.get("facebook_permalink_url"),
        "platforms": ["Facebook"],
        "status": "published",
        "scheduled_at": None,
        "ai_prompt": None,
        "ai_generated": False,
        "project_id": None,
        "published_at": created_time,
        "likes": int(fb_post.get("likes") or 0),
        "shares": int(fb_post.get("shares") or 0),
        "comments": int(fb_post.get("comments") or 0),
        "reach": int(fb_post.get("reach") or 0),
        "created_by": None,
        "created_at": created_time,
        "updated_at": created_time,
        "facebook_post_id": facebook_post_id,
    }


def _instagram_to_social_row(ig_post: Dict[str, Any]) -> Dict[str, Any]:
    created_time = ig_post.get("timestamp")
    instagram_post_id = str(ig_post.get("instagram_post_id") or ig_post.get("id") or "")
    synthetic_id = f"instagram:{instagram_post_id}" if instagram_post_id else f"instagram:ts:{created_time or datetime.now(timezone.utc).isoformat()}"

    caption = ig_post.get("caption") or ""
    media_type = str(ig_post.get("media_type") or "").upper()
    is_video = media_type == "VIDEO"

    return {
        "id": synthetic_id,
        "text": caption,
        "image_url": None if is_video else ig_post.get("media_url"),
        "link_url": ig_post.get("permalink"),
        "platforms": ["Instagram"],
        "status": "published",
        "scheduled_at": None,
        "ai_prompt": None,
        "ai_generated": False,
        "project_id": None,
        "published_at": created_time,
        "likes": int(ig_post.get("likes") or ig_post.get("like_count") or 0),
        "shares": int(ig_post.get("shares") or 0),
        "comments": int(ig_post.get("comments") or ig_post.get("comments_count") or 0),
        "reach": int(ig_post.get("reach") or ig_post.get("like_count") or 0) + int(ig_post.get("comments_count") or 0),
        "created_by": None,
        "created_at": created_time,
        "updated_at": created_time,
        "instagram_post_id": instagram_post_id,
    }


async def _fetch_instagram_posts(limit: int = 25) -> list[dict]:
    access_token = _get_instagram_access_token()
    if not settings.INSTAGRAM_ACCOUNT_ID or not access_token:
        return []

    url = f"https://graph.facebook.com/{settings.META_GRAPH_API_VERSION}/{settings.INSTAGRAM_ACCOUNT_ID}/media"
    params = {
        "fields": "id,caption,media_url,permalink,timestamp,media_type,like_count,comments_count",
        "limit": str(limit),
        "access_token": access_token,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, params=params)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Eroare la conectarea cu Instagram: {exc}") from exc

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Instagram {resp.status_code}: {resp.text}")

    payload = resp.json()
    if isinstance(payload, dict) and payload.get("error"):
        error = payload["error"]
        message_text = error.get("message") if isinstance(error, dict) else str(error)
        raise HTTPException(status_code=502, detail=f"Instagram: {message_text}")

    entries = (payload or {}).get("data") if isinstance(payload, dict) else []
    if not isinstance(entries, list):
        return []

    normalized: list[dict] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        normalized.append({
            "instagram_post_id": entry.get("id"),
            "caption": entry.get("caption") or "",
            "media_url": entry.get("media_url"),
            "permalink": entry.get("permalink"),
            "timestamp": entry.get("timestamp"),
            "media_type": entry.get("media_type"),
            "like_count": int(entry.get("like_count") or 0),
            "comments_count": int(entry.get("comments_count") or 0),
        })

    return normalized


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[SocialPostResponse])
async def list_posts(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    platform: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    platform_filter = (platform or "").strip().lower()
    include_instagram_feed = (
        not project_id
        and (not status_filter or status_filter == "published")
        and (not platform_filter or platform_filter == "instagram")
    )
    include_facebook_feed = (
        not project_id
        and (not status_filter or status_filter == "published")
        and (not platform_filter or platform_filter == "facebook")
    )

    q = supabase_admin.table("social_posts").select("*")
    if project_id:
        q = q.eq("project_id", project_id)
    if status_filter:
        q = q.eq("status", status_filter)
    if platform:
        q = q.contains("platforms", [platform])
    q = q.order(order_by, desc=(order_dir.lower() == "desc"))
    if include_facebook_feed:
        q = q.range(0, max(limit + offset - 1, limit - 1))
    else:
        q = q.range(offset, offset + limit - 1)
    resp = q.execute()
    rows = resp.data or []

    publisher = get_facebook_publisher()
    feed_appended = False

    if publisher.is_configured() and include_facebook_feed:
        try:
            fb_posts = await publisher.fetch_recent_posts(limit=max(25, (limit + offset) * 2))
            rows = [_merge_facebook_metrics(r, fb_posts) for r in rows]

            for fb_post in fb_posts:
                if any(_is_same_social_post(existing, fb_post) for existing in rows):
                    continue
                rows.append(_facebook_to_social_row(fb_post))

            feed_appended = True
        except HTTPException:
            pass

    if settings.INSTAGRAM_ACCOUNT_ID and _get_instagram_access_token() and include_instagram_feed:
        try:
            ig_posts = await _fetch_instagram_posts(limit=max(25, (limit + offset) * 2))
            instagram_ids = {str(r.get("instagram_post_id") or "") for r in rows if r.get("instagram_post_id")}

            for ig_post in ig_posts:
                ig_id = str(ig_post.get("instagram_post_id") or ig_post.get("id") or "")
                if ig_id and ig_id in instagram_ids:
                    continue
                rows.append(_instagram_to_social_row(ig_post))
                if ig_id:
                    instagram_ids.add(ig_id)

            feed_appended = True
        except HTTPException:
            pass

    if feed_appended:
        rows = sorted(
            rows,
            key=lambda r: _social_sort_value(r, order_by),
            reverse=(order_dir.lower() == "desc"),
        )
        rows = rows[offset: offset + limit]

    return [SocialPostResponse(**r) for r in rows]


@router.get("/analytics", response_model=SocialAnalytics)
async def analytics(
    project_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    q = supabase_admin.table("social_posts").select("*")
    if project_id:
        q = q.eq("project_id", project_id)
    resp = q.execute()
    rows = resp.data or []

    publisher = get_facebook_publisher()
    if publisher.is_configured():
        try:
            fb_posts = await publisher.fetch_recent_posts(limit=max(50, limit * 3))
            rows = [_merge_facebook_metrics(r, fb_posts) for r in rows]
        except HTTPException:
            pass

    if settings.INSTAGRAM_ACCOUNT_ID and _get_instagram_access_token():
        try:
            ig_posts = await _fetch_instagram_posts(limit=max(50, limit * 3))
            rows.extend(_instagram_to_social_row(post) for post in ig_posts)
        except HTTPException:
            pass

    total_reach = sum(r.get("reach") or 0 for r in rows)
    total_likes = sum(r.get("likes") or 0 for r in rows)
    total_shares = sum(r.get("shares") or 0 for r in rows)
    total_comments = sum(r.get("comments") or 0 for r in rows)

    by_platform: Dict[str, Dict[str, int]] = {}
    for r in rows:
        platforms = r.get("platforms") or []
        for p in platforms:
            if p not in by_platform:
                by_platform[p] = {"reach": 0, "likes": 0, "shares": 0, "comments": 0}
            by_platform[p]["reach"] += r.get("reach") or 0
            by_platform[p]["likes"] += r.get("likes") or 0
            by_platform[p]["shares"] += r.get("shares") or 0
            by_platform[p]["comments"] += r.get("comments") or 0

    # Top posts by reach
    rows_sorted = sorted(rows, key=lambda r: r.get("reach") or 0, reverse=True)[:limit]
    top_posts = [SocialPostResponse(**r) for r in rows_sorted]

    return SocialAnalytics(
        total_reach=total_reach,
        total_likes=total_likes,
        total_shares=total_shares,
        total_comments=total_comments,
        by_platform=by_platform,
        top_posts=top_posts,
    )


@router.post("/", response_model=SocialPostResponse, status_code=201)
async def create_post(
    body: SocialPostCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    data = body.model_dump(mode="json", exclude_unset=True)
    data["created_by"] = current_user["id"]

    # Convert enum list to plain strings
    if "platforms" in data:
        data["platforms"] = [p.value if hasattr(p, "value") else p for p in data["platforms"]]

    if data.get("status") == "published":
        data["published_at"] = datetime.now(timezone.utc).isoformat()

    resp = supabase_admin.table("social_posts").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la creare postare.")

    created_post = resp.data[0]
    platforms = data.get("platforms") or []
    publish_to_facebook = data.get("status") == "published" and "Facebook" in platforms

    if publish_to_facebook:
        publisher = get_facebook_publisher()
        try:
            fb_result = await publisher.publish_post(
                message=data.get("text") or "",
                link_url=data.get("link_url"),
            )
            fb_post_id = fb_result.get("id") if isinstance(fb_result, dict) else None
            if fb_post_id:
                try:
                    metrics = await publisher.fetch_post_metrics(fb_post_id)
                    update_payload = {
                        "likes": metrics.get("likes", 0),
                        "shares": metrics.get("shares", 0),
                        "comments": metrics.get("comments", 0),
                        "reach": metrics.get("reach", 0),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                    if metrics.get("created_time"):
                        update_payload["published_at"] = metrics["created_time"]
                    supabase_admin.table("social_posts").update(update_payload).eq("id", created_post["id"]).execute()
                    created_post.update(update_payload)
                except HTTPException:
                    pass
        except HTTPException:
            supabase_admin.table("social_posts").update(
                {
                    "status": "draft",
                    "published_at": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", created_post["id"]).execute()
            raise

    return SocialPostResponse(**created_post)


@router.put("/{post_id}", response_model=SocialPostResponse)
async def update_post(
    post_id: str,
    body: SocialPostUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    update_data = body.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nicio modificare trimisă.")

    if "platforms" in update_data and update_data["platforms"] is not None:
        update_data["platforms"] = [
            p.value if hasattr(p, "value") else p for p in update_data["platforms"]
        ]

    if update_data.get("status") == "published":
        update_data["published_at"] = datetime.now(timezone.utc).isoformat()

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    resp = (
        supabase_admin.table("social_posts")
        .update(update_data)
        .eq("id", post_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Postare negăsită.")
    return SocialPostResponse(**resp.data[0])


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    supabase_admin.table("social_posts").delete().eq("id", post_id).execute()


# ── AI text generation ───────────────────────────────────────────────────────

@router.post("/generate-ai-text", response_model=AITextResponse)
async def generate_ai_text(
    body: AITextRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Generate social media text. Uses Anthropic if key is set, else template fallback."""

    if settings.ANTHROPIC_API_KEY:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

            system_prompt = (
                "Ești un expert social-media pentru un ONG din România. "
                "Scrie postări de social media profesionale, calde și captivante. "
                "Folosește diacritice românești corecte (ă, â, î, ș, ț). "
                "Răspunde doar cu textul postării, fără explicații."
            )

            user_prompt = f"Scrie o postare social media: {body.prompt}"
            if body.project_name:
                user_prompt += f"\nProiect: {body.project_name}"
            if body.tone:
                user_prompt += f"\nTon: {body.tone}"
            if body.include_hashtags:
                user_prompt += "\nInclude hashtag-uri relevante."
            if body.correct_diacritics:
                user_prompt += "\nFolosește diacritice românești corecte."

            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            generated = message.content[0].text
            return AITextResponse(generated_text=generated)

        except Exception as exc:
            # Fall through to template if API fails
            pass

    # Template fallback
    prompt_lower = body.prompt.lower()
    project = body.project_name or "proiectul nostru"

    if any(w in prompt_lower for w in ["donație", "donatie", "fundrais", "strângere"]):
        text = (
            f"🤝 Împreună putem face diferența!\n\n"
            f"Contribuie la {project} și ajută-ne să schimbăm vieți. "
            f"Fiecare donație contează, indiferent de sumă.\n\n"
            f"💜 Donează acum și fii parte din schimbare!"
        )
    elif any(w in prompt_lower for w in ["voluntar", "implica", "ajut"]):
        text = (
            f"🌟 Vrei să faci parte din echipa noastră?\n\n"
            f"Căutăm voluntari pasionați pentru {project}. "
            f"Experiența nu contează — contează dorința de a ajuta!\n\n"
            f"📩 Scrie-ne un mesaj pentru detalii."
        )
    elif any(w in prompt_lower for w in ["eveniment", "event", "invit"]):
        text = (
            f"📅 Eveniment special!\n\n"
            f"Vă invităm la evenimentul organizat în cadrul {project}. "
            f"O ocazie excelentă de a cunoaște echipa și de a afla mai multe "
            f"despre impactul pe care îl creăm împreună.\n\n"
            f"🎉 Detalii în curând!"
        )
    elif any(w in prompt_lower for w in ["rezultat", "impact", "reușit"]):
        text = (
            f"🎯 Rezultate care ne fac mândri!\n\n"
            f"Datorită sprijinului vostru, {project} a reușit să "
            f"aducă o schimbare reală în comunitate. "
            f"Mulțumim tuturor partenerilor și voluntarilor!\n\n"
            f"📊 Află mai multe pe site-ul nostru."
        )
    else:
        text = (
            f"💜 Vești bune de la echipa CiviUp!\n\n"
            f"Suntem entuziasmați să vă povestim despre {project}. "
            f"Fiecare pas mic contează în drumul spre o comunitate mai bună.\n\n"
            f"🔗 Urmărește-ne pentru noutăți!"
        )

    if body.include_hashtags:
        text += "\n\n#CiviUp #ONG #Comunitate #Impact #România"

    return AITextResponse(generated_text=text)
