"""Donation schemas."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from app.schemas.user import UserMinimal


class DonationType(str, Enum):
    individual = "individual"
    corporate = "corporate"
    grant = "grant"
    redirectionare_3_5 = "redirectionare_3_5"
    alta = "alta"


class IncomeCategory(str, Enum):
    grant = "grant"
    donatie = "donatie"
    donatie_mare = "donatie_mare"
    redirectionare_3_5 = "redirectionare_3_5"
    sponsorizare = "sponsorizare"
    alta = "alta"


class IncomeDocumentType(str, Enum):
    factura = "factura"
    bon = "bon"


class IncomePaymentStatus(str, Enum):
    in_asteptare_dovada = "in_asteptare_dovada"
    achitat = "achitat"


class DonationBase(BaseModel):
    project_id: Optional[str] = None
    donator_name: Optional[str] = None
    donator_email: Optional[str] = None
    donator_phone: Optional[str] = None
    suma: float
    currency: str = "RON"
    donation_type: DonationType = DonationType.individual
    income_category: IncomeCategory = IncomeCategory.donatie
    donation_date: Optional[date] = None
    document_type: IncomeDocumentType = IncomeDocumentType.factura
    invoice_url: Optional[str] = None
    proof_url: Optional[str] = None
    payment_status: IncomePaymentStatus = IncomePaymentStatus.in_asteptare_dovada
    grant_number: Optional[str] = None
    grant_institution: Optional[str] = None
    is_recurring: bool = False
    recurring_interval: Optional[str] = None
    is_confirmed: bool = False
    confirmation_doc_url: Optional[str] = None
    notes: Optional[str] = None


class DonationCreate(DonationBase):
    pass


class DonationUpdate(BaseModel):
    project_id: Optional[str] = None
    donator_name: Optional[str] = None
    donator_email: Optional[str] = None
    donator_phone: Optional[str] = None
    suma: Optional[float] = None
    currency: Optional[str] = None
    donation_type: Optional[DonationType] = None
    income_category: Optional[IncomeCategory] = None
    donation_date: Optional[date] = None
    document_type: Optional[IncomeDocumentType] = None
    invoice_url: Optional[str] = None
    proof_url: Optional[str] = None
    payment_status: Optional[IncomePaymentStatus] = None
    grant_number: Optional[str] = None
    grant_institution: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurring_interval: Optional[str] = None
    is_confirmed: Optional[bool] = None
    confirmation_doc_url: Optional[str] = None
    notes: Optional[str] = None


class DonationResponse(DonationBase):
    id: str
    added_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    added_by_profile: Optional[UserMinimal] = None

    model_config = {"from_attributes": True}


class DonationSummary(BaseModel):
    by_category: dict  # {income_category: total}
    by_month: list  # [{month, total}]
    total: float


__all__ = [
    "DonationType",
    "IncomeCategory",
    "IncomeDocumentType",
    "IncomePaymentStatus",
    "DonationBase",
    "DonationCreate",
    "DonationUpdate",
    "DonationResponse",
    "DonationSummary",
]
