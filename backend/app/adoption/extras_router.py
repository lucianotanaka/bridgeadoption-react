"""
Adoption Extras Router — CSM Account, Team Target, LCI Status, Rebate, Use Cases

Endpoints:
  GET /api/adoption/csm-account/accounts
  GET /api/adoption/csm-account/summary
  GET /api/adoption/team-target/fiscal-years
  GET /api/adoption/team-target?fy=2026
  GET /api/adoption/lci-status/eligible
  GET /api/adoption/lci-status/solution-vs-project
  GET /api/adoption/rebate/task-incentive
  GET /api/adoption/rebate/cisco-ea
  GET /api/adoption/rebate/lci-approved
  GET /api/adoption/rebate/lci-journey
  GET /api/adoption/use-cases
  GET /api/adoption/use-cases/companies
"""
import logging
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.adoption.csm_account_service import get_csm_accounts, get_csm_account_summary
from app.adoption.extras_service import (
    get_team_target_fiscal_years, get_team_target,
    get_lci_eligible_status, get_lci_solution_vs_project,
    get_rebate_fiscal_years, get_rebate_task_incentive, get_rebate_cisco_ea,
    get_rebate_lci_approved, get_rebate_lci_journey,
    get_rebate_sip_opportunities, get_rebate_summary,
    get_use_cases, get_use_case_companies,
)
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)]) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    return payload


# ─── CSM Account ──────────────────────────────────────────
csm_router = APIRouter(prefix="/api/adoption/csm-account", tags=["adoption-csm-account"])

@csm_router.get("/accounts", response_model=List[Dict[str, Any]])
def csm_accounts(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_csm_accounts()

@csm_router.get("/summary", response_model=Dict[str, Any])
def csm_summary(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_csm_account_summary()


# ─── Team Target ──────────────────────────────────────────
target_router = APIRouter(prefix="/api/adoption/team-target", tags=["adoption-team-target"])

@target_router.get("/fiscal-years", response_model=List[int])
def target_fiscal_years(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_team_target_fiscal_years()

@target_router.get("", response_model=List[Dict[str, Any]])
def team_target(current_user: Annotated[dict, Depends(get_current_user)], fy: Optional[int] = Query(None)):
    return get_team_target(fy)


# ─── LCI Status ───────────────────────────────────────────
lci_status_router = APIRouter(prefix="/api/adoption/lci-status", tags=["adoption-lci-status"])

@lci_status_router.get("/eligible", response_model=List[Dict[str, Any]])
def lci_eligible(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_lci_eligible_status()

@lci_status_router.get("/solution-vs-project", response_model=List[Dict[str, Any]])
def lci_solution_vs_project(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_lci_solution_vs_project()


# ─── Rebate ───────────────────────────────────────────────
rebate_router = APIRouter(prefix="/api/adoption/rebate", tags=["adoption-rebate"])

@rebate_router.get("/fiscal-years", response_model=List[int])
def rebate_fiscal_years(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_rebate_fiscal_years()

@rebate_router.get("/summary", response_model=Dict[str, Any])
def rebate_summary(current_user: Annotated[dict, Depends(get_current_user)], fy: int = Query(...)):
    return get_rebate_summary(fy)

@rebate_router.get("/task-incentive", response_model=List[Dict[str, Any]])
def rebate_task_incentive(current_user: Annotated[dict, Depends(get_current_user)], fy: Optional[int] = Query(None)):
    return get_rebate_task_incentive(fy)

@rebate_router.get("/sip-opportunities", response_model=List[Dict[str, Any]])
def rebate_sip_opportunities(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_rebate_sip_opportunities()

@rebate_router.get("/cisco-ea", response_model=List[Dict[str, Any]])
def rebate_cisco_ea(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_rebate_cisco_ea()

@rebate_router.get("/lci-approved", response_model=List[Dict[str, Any]])
def rebate_lci_approved(current_user: Annotated[dict, Depends(get_current_user)], fy: Optional[int] = Query(None)):
    return get_rebate_lci_approved(fy)

@rebate_router.get("/lci-journey", response_model=List[Dict[str, Any]])
def rebate_lci_journey(current_user: Annotated[dict, Depends(get_current_user)], fy: Optional[int] = Query(None)):
    return get_rebate_lci_journey(fy)


# ─── Use Cases ────────────────────────────────────────────
usecase_router = APIRouter(prefix="/api/adoption/use-cases", tags=["adoption-use-cases"])

@usecase_router.get("", response_model=List[Dict[str, Any]])
def use_cases(current_user: Annotated[dict, Depends(get_current_user)], company_id: Optional[int] = Query(None)):
    return get_use_cases(company_id)

@usecase_router.get("/companies", response_model=List[Dict[str, Any]])
def use_case_companies(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_use_case_companies()
