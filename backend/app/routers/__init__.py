"""Router sub-package re-exports."""

from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.projects import router as projects_router
from app.routers.expenses import router as expenses_router
from app.routers.donations import router as donations_router
from app.routers.tasks import router as tasks_router
from app.routers.calendar import router as calendar_router
from app.routers.chat import router as chat_router
from app.routers.ai_analysis import router as ai_analysis_router
from app.routers.emails import router as emails_router
from app.routers.social import router as social_router
from app.routers.ocr import router as ocr_router
from app.routers.dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "users_router",
    "projects_router",
    "expenses_router",
    "donations_router",
    "tasks_router",
    "calendar_router",
    "chat_router",
    "ai_analysis_router",
    "emails_router",
    "social_router",
    "ocr_router",
    "dashboard_router",
]
