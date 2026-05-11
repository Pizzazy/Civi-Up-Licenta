"""OCR router — receipt upload + text extraction."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
import httpx

from app.config import settings
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter(prefix="/ocr", tags=["ocr"])

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}


class OCRResult(BaseModel):
    job_id: str
    extracted: Dict[str, Optional[str]]
    confidence: float
    document_type: Optional[str] = None
    file_url: Optional[str] = None
    raw_text: Optional[str] = None


def _normalize_text(text: str) -> str:
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())


def _to_iso_date(day: str, month: str, year: str) -> Optional[str]:
    try:
        y = int(year)
        if y < 100:
            y += 2000
        d = int(day)
        m = int(month)
        return f"{y:04d}-{m:02d}-{d:02d}"
    except Exception:
        return None


def _normalize_amount(raw: str) -> Optional[str]:
    val = raw.upper().replace(" ", "").replace("RON", "").replace("LEI", "")
    val = val.replace("O", "0")
    # Romanian style: 1.234,56 -> 1234.56
    if "," in val and "." in val:
        val = val.replace(".", "").replace(",", ".")
    else:
        val = val.replace(",", ".")
    val = re.sub(r"[^0-9.]", "", val)

    # OCR often drops comma in thousands+decimals: 1.28458 -> 1284.58
    if re.match(r"^\d+\.\d{3,}$", val):
        compact = val.replace(".", "")
        if len(compact) > 2:
            val = f"{compact[:-2]}.{compact[-2:]}"

    if not val:
        return None
    try:
        amount = float(val)
        return f"{amount:.2f}"
    except Exception:
        return None


def _best_supplier_line(text: str) -> Optional[str]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    candidates = [
        ln for ln in lines
        if re.search(r"\b(S\.?R\.?L\.?|S\.?A\.?|PFA|II)\b", ln, re.IGNORECASE)
    ]
    if not candidates:
        return None
    return max(candidates, key=len)


def _parse_extracted(text: str) -> Dict[str, Optional[str]]:
    """Best-effort regex parsing of furnizor, suma, data, numar_factura."""

    furnizor: Optional[str] = None
    suma: Optional[str] = None
    data_str: Optional[str] = None
    numar_factura: Optional[str] = None

    normalized = _normalize_text(text)

    # Furnizor — look for a legal entity line first
    furnizor = _best_supplier_line(normalized)
    if not furnizor:
        m = re.search(r"([A-ZȘȚĂÂÎa-zșțăâî0-9 &.\-]+(?:S\.?R\.?L\.?|S\.?A\.?))", normalized)
        if m:
            furnizor = m.group(1).strip()

    # Suma — number with decimals preceded by keywords
    amount_candidates = []
    for line in normalized.splitlines():
        upper = line.upper()
        if re.search(r"\b(TOTAL|SUMA|VALOARE|AMOUNT)\b", upper):
            # Higher score for payment-total phrases
            score = 1
            if "TOTAL DE PLATA" in upper:
                score = 5
            elif "VALOARE TOTALA" in upper or "TOTAL GENERAL" in upper:
                score = 4
            elif "TOTAL" in upper:
                score = 3
            elif "SUMA" in upper or "VALOARE" in upper:
                score = 2

            for match in re.findall(r"([0-9O][0-9O.,\s]{1,20})", line):
                normalized_val = _normalize_amount(match)
                if normalized_val:
                    amount_candidates.append((score, float(normalized_val), normalized_val))

    if amount_candidates:
        # Pick highest priority keyword, then highest numeric value among those
        amount_candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
        suma = amount_candidates[0][2]

    if not suma:
        # Fallback: any money-looking number, skip obvious date fragments
        amounts = re.findall(r"\d{1,6}(?:[.,]\d{2,5})\b", normalized)
        amounts = [a for a in amounts if not re.match(r"^\d{1,2}[.,]\d{1,2}$", a)]
        normalized_amounts = [a for a in (_normalize_amount(x) for x in amounts) if a]
        if normalized_amounts:
            suma = max(normalized_amounts, key=lambda x: float(x))

    # Data — dd/mm/yyyy or dd.mm.yyyy or yyyy-mm-dd
    m = re.search(r"(\d{2})[./\-](\d{2})[./\-](\d{2,4})", normalized)
    if m:
        data_str = _to_iso_date(m.group(1), m.group(2), m.group(3))
    else:
        m = re.search(r"(\d{4})[.\-](\d{2})[.\-](\d{2})", normalized)
        if m:
            data_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    # Numar factura - patterns with SERIA / NR / FACTURA
    patterns = [
        r"(?:FACTUR[AĂ]|INVOICE)\s*(?:SERIA\s*([A-Z0-9\-]+))?\s*(?:NR\.?\s*|NO\.?\s*|#\s*)([A-Z0-9\-/]+)",
        r"(?:NR\.?\s*FACTUR[AĂ]|FACTUR[AĂ]\s*NR\.?)\s*[:#]?\s*([A-Z0-9\-/]+)",
        r"\bSERIA\s*([A-Z0-9\-]{1,10})\s*NR\.?\s*[:#]?\s*([A-Z0-9'\-/:]{2,})",
        r"\bNR\.?\s*[:#]?\s*([A-Z0-9'\-/:]{2,})",
    ]
    for p in patterns:
        m = re.search(p, normalized, re.IGNORECASE)
        if m:
            groups = [g for g in m.groups() if g]
            if groups:
                numar_factura = "-".join(groups).replace(" ", "").replace("'", "")
                numar_factura = numar_factura.replace(":", "-")
                break

    return {
        "furnizor": furnizor,
        "suma": suma,
        "data": data_str,
        "numar_factura": numar_factura,
    }


def _detect_document_type(text: str) -> str:
    lower = text.lower()
    if "factura" in lower or "invoice" in lower:
        return "factura"
    return "bon"


async def _ocr_via_ocr_space(
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> str:
    if not settings.OCR_SPACE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OCR.space API key lipsește. Setează OCR_SPACE_API_KEY în backend.",
        )

    data = {
        "apikey": settings.OCR_SPACE_API_KEY,
        "language": settings.OCR_SPACE_LANGUAGE or "eng",
        "isOverlayRequired": "false",
        "detectOrientation": "true",
    }
    files = {
        "file": (filename or "upload", file_bytes, content_type or "application/octet-stream"),
    }

    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(settings.OCR_SPACE_URL, data=data, files=files)

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"OCR.space a răspuns cu eroare HTTP {resp.status_code}.",
        )

    payload = resp.json()
    if payload.get("IsErroredOnProcessing"):
        message = payload.get("ErrorMessage") or payload.get("ErrorDetails") or "Eroare OCR.space."
        if isinstance(message, list):
            message = "; ".join(str(m) for m in message if m)
        raise HTTPException(status_code=502, detail=str(message))

    results = payload.get("ParsedResults") or []
    parsed = [r.get("ParsedText", "") for r in results if isinstance(r, dict)]
    text = _normalize_text("\n".join(parsed))
    return text


def _calculate_confidence(extracted: Dict[str, Optional[str]]) -> float:
    """Score from 0-100 based on how many fields were extracted."""
    found = sum(1 for v in extracted.values() if v)
    return round(found / len(extracted) * 100, 2)


@router.post("/process", response_model=OCRResult)
async def process_receipt(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tip fișier nepermis: {file.content_type}. Permise: {', '.join(ALLOWED_TYPES)}",
        )

    file_bytes = await file.read()
    uid = current_user["id"]
    file_id = str(uuid.uuid4())
    safe_name = (file.filename or "receipt").replace(" ", "_")
    storage_path = f"receipts/{uid}/{file_id}_{safe_name}"

    # 1. Upload to Supabase Storage
    file_url: Optional[str] = None
    try:
        supabase_admin.storage.from_("receipts").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
        file_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/receipts/{storage_path}"
    except Exception:
        # Storage might not be configured — continue anyway
        pass

    # 2. Run OCR
    raw_text = ""
    extracted: Dict[str, Optional[str]] = {
        "furnizor": None,
        "suma": None,
        "data": None,
        "numar_factura": None,
    }

    try:
        raw_text = await _ocr_via_ocr_space(
            file_bytes=file_bytes,
            filename=file.filename or "receipt",
            content_type=file.content_type or "application/octet-stream",
        )
        extracted = _parse_extracted(raw_text)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OCR prin OCR.space a eșuat. Detalii: {exc}",
        ) from exc

    confidence = _calculate_confidence(extracted)

    # 3. Save OCR job
    now = datetime.now(timezone.utc).isoformat()
    job_data = {
        "file_url": file_url,
        "status": "completed",
        "extracted_data": extracted,
        "confidence": confidence,
        "started_at": now,
        "completed_at": now,
        "created_by": uid,
    }
    job_resp = supabase_admin.table("ocr_jobs").insert(job_data).execute()
    job_id = job_resp.data[0]["id"] if job_resp.data else file_id

    return OCRResult(
        job_id=job_id,
        extracted=extracted,
        confidence=confidence,
        document_type=_detect_document_type(raw_text),
        file_url=file_url,
        raw_text=raw_text[:2000] if raw_text else None,
    )
