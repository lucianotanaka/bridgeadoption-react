"""
Adoption Forecast Router — endpoints:
  GET /api/adoption/forecast/fiscal-years
  GET /api/adoption/forecast/summary?fy=2026
  GET /api/adoption/forecast/by-task-type?fy=2026
  GET /api/adoption/forecast/by-owner?fy=2026
  GET /api/adoption/forecast/by-client?fy=2026
  GET /api/adoption/forecast/incentive/by-fy
  GET /api/adoption/forecast/incentive/by-fy-type
  GET /api/adoption/forecast/incentive/by-status
  GET /api/adoption/forecast/incentive/by-csm
  GET /api/adoption/forecast/incentive/effort-client
  GET /api/adoption/forecast/incentive/effort-use-case
"""
import logging
from typing import Annotated, Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.adoption.forecast_service import (
    get_forecast_fiscal_years,
    get_forecast_summary,
    get_forecast_by_task_type,
    get_forecast_by_owner,
    get_forecast_by_client,
    get_incentive_by_fy,
    get_incentive_by_fy_and_type,
    get_incentive_by_status,
    get_incentive_by_csm,
    get_incentive_effort_by_client,
    get_incentive_effort_by_use_case,
)
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/adoption/forecast", tags=["adoption-forecast"])
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


def _is_manager(payload: dict) -> bool:
    return any(r.upper() in {"ADMIN", "MANAGER"} for r in payload.get("roles", []))


@router.get("/fiscal-years", response_model=List[int])
def fiscal_years(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_forecast_fiscal_years()


@router.get("/summary", response_model=List[Dict[str, Any]])
def forecast_summary(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: int = Query(..., description="Fiscal year"),
):
    return get_forecast_summary(fy)


@router.get("/by-task-type", response_model=List[Dict[str, Any]])
def forecast_by_task_type(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: int = Query(...),
):
    return get_forecast_by_task_type(fy)


@router.get("/by-owner", response_model=List[Dict[str, Any]])
def forecast_by_owner(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: int = Query(...),
):
    user_id = int(current_user.get("sub", 0))
    is_mgr = _is_manager(current_user)
    return get_forecast_by_owner(fy, user_id, is_mgr)


@router.get("/by-client", response_model=Dict[str, Any])
def forecast_by_client(
    current_user: Annotated[dict, Depends(get_current_user)],
    fy: int = Query(...),
):
    return get_forecast_by_client(fy)


@router.get("/incentive/by-fy", response_model=List[Dict[str, Any]])
def incentive_by_fy(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_incentive_by_fy()


@router.get("/incentive/by-fy-type", response_model=List[Dict[str, Any]])
def incentive_by_fy_type(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_incentive_by_fy_and_type()


@router.get("/incentive/by-status", response_model=Dict[str, Any])
def incentive_by_status(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_incentive_by_status()


@router.get("/incentive/by-csm", response_model=List[Dict[str, Any]])
def incentive_by_csm(current_user: Annotated[dict, Depends(get_current_user)]):
    user_id = int(current_user.get("sub", 0))
    is_mgr = _is_manager(current_user)
    return get_incentive_by_csm(user_id, is_mgr)


@router.get("/incentive/effort-client", response_model=List[Dict[str, Any]])
def incentive_effort_client(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_incentive_effort_by_client()


@router.get("/incentive/effort-use-case", response_model=List[Dict[str, Any]])
def incentive_effort_use_case(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_incentive_effort_by_use_case()
