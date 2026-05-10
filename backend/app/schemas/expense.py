"""Expense schemas."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel

from app.schemas.user import UserMinimal


class ExpenseCategory(str, Enum):
    salarii = "salarii"
    transport = "transport"
    materiale = "materiale"
    marketing = "marketing"
    it = "it"
    evenimente = "evenimente"
    birou = "birou"
    alta = "alta"


class ExpenseStatus(str, Enum):
    in_asteptare = "in_asteptare"
    aprobat = "aprobat"
    respins = "respins"


class ExpenseDocumentType(str, Enum):
    factura = "factura"
    bon = "bon"


class ExpensePaymentStatus(str, Enum):
    in_asteptare_dovada = "in_asteptare_dovada"
    achitat = "achitat"


class ExpenseBase(BaseModel):
    project_id: Optional[str] = None
    furnizor: Optional[str] = None
    item_description: Optional[str] = None
    suma: float
    category: ExpenseCategory = ExpenseCategory.alta
    expense_date: Optional[date] = None
    numar_factura: Optional[str] = None
    document_type: ExpenseDocumentType = ExpenseDocumentType.factura
    invoice_url: Optional[str] = None
    proof_url: Optional[str] = None
    payment_status: ExpensePaymentStatus = ExpensePaymentStatus.in_asteptare_dovada
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    project_id: Optional[str] = None
    furnizor: Optional[str] = None
    item_description: Optional[str] = None
    suma: Optional[float] = None
    category: Optional[ExpenseCategory] = None
    status: Optional[ExpenseStatus] = None
    expense_date: Optional[date] = None
    numar_factura: Optional[str] = None
    document_type: Optional[ExpenseDocumentType] = None
    invoice_url: Optional[str] = None
    proof_url: Optional[str] = None
    payment_status: Optional[ExpensePaymentStatus] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: str
    status: ExpenseStatus = ExpenseStatus.in_asteptare
    ocr_processed: bool = False
    ocr_raw_data: Optional[Dict[str, Any]] = None
    receipt_url: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    added_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    added_by_profile: Optional[UserMinimal] = None
    approved_by_profile: Optional[UserMinimal] = None

    model_config = {"from_attributes": True}


__all__ = [
    "ExpenseCategory",
    "ExpenseStatus",
    "ExpenseDocumentType",
    "ExpensePaymentStatus",
    "ExpenseBase",
    "ExpenseCreate",
    "ExpenseUpdate",
    "ExpenseResponse",
]
