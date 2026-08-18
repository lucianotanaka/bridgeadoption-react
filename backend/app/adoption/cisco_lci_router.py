"""
Cisco LCI Router — endpoints:
  GET /api/adoption/cisco-lci/fiscal-years
  GET /api/adoption/cisco-lci/summary?fy=2026
  GET /api/adoption/cisco-lci/by-stage-status?fy=2026
  GET /api/adoption/cisco-lci/termination-status?fy=2026
  GET /api/adoption/cisco-lci/burnup?fy=2026
  GET /api/adoption/cisco-lci/yoy
  GET /api/adoption/cisco-lci/stages?fy=2026&status=approved
"""
import logging
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.adoption.cisco_lci_service import (
    get_lci_fiscal_years,
    get_lci_summary,
    get_lci_by_stage_status,
    get_lci_termination_status,
    get_lci_burnup,
    get_lci_yoy,
    get_lci_stage_rows,
    get_lci_total_eligibles,
    get_lci_lost_justification,
    get_lci_wallet_burndown,
    get_lci_report_data,
)
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/adoption/cisco-lci", tags=["adoption-cisco-lci"])
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


@router.get("/report-data", response_model=Dict[str, Any])
def lci_report_data(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: Optional[int] = Query(None),
):
    """
    Endpoint unificado para CiscoLCIReportPage.
    Retorna summary + total_eligibles + by_stage_status + termination_status
            + burnup + yoy + lost_justification em 1 request.
    Substitui 8 chamadas paralelas. Usa cache TTL de 5 min.
    """
    return get_lci_report_data(fy)


@router.get("/fiscal-years", response_model=List[int])
def lci_fiscal_years(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_lci_fiscal_years()


@router.get("/summary", response_model=Dict[str, Any])
def lci_summary(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: Optional[int] = Query(None),
):
    return get_lci_summary(fy)


@router.get("/by-stage-status", response_model=List[Dict[str, Any]])
def lci_by_stage_status(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: Optional[int] = Query(None),
):
    return get_lci_by_stage_status(fy)


@router.get("/termination-status", response_model=List[Dict[str, Any]])
def lci_termination_status(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: Optional[int] = Query(None),
):
    return get_lci_termination_status(fy)


@router.get("/burnup", response_model=Dict[str, Any])
def lci_burnup(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: int = Query(...),
):
    return get_lci_burnup(fy)


@router.get("/yoy", response_model=List[Dict[str, Any]])
def lci_yoy(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_lci_yoy()


@router.get("/lost-justification", response_model=List[Dict[str, Any]])
def lci_lost_justification(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: Optional[int] = Query(None),
):
    return get_lci_lost_justification(fy)


@router.get("/total-eligibles", response_model=Dict[str, Any])
def lci_total_eligibles(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: Optional[int] = Query(None),
):
    return get_lci_total_eligibles(fy)


@router.get("/wallet-burndown", response_model=Dict[str, Any])
def lci_wallet_burndown(
    current_user: Annotated[dict, Depends(get_current_user)],
    date_from: Optional[str] = Query(None, description="Start month YYYY-MM"),
    date_to: Optional[str] = Query(None, description="End month YYYY-MM"),
    fy: Optional[int] = Query(None, description="NTT Fiscal Year for KPI summary alignment"),
):
    return get_lci_wallet_burndown(date_from, date_to, fy)


@router.get("/stages", response_model=List[Dict[str, Any]])
def lci_stages(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: Optional[int] = Query(None),
    stage_status: str = Query("approved", description="approved|awaiting|ongoing|lost"),
):
    return get_lci_stage_rows(fy, stage_status)
