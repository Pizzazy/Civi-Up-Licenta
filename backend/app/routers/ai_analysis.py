"""AI financial analysis endpoint powered by Gemini."""

from __future__ import annotations

import json
import logging
import re
import time
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

try:
    import google.generativeai as genai
except Exception:  # pragma: no cover - handled at runtime
    genai = None

from app.config import settings
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.schemas.ai_analysis import AIAnalysisRequest, AIAnalysisResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai-analysis", tags=["ai-analysis"])


def _safe_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _parse_year_month(*raw_values: Any) -> Optional[str]:
    for value in raw_values:
        if not value:
            continue

        if isinstance(value, datetime):
            return f"{value.year:04d}-{value.month:02d}"

        if isinstance(value, str):
            candidate = value.strip()
            if not candidate:
                continue
            try:
                parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
                return f"{parsed.year:04d}-{parsed.month:02d}"
            except ValueError:
                if len(candidate) >= 7 and candidate[4] == "-":
                    return candidate[:7]

    return None


def _top_series(rows: Iterable[Dict[str, Any]], key: str) -> List[Dict[str, Any]]:
    totals: Dict[str, float] = defaultdict(float)
    for row in rows:
        raw_value = row.get(key) or "Altele"
        label = str(raw_value).strip() or "Altele"
        totals[label] += _safe_float(row.get("suma"))

    return [
        {"categorie": categorie, "suma": round(total, 2)}
        for categorie, total in sorted(totals.items(), key=lambda item: item[1], reverse=True)
        if total > 0
    ]


def _monthly_series(expenses: List[Dict[str, Any]], donations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    buckets: Dict[str, Dict[str, float]] = defaultdict(lambda: {"venituri": 0.0, "cheltuieli": 0.0})

    for row in donations:
        month_key = _parse_year_month(row.get("donation_date"), row.get("created_at"))
        if month_key:
            buckets[month_key]["venituri"] += _safe_float(row.get("suma"))

    for row in expenses:
        if row.get("status") and row.get("status") != "aprobat":
            continue
        month_key = _parse_year_month(row.get("expense_date"), row.get("created_at"))
        if month_key:
            buckets[month_key]["cheltuieli"] += _safe_float(row.get("suma"))

    return [
        {
            "categorie": month_key,
            "suma": round(values["venituri"] - values["cheltuieli"], 2),
        }
        for month_key, values in sorted(buckets.items())
    ]


def _trim_rows(rows: List[Dict[str, Any]], fields: List[str], limit: int = 20) -> List[Dict[str, Any]]:
    return [
        {field: row.get(field) for field in fields}
        for row in rows[:limit]
    ]


def _build_context(question: str) -> Dict[str, Any]:
    donations_resp = (
        supabase_admin.table("donations")
        .select("id, suma, income_category, donation_date, created_at, donator_name")
        .order("created_at", desc=True)
        .range(0, 499)
        .execute()
    )
    expenses_resp = (
        supabase_admin.table("expenses")
        .select("id, suma, category, expense_date, created_at, status, furnizor")
        .order("created_at", desc=True)
        .range(0, 499)
        .execute()
    )

    donations = donations_resp.data or []
    expenses = expenses_resp.data or []
    approved_expenses = [row for row in expenses if row.get("status") == "aprobat"]

    income_total = sum(_safe_float(row.get("suma")) for row in donations)
    expense_total = sum(_safe_float(row.get("suma")) for row in approved_expenses)
    pending_expenses = [row for row in expenses if row.get("status") == "in_asteptare"]

    top_income_categories = _top_series(donations, "income_category")
    top_expense_categories = _top_series(approved_expenses, "category")
    expense_status_series = _top_series(expenses, "status")
    monthly_series = _monthly_series(approved_expenses, donations)

    return {
        "question": question,
        "summary": {
            "total_venituri": round(income_total, 2),
            "total_cheltuieli_aprobate": round(expense_total, 2),
            "sold": round(income_total - expense_total, 2),
            "cheltuieli_in_asteptare_count": len(pending_expenses),
            "cheltuieli_in_asteptare_suma": round(sum(_safe_float(row.get("suma")) for row in pending_expenses), 2),
        },
        "series": {
            "venituri_pe_categorii": top_income_categories,
            "cheltuieli_pe_categorii": top_expense_categories,
            "cheltuieli_pe_status": expense_status_series,
            "evolutie_lunara": monthly_series,
        },
        "recent_data": {
            "donations": _trim_rows(donations, ["donator_name", "suma", "income_category", "donation_date", "created_at"]),
            "expenses": _trim_rows(approved_expenses, ["furnizor", "suma", "category", "expense_date", "created_at"]),
        },
    }


def _extract_json(text: str) -> Dict[str, Any]:
    """Extract JSON from text, handling markdown formatting and incomplete responses."""
    cleaned = text.strip()
    
    # Remove markdown code fences
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    
    # Find JSON object boundaries
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    
    # Try to parse as-is first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parsing failed on first attempt: {e}. Attempting recovery...")
        
        # Try to fix incomplete strings at the end (truncated response)
        # Look for unclosed string literals and close them
        try:
            # If the string ends with an opening quote without closing, close it
            if cleaned.endswith('"'):
                # Already has closing quote, try as is
                pass
            elif '"' in cleaned:
                # Find the last opening quote and close it
                last_quote = cleaned.rfind('"')
                if last_quote > 0:
                    # Check if there's content after the last quote that looks incomplete
                    after_quote = cleaned[last_quote + 1:].strip()
                    if after_quote and not after_quote.endswith('}'):
                        # Looks like incomplete content, try closing the JSON
                        cleaned = cleaned[:last_quote + 1] + '", "chart_data": []}'
                        logger.debug(f"Recovered incomplete JSON: {cleaned[:100]}...")
                        return json.loads(cleaned)
        except Exception as recovery_error:
            logger.error(f"Recovery attempt failed: {recovery_error}")
        
        raise


def _call_gemini_with_retry(model, prompt: str, max_retries: int = 3) -> str:
    """Call Gemini with exponential backoff retry logic for rate limits."""
    for attempt in range(max_retries):
        try:
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "top_p": 0.95,
                    "max_output_tokens": 2048,  # Increased from 512 to handle complex analyses
                },
            )
            raw_text = getattr(response, "text", "") or ""
            return raw_text
        except Exception as exc:
            error_msg = str(exc)
            logger.warning(f"Gemini API attempt {attempt + 1}/{max_retries} failed: {error_msg}")
            
            # Check if it's a rate limit error
            if attempt < max_retries - 1 and ("429" in error_msg or "rate" in error_msg.lower() or "quota" in error_msg.lower()):
                wait_time = 2 ** (attempt + 1)  # Exponential backoff: 2, 4, 8 seconds
                logger.info(f"Rate limit detected. Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
                continue
            
            # For other errors or last attempt, raise
            logger.error(f"Gemini API error (attempt {attempt + 1}/{max_retries}): {error_msg}", exc_info=True)
            raise
    
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Imposibil de contactat API-ul Gemini după multiple încercări.",
    )


