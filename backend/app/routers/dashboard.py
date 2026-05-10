"""Dashboard aggregate endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query

from app.database import supabase_admin
from app.dependencies import get_current_user
from app.schemas.dashboard import (
    BeneficiariByProject,
    DashboardSummary,
    FinancialMonthly,
    RecentActivityItem,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MONTH_NAMES = [
    "Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
    "Iul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def _extract_year_month(*raw_values: Any) -> Optional[tuple[int, int]]:
    """Return (year, month) from the first parseable date-like value."""
    for value in raw_values:
        if value is None:
            continue

        if isinstance(value, datetime):
            return value.year, value.month

        if isinstance(value, str):
            candidate = value.strip()
            if not candidate:
                continue
            try:
                parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
                return parsed.year, parsed.month
            except ValueError:
                # Fallback for plain strings like YYYY-MM-DD.
                if len(candidate) >= 10 and candidate[4] == "-" and candidate[7] == "-":
                    try:
                        return int(candidate[:4]), int(candidate[5:7])
                    except ValueError:
                        continue

    return None


# ── Summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=DashboardSummary)
async def summary(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    # Donations
    don_resp = supabase_admin.table("donations").select("suma, income_category").execute()
    donations = don_resp.data or []
    total_venituri = sum(float(d.get("suma") or 0) for d in donations)

    venituri_by_cat: Dict[str, float] = {}
    for d in donations:
        cat = d.get("income_category") or "alta"
        venituri_by_cat[cat] = venituri_by_cat.get(cat, 0) + float(d.get("suma") or 0)

    # Expenses
    exp_resp = supabase_admin.table("expenses").select("suma, status").execute()
    expenses = exp_resp.data or []
    total_cheltuieli = sum(float(e.get("suma") or 0) for e in expenses if e.get("status") == "aprobat")
    pending = [e for e in expenses if e.get("status") == "in_asteptare"]
    cheltuieli_in_asteptare_count = len(pending)
    cheltuieli_in_asteptare_suma = sum(float(e.get("suma") or 0) for e in pending)

    # Projects
    proj_resp = supabase_admin.table("projects").select(
        "status, beneficiari_directi"
    ).execute()
    projects = proj_resp.data or []
    proiecte_active = sum(1 for p in projects if p.get("status") == "activ")
    total_b_d = sum(p.get("beneficiari_directi") or 0 for p in projects)

    return DashboardSummary(
        total_venituri=total_venituri,
        total_cheltuieli=total_cheltuieli,
        sold_disponibil=total_venituri - total_cheltuieli,
        venituri_by_category=venituri_by_cat,
        total_beneficiari_directi=total_b_d,
        proiecte_active=proiecte_active,
        proiecte_total=len(projects),
        cheltuieli_in_asteptare_count=cheltuieli_in_asteptare_count,
        cheltuieli_in_asteptare_suma=cheltuieli_in_asteptare_suma,
    )


# ── Financial monthly ───────────────────────────────────────────────────────

@router.get("/financial-monthly", response_model=List[FinancialMonthly])
async def financial_monthly(
    year: int = Query(2025),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    # Donations. We include created_at as a fallback when donation_date is missing.
    don_resp = (
        supabase_admin.table("donations")
        .select("suma, income_category, donation_date, created_at")
        .execute()
    )
    donations = don_resp.data or []

    # Approved expenses. We include created_at as a fallback when expense_date is missing.
    exp_resp = (
        supabase_admin.table("expenses")
        .select("suma, expense_date, created_at")
        .eq("status", "aprobat")
        .execute()
    )
    expenses = exp_resp.data or []

    # Build monthly buckets.
    monthly_totals = [
        {
            "granturi": 0.0,
            "donatii": 0.0,
            "donatii_mari": 0.0,
            "redirectionari": 0.0,
            "cheltuieli": 0.0,
        }
        for _ in range(12)
    ]

    for d in donations:
        ym = _extract_year_month(d.get("donation_date"), d.get("created_at"))
        if not ym:
            continue
        item_year, item_month = ym
        if item_year != year or item_month < 1 or item_month > 12:
            continue

        bucket = monthly_totals[item_month - 1]
        amount = float(d.get("suma") or 0)
        category = d.get("income_category") or ""

        if category == "grant":
            bucket["granturi"] += amount
        elif category == "donatie":
            bucket["donatii"] += amount
        elif category == "donatie_mare":
            bucket["donatii_mari"] += amount
        elif category == "redirectionare_3_5":
            bucket["redirectionari"] += amount
        else:
            bucket["donatii"] += amount

    for e in expenses:
        ym = _extract_year_month(e.get("expense_date"), e.get("created_at"))
        if not ym:
            continue
        item_year, item_month = ym
        if item_year != year or item_month < 1 or item_month > 12:
            continue
        monthly_totals[item_month - 1]["cheltuieli"] += float(e.get("suma") or 0)

    months: List[FinancialMonthly] = []
    for idx, totals in enumerate(monthly_totals):
        months.append(
            FinancialMonthly(
                luna=MONTH_NAMES[idx],
                granturi=totals["granturi"],
                donatii=totals["donatii"],
                donatii_mari=totals["donatii_mari"],
                redirectionari=totals["redirectionari"],
                cheltuieli=totals["cheltuieli"],
            )
        )

    return months


# ── Beneficiari by project ───────────────────────────────────────────────────

@router.get("/beneficiari-by-project", response_model=List[BeneficiariByProject])
async def beneficiari_by_project(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    resp = supabase_admin.table("projects").select(
        "id, name, category, beneficiari_directi"
    ).execute()

    return [
        BeneficiariByProject(
            project_id=p["id"],
            project_name=p["name"],
            category=p.get("category"),
            directi=p.get("beneficiari_directi") or 0,
            total=p.get("beneficiari_directi") or 0,
        )
        for p in (resp.data or [])
    ]


# ── Recent activity ────────────────────────────────────────────────────────

@router.get("/recent-activity", response_model=List[RecentActivityItem])
async def recent_activity(
    limit: int = Query(10, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    items: List[Dict[str, Any]] = []

    # Tasks (recently updated)
    tasks_resp = (
        supabase_admin.table("tasks")
        .select("id, title, status, updated_at")
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    for t in tasks_resp.data or []:
        items.append({
            "type": "task",
            "title": t["title"],
            "subtitle": f"Status: {t['status']}",
            "date": t.get("updated_at") or t.get("created_at", ""),
            "link": f"/proiecte?task={t['id']}",
        })

    # Expenses (recently added)
    exp_resp = (
        supabase_admin.table("expenses")
        .select("id, furnizor, suma, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    for e in exp_resp.data or []:
        items.append({
            "type": "expense",
            "title": f"Cheltuială: {e.get('furnizor', 'N/A')}",
            "subtitle": f"{e.get('suma', 0)} RON",
            "date": e.get("created_at", ""),
            "link": f"/financiar?expense={e['id']}",
        })

    # Donations (recently added)
    don_resp = (
        supabase_admin.table("donations")
        .select("id, donator_name, suma, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    for d in don_resp.data or []:
        items.append({
            "type": "donation",
            "title": f"Donație: {d.get('donator_name', 'Anonim')}",
            "subtitle": f"{d.get('suma', 0)} RON",
            "date": d.get("created_at", ""),
            "link": f"/financiar?donation={d['id']}",
        })

    # Social posts (published)
    social_resp = (
        supabase_admin.table("social_posts")
        .select("id, text, published_at")
        .eq("status", "published")
        .order("published_at", desc=True)
        .limit(limit)
        .execute()
    )
    for s in social_resp.data or []:
        items.append({
            "type": "social",
            "title": f"Post publicat: {(s.get('text') or '')[:60]}...",
            "subtitle": None,
            "date": s.get("published_at") or s.get("created_at", ""),
            "link": "/social",
        })

    # Sort all by date desc and trim
    items.sort(key=lambda x: x.get("date", ""), reverse=True)
    items = items[:limit]

    return [RecentActivityItem(**i) for i in items]
