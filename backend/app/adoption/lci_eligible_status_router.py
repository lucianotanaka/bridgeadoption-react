"""
LCI Eligible Status Router — endpoints for the migrated report_lci_eligible_status.py

Endpoints:
  GET /api/adoption/lci-eligible-status/fiscal-years
  GET /api/adoption/lci-eligible-status/exec-chart?fy=2026
  GET /api/adoption/lci-eligible-status/category-breakdown?fy=2026&category=Success
  GET /api/adoption/lci-eligible-status/portfolio-summary?fy=2026
  GET /api/adoption/lci-eligible-status/execution-detail?fy=2026
"""
import logging
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.adoption.lci_eligible_status_service import (
    get_lci_eligible_status_fiscal_years,
    get_lci_eligible_status_exec_chart,
    get_lci_eligible_status_category_breakdown,
    get_lci_eligible_status_portfolio_summary,
    get_lci_eligible_status_execution_detail,
)
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)]) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    return payload


router = APIRouter(prefix="/api/adoption/lci-eligible-status", tags=["adoption-lci-eligible-status"])


@router.get("/fiscal-years", response_model=List[int])
def fiscal_years(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_lci_eligible_status_fiscal_years()


@router.get("/exec-chart", response_model=Dict[str, Any])
def exec_chart(current_user: Annotated[dict, Depends(get_current_user)], fy: int = Query(...)):
    return get_lci_eligible_status_exec_chart(fy)


@router.get("/category-breakdown", response_model=Dict[str, Any])
def category_breakdown(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: int = Query(...),
    category: str = Query(...),
):
    return get_lci_eligible_status_category_breakdown(fy, category)


@router.get("/portfolio-summary", response_model=List[Dict[str, Any]])
def portfolio_summary(current_user: Annotated[dict, Depends(get_current_user)], fy: Optional[int] = Query(None)):
    return get_lci_eligible_status_portfolio_summary(fy)


@router.get("/execution-detail", response_model=List[Dict[str, Any]])
def execution_detail(current_user: Annotated[dict, Depends(get_current_user)], fy: Optional[int] = Query(None)):
    return get_lci_eligible_status_execution_detail(fy)
