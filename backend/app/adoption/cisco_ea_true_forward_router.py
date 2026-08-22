"""
Cisco EA True Forward Router

Endpoints:
  GET /api/adoption/cisco-ea-true-forward/report-data
      → rows (metering+tasks merged) + ccw subscriptions
        Frontend handles all filters, KPIs and charts.
"""
import logging
from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.adoption.cisco_ea_true_forward_service import get_true_forward_report_data
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/adoption/cisco-ea-true-forward",
    tags=["adoption-cisco-ea-true-forward"],
)
bearer_scheme = HTTPBearer()


def _current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


@router.get("/report-data", response_model=Dict[str, Any])
def true_forward_report_data(
    current_user: Annotated[dict, Depends(_current_user)],
):
    """
    Dados unificados para CiscoEATrueForwardPage.
    Retorna rows (metering + tarefas mesclados) + ccw (subscriptions CCW).
    O frontend cuida de todos os filtros, KPIs e gráficos.
    """
    try:
        return get_true_forward_report_data()
    except Exception as exc:
        logger.error("true_forward_report_data error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
