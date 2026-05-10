"""Supabase client instances (lazy-initialised).

Two clients are exported:
* ``supabase``       — uses the **anon key**, respects RLS.
* ``supabase_admin`` — uses the **service-role key**, bypasses RLS.

The clients are created on first access so that the module can be imported
even when valid Supabase credentials are not yet available (tests, CI, etc.).
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache(maxsize=1)
def _get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


@lru_cache(maxsize=1)
def _get_supabase_admin() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class _LazyClient:
    """Thin proxy that defers ``create_client`` until the first attribute access."""

    def __init__(self, factory):
        object.__setattr__(self, "_factory", factory)

    def _resolve(self) -> Client:
        return object.__getattribute__(self, "_factory")()

    def __getattr__(self, name: str):
        return getattr(self._resolve(), name)


supabase: Client = _LazyClient(_get_supabase)  # type: ignore[assignment]
supabase_admin: Client = _LazyClient(_get_supabase_admin)  # type: ignore[assignment]

__all__ = ["supabase", "supabase_admin"]
