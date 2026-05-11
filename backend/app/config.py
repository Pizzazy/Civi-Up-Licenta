"""Application configuration loaded from environment variables."""

from __future__ import annotations

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All env vars needed by the CiviUp backend."""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"

    # App
    APP_ENV: str = "development"
    APP_PORT: int = 8000

    # CORS — stored as comma-separated string, parsed into list
    # On production/Render, this will allow Vercel domains and localhost for dev
    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://localhost:3000,"
        "https://civi-up-licenta.vercel.app,"
        "https://civiup.ro,"
        "https://www.civiup.ro,"
        "https://*.vercel.app"
    )

    # OCR
    TESSERACT_CMD: str = "tesseract"
    OCR_SPACE_API_KEY: str = "K81442280488957"
    OCR_SPACE_URL = "[https://api.ocr.space/parse/image](https://api.ocr.space/parse/image)"
    OCR_SPACE_LANGUAGE: str = "ron"

    # Optional AI
    ANTHROPIC_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None

    # ── Email (Brevo) ────────────────────────────────────────
    EMAIL_PROVIDER: str = "brevo"
    BREVO_API_KEY: str = ""
    EMAIL_FROM_ADDRESS: str = ""
    EMAIL_FROM_NAME: str = "CIviUp România"
    EMAIL_BATCH_SIZE: int = 50
    EMAIL_BATCH_DELAY: float = 1.0

    # ── Social (Meta / Facebook) ─────────────────────────────
    META_APP_ID: str | None = None
    META_APP_SECRET: str | None = None
    FACEBOOK_PAGE_ID: str | None = None
    FACEBOOK_PAGE_ACCESS_TOKEN: str | None = None
    INSTAGRAM_ACCOUNT_ID: str | None = None
    INSTAGRAM_ACCESS_TOKEN: str | None = None
    META_GRAPH_API_VERSION: str = "v20.0"

    # ------------------------------------------------------------------
    @property
    def cors_origins_list(self) -> List[str]:
        """Return parsed list of allowed CORS origins."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.APP_ENV == "development"


settings = Settings()  # type: ignore[call-arg]
