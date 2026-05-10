"""Schemas for AI financial analysis."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ConfigDict, Field


class AIAnalysisRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class AIAnalysisChartItem(BaseModel):
    categorie: str
    suma: float


class AIAnalysisResponse(BaseModel):
    text_ai: str
    chart_data: List[AIAnalysisChartItem]

    model_config = ConfigDict(extra="forbid")


__all__ = ["AIAnalysisRequest", "AIAnalysisChartItem", "AIAnalysisResponse"]