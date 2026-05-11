"""CiviUp — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import supabase_admin
from app.routers import (
    auth,
    calendar,
    chat,
    contacts,
    dashboard,
    donations,
    emails,
    expenses,
    ocr,
    projects,
    social,
    tasks,
    users,
)
from app.routers.ai_analysis import router as ai_analysis_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Run on startup / shutdown."""
    # Startup: verify Supabase connection
    try:
        resp = supabase_admin.table("profiles").select("id").limit(1).execute()
        print(f"[CiviUp] Supabase OK — profiles sample: {len(resp.data)} row(s)")
    except Exception as exc:
        print(f"[CiviUp] Supabase connection test failed: {exc}")

    yield  # App is running

    # Shutdown — nothing to clean up for now
    print("[CiviUp] Shutting down.")


app = FastAPI(
    title="CiviUp API",
    description="Backend for the CiviUp NGO management platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# On dev: allow all origins. On production: check specific list or allow vercel/localhost

if settings.is_dev:
    origins = ["*"]
else:
    # Production: allow hardcoded list + Vercel domains + localhost for testing
    origins = settings.cors_origins_list
    # Ensure we cover Vercel deployments
    if "https://*.vercel.app" not in origins:
        origins.append("https://civi-up-licenta.vercel.app")
        origins.append("https://civiup.ro")
        origins.append("https://www.civiup.ro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(donations.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(ai_analysis_router, prefix="/api")
app.include_router(emails.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")
app.include_router(social.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["system"])
async def health():
    return {"status": "ok", "version": app.version}


# ── Run directly ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.APP_PORT, reload=settings.is_dev)
