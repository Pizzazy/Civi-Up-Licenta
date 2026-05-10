"""Pydantic v2 schemas — package re-exports."""

from app.schemas.user import *  # noqa: F401,F403
from app.schemas.project import *  # noqa: F401,F403
from app.schemas.expense import *  # noqa: F401,F403
from app.schemas.donation import *  # noqa: F401,F403
from app.schemas.task import *  # noqa: F401,F403
from app.schemas.calendar import *  # noqa: F401,F403
from app.schemas.chat import *  # noqa: F401,F403
from app.schemas.email import *  # noqa: F401,F403
from app.schemas.ai_analysis import *  # noqa: F401,F403
from app.schemas.social import *  # noqa: F401,F403
from app.schemas.dashboard import *  # noqa: F401,F403

__all__ = [
    # user
    "UserRole", "UserStatus", "UserMinimal", "ProfileBase", "ProfileCreate",
    "ProfileUpdate", "ProfileResponse", "AccountRequestType",
    "AccountRequestCreate", "AccountRequestResponse",
    # project
    "ProjectStatus", "ProjectBase", "ProjectCreate", "ProjectUpdate",
    "ProjectResponse", "ProjectMemberResponse", "ProjectStatsResponse",
    # expense
    "ExpenseCategory", "ExpenseStatus", "ExpenseBase", "ExpenseCreate",
    "ExpenseUpdate", "ExpenseResponse",
    # donation
    "DonationType", "IncomeCategory", "DonationBase", "DonationCreate",
    "DonationUpdate", "DonationResponse", "DonationSummary",
    # task
    "TaskStatus", "TaskPriority", "TaskBase", "TaskCreate", "TaskUpdate",
    "TaskResponse", "TaskMemoCreate", "TaskMemoResponse",
    # calendar
    "EventType", "CalendarEventBase", "CalendarEventCreate",
    "CalendarEventUpdate", "CalendarEventResponse",
    # chat
    "ChatMessageCreate", "ChatMessageResponse", "ConversationResponse",
    # email
    "EmailGroup", "EmailColumn", "EmailBase", "EmailCreate", "EmailUpdate",
    "EmailResponse", "EmailTemplateCreate", "EmailTemplateUpdate",
    "EmailTemplateResponse",
    # ai analysis
    "AIAnalysisRequest", "AIAnalysisChartItem", "AIAnalysisResponse",
    # social
    "SocialPlatform", "SocialPostBase", "SocialPostCreate", "SocialPostUpdate",
    "SocialPostResponse", "SocialAnalytics", "AITextRequest", "AITextResponse",
    # dashboard
    "DashboardSummary", "FinancialMonthly", "BeneficiariByProject",
    "RecentActivityItem",
]
