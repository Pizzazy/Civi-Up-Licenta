"""Dashboard aggregate schemas."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_venituri: float = 0
    total_cheltuieli: float = 0
    sold_disponibil: float = 0
    venituri_by_category: dict = {}
    total_beneficiari_directi: int = 0
    proiecte_active: int = 0
    proiecte_total: int = 0
    cheltuieli_in_asteptare_count: int = 0
    cheltuieli_in_asteptare_suma: float = 0


class FinancialMonthly(BaseModel):
    luna: str
    granturi: float = 0
    donatii: float = 0
    donatii_mari: float = 0
    redirectionari: float = 0
    cheltuieli: float = 0


class BeneficiariByProject(BaseModel):
    project_id: str
    project_name: str
    category: Optional[str] = None
    directi: int = 0
    total: int = 0


class RecentActivityItem(BaseModel):
    type: str  # task | expense | donation | social
    title: str
    subtitle: Optional[str] = None
    date: datetime
    link: Optional[str] = None


__all__ = [
    "DashboardSummary",
    "FinancialMonthly",
    "BeneficiariByProject",
    "RecentActivityItem",
]