@router.post("", response_model=AIAnalysisResponse)
async def analyze_financial_data(
    body: AIAnalysisRequest,
    _current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(f"📊 Analiză financiară: '{body.question}'")
    
    if not settings.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY missing from backend/.env")
        raise HTTPException(status_code=500, detail="Lipsește GEMINI_API_KEY din backend/.env.")
    if genai is None:
        logger.error("google-generativeai package not installed")
        raise HTTPException(status_code=500, detail="Pachetul google-generativeai nu este instalat.")

    try:
        context = _build_context(body.question)
        logger.debug(f"Context built: {len(context.get('recent_data', {}).get('donations', []))} donations, {len(context.get('recent_data', {}).get('expenses', []))} expenses")
    except Exception as exc:
        logger.error(f"Error building context: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Eroare la citirea datelor din Supabase: {exc}") from exc

    system_prompt = (
        "Ești un analist financiar pentru un ONG din România. "
        "Primești un obiect JSON cu întrebare și date financiare agregate din Supabase. "
        "Răspunde STRICT cu JSON valid, fără markdown, fără explicații suplimentare, fără code fences. "
        "Schema exactă este: {\"text_ai\": \"...\", \"chart_data\": [{\"categorie\": \"X\", \"suma\": 100}]}. "
        "text_ai trebuie să fie o concluzie scurtă, clară, în limba română, cu 1-4 propoziții. "
        "chart_data trebuie să conțină doar obiecte cu cheile categorie și suma, folosind numere reale din date. "
        "Nu inventa valori și nu adăuga chei suplimentare. Dacă datele sunt insuficiente, întoarce chart_data ca listă goală și explică scurt limitarea în text_ai."
    )

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_prompt,
        )
        logger.debug("Gemini model configured")

        prompt = json.dumps(context, ensure_ascii=False)
        logger.debug(f"Calling Gemini API with prompt length: {len(prompt)}")
        
        raw_text = _call_gemini_with_retry(model, prompt)
        logger.debug(f"Gemini response received: {len(raw_text)} chars")
        
        payload = _extract_json(raw_text)
        logger.debug(f"JSON extracted: {payload}")
        
        validated = AIAnalysisResponse.model_validate(payload)
        logger.info("✅ Analiză financiară completată cu succes")
        return validated
        
    except HTTPException:
        raise
    except json.JSONDecodeError as exc:
        logger.error(f"JSON decode error: {exc}, raw response: {raw_text[:200]}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Răspunsul AI nu este JSON valid: {exc}",
        ) from exc
    except Exception as exc:
        logger.error(f"Unexpected error in AI analysis: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI-ul nu a putut genera analiza financiară: {exc}",
        ) from exc