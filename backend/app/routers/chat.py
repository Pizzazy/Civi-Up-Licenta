"""Chat / messaging router."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import supabase_admin
from app.dependencies import get_current_user
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ConversationResponse
from app.schemas.user import UserMinimal

router = APIRouter(prefix="/chat", tags=["chat"])


# ── Conversations ────────────────────────────────────────────────────────────

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    uid = current_user["id"]

    # Get all messages involving current user (not soft-deleted for us)
    sent = (
        supabase_admin.table("chat_messages")
        .select("*")
        .eq("sender_id", uid)
        .eq("is_deleted_by_sender", False)
        .order("created_at", desc=True)
        .execute()
    )
    received = (
        supabase_admin.table("chat_messages")
        .select("*")
        .eq("receiver_id", uid)
        .eq("is_deleted_by_receiver", False)
        .order("created_at", desc=True)
        .execute()
    )

    all_msgs = (sent.data or []) + (received.data or [])
    # Sort all by created_at desc
    all_msgs.sort(key=lambda m: m.get("created_at", ""), reverse=True)

    # Group by other_user_id
    conversations: Dict[str, Dict] = {}
    for m in all_msgs:
        other_id = m["receiver_id"] if m["sender_id"] == uid else m["sender_id"]
        if other_id not in conversations:
            conversations[other_id] = {
                "last_message": m,
                "unread": 0,
            }
        # Count unread (messages received by us, not read)
        if m["receiver_id"] == uid and not m.get("is_read"):
            conversations[other_id]["unread"] = conversations[other_id].get("unread", 0) + 1

    # Fetch profiles for all other users
    result: List[ConversationResponse] = []
    for other_id, conv in conversations.items():
        p = (
            supabase_admin.table("profiles")
            .select("id, full_name, avatar_initials, role")
            .eq("id", other_id)
            .maybe_single()
            .execute()
        )
        if not p.data:
            continue
        result.append(
            ConversationResponse(
                other_user=UserMinimal(**p.data),
                last_message=ChatMessageResponse(**conv["last_message"]),
                unread_count=conv["unread"],
            )
        )

    return result


# ── Messages ─────────────────────────────────────────────────────────────────

@router.get("/messages/{user_id}", response_model=List[ChatMessageResponse])
async def get_messages(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    before_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    uid = current_user["id"]

    # Messages between uid and user_id (both directions)
    q_sent = (
        supabase_admin.table("chat_messages")
        .select("*")
        .eq("sender_id", uid)
        .eq("receiver_id", user_id)
        .eq("is_deleted_by_sender", False)
    )
    q_recv = (
        supabase_admin.table("chat_messages")
        .select("*")
        .eq("sender_id", user_id)
        .eq("receiver_id", uid)
        .eq("is_deleted_by_receiver", False)
    )

    sent_resp = q_sent.order("created_at", desc=True).limit(limit).execute()
    recv_resp = q_recv.order("created_at", desc=True).limit(limit).execute()

    all_msgs = (sent_resp.data or []) + (recv_resp.data or [])
    all_msgs.sort(key=lambda m: m.get("created_at", ""), reverse=True)

    # Cursor pagination
    if before_id:
        found = False
        filtered = []
        for m in all_msgs:
            if found:
                filtered.append(m)
            if m["id"] == before_id:
                found = True
        all_msgs = filtered

    all_msgs = all_msgs[:limit]

    # Auto-mark incoming as read
    now = datetime.now(timezone.utc).isoformat()
    unread_ids = [m["id"] for m in all_msgs if m["receiver_id"] == uid and not m.get("is_read")]
    for mid in unread_ids:
        try:
            supabase_admin.table("chat_messages").update(
                {"is_read": True, "read_at": now}
            ).eq("id", mid).execute()
        except Exception:
            pass

    return [ChatMessageResponse(**m) for m in all_msgs]


@router.post("/messages/{user_id}", response_model=ChatMessageResponse, status_code=201)
async def send_message(
    user_id: str,
    body: dict,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    uid = current_user["id"]
    if uid == user_id:
        raise HTTPException(status_code=422, detail="Nu poți trimite un mesaj către tine însuți.")

    # Check receiver exists
    recv = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not recv.data:
        raise HTTPException(status_code=404, detail="Destinatarul nu a fost găsit.")

    # Accept both `text` and legacy `content` keys from frontend
    text = (body or {}).get("text") or (body or {}).get("content")
    if not text:
        raise HTTPException(status_code=422, detail="Mesajul este gol.")

    data = {
        "sender_id": uid,
        "receiver_id": user_id,
        "text": text,
        "attachment_url": (body or {}).get("attachment_url"),
        "attachment_type": (body or {}).get("attachment_type"),
        "is_read": False,
        "is_deleted_by_sender": False,
        "is_deleted_by_receiver": False,
    }
    resp = supabase_admin.table("chat_messages").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Eroare la trimitere mesaj.")
    return ChatMessageResponse(**resp.data[0])


@router.patch("/messages/{user_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    uid = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()
    supabase_admin.table("chat_messages").update(
        {"is_read": True, "read_at": now}
    ).eq("sender_id", user_id).eq("receiver_id", uid).eq("is_read", False).execute()


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    uid = current_user["id"]
    msg = (
        supabase_admin.table("chat_messages")
        .select("sender_id, receiver_id")
        .eq("id", message_id)
        .maybe_single()
        .execute()
    )
    if not msg.data:
        raise HTTPException(status_code=404, detail="Mesaj negăsit.")

    if msg.data["sender_id"] == uid:
        supabase_admin.table("chat_messages").update(
            {"is_deleted_by_sender": True}
        ).eq("id", message_id).execute()
    elif msg.data["receiver_id"] == uid:
        supabase_admin.table("chat_messages").update(
            {"is_deleted_by_receiver": True}
        ).eq("id", message_id).execute()
    else:
        raise HTTPException(status_code=403, detail="Nu ai permisiuni pentru acest mesaj.")
