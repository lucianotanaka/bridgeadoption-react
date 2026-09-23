"""
CPI Adopt Router — endpoints:
  GET /api/cisco/cpi-adopt/report
  GET /api/cisco/cpi-adopt/filters
  GET /api/cisco/cpi-adopt/summary
  POST /api/cisco/cpi-adopt/cache/invalidate
"""
import logging
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.service import load_user_permissions
from app.cisco.cpi_adopt_service import (
    get_cpi_adopt_report,
    get_cpi_adopt_filter_options,
    get_cpi_adopt_summary,
    invalidate_cpi_adopt_cache,
)
from src.infrastructure.database.repositories.cisco_lci_repository import CiscoLCIRepository
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cisco/cpi-adopt", tags=["cisco-cpi-adopt"])
bearer_scheme = HTTPBearer()
_repo = CiscoLCIRepository()


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


def _extract_resource_keys(permissions: Dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    for role_perms in permissions.values():
        if not isinstance(role_perms, dict):
            continue
        for perm in role_perms.values():
            if not isinstance(perm, dict):
                continue
            resource_key = perm.get("resource_key")
            action = perm.get("action")
            if resource_key and action and action != "deny":
                keys.add(str(resource_key))
    return keys


def require_cpi_adopt_permission(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    roles = current_user.get("roles", []) or []
    if "ADMIN" in roles:
        return current_user

    user_id = int(current_user.get("sub", 0))
    if user_id == 0:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    permissions = load_user_permissions(user_id)
    resource_keys = _extract_resource_keys(permissions)

    if "cisco.cpi_adopt" not in resource_keys:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    return current_user


@router.get("/report", response_model=List[Dict[str, Any]])
def cpi_adopt_report(
    current_user: Annotated[dict, Depends(require_cpi_adopt_permission)],
    client: Optional[str] = Query(None, description="Filtro parcial por nome do cliente"),
    task_id: Optional[str] = Query(None, description="Filtro parcial por task id"),
    task_ws: Optional[str] = Query(None, description="Filtro parcial por task ws"),
    deal_id: Optional[str] = Query(None, description="Filtro parcial por deal id"),
    solution: Optional[List[str]] = Query(None, description="Filtro multiselect por solução (task_track)"),
    task_status: Optional[List[str]] = Query(None, description="Filtro multiselect por status"),
    opt_in: Optional[List[str]] = Query(None, description="Filtro multiselect por opt in status"),
    project: Optional[List[str]] = Query(None, description="Filtro multiselect por project"),
    timeline_stage: Optional[List[str]] = Query(None, description="Filtro multiselect por faixa de timeline"),
    fy_start: Optional[int] = Query(None, description="FY NTT inicial (abril-março)"),
    fy_end: Optional[int] = Query(None, description="FY NTT final (abril-março)"),
):
    """
    Retorna as linhas do CPI Adopt Report com filtros opcionais.
    """
    return get_cpi_adopt_report(
        client=client,
        task_id=task_id,
        task_ws=task_ws,
        deal_id=deal_id,
        solution=solution,
        task_status=task_status,
        opt_in=opt_in,
        project=project,
        timeline_stage=timeline_stage,
        fy_start=fy_start,
        fy_end=fy_end,
    )


@router.get("/filters", response_model=Dict[str, List[str]])
def cpi_adopt_filters(
    current_user: Annotated[dict, Depends(require_cpi_adopt_permission)],
    fy_start: Optional[int] = Query(None, description="FY NTT inicial (abril-março)"),
    fy_end: Optional[int] = Query(None, description="FY NTT final (abril-março)"),
):
    """
    Retorna os valores únicos para cada dropdown de filtro.
    """
    return get_cpi_adopt_filter_options(fy_start=fy_start, fy_end=fy_end)


@router.get("/summary", response_model=Dict[str, Any])
def cpi_adopt_summary(
    current_user: Annotated[dict, Depends(require_cpi_adopt_permission)],
    client: Optional[str] = Query(None),
    task_id: Optional[str] = Query(None),
    task_ws: Optional[str] = Query(None),
    deal_id: Optional[str] = Query(None),
    solution: Optional[List[str]] = Query(None),
    task_status: Optional[List[str]] = Query(None),
    opt_in: Optional[List[str]] = Query(None),
    project: Optional[List[str]] = Query(None),
    timeline_stage: Optional[List[str]] = Query(None),
    fy_start: Optional[int] = Query(None, description="FY NTT inicial (abril-março)"),
    fy_end: Optional[int] = Query(None, description="FY NTT final (abril-março)"),
):
    """
    Retorna KPIs agregados (totais) considerando os filtros ativos.
    """
    rows = get_cpi_adopt_report(
        client=client,
        task_id=task_id,
        task_ws=task_ws,
        deal_id=deal_id,
        solution=solution,
        task_status=task_status,
        opt_in=opt_in,
        project=project,
        timeline_stage=timeline_stage,
        fy_start=fy_start,
        fy_end=fy_end,
    )
    return get_cpi_adopt_summary(rows, fy_start=fy_start, fy_end=fy_end)


@router.get("/fy-range", response_model=Dict[str, Optional[int]])
def cpi_adopt_fy_range(
    current_user: Annotated[dict, Depends(require_cpi_adopt_permission)],
):
    """
    Retorna o menor e maior FY NTT disponível na vwCiscoCPIAdopt.
    """
    return _repo.get_cpi_adopt_fy_bounds()


@router.post("/cache/invalidate", status_code=204)
def cpi_adopt_cache_invalidate(
    current_user: Annotated[dict, Depends(require_cpi_adopt_permission)],
):
    """
    Invalida o cache forçando re-carga na próxima requisição.
    Restrito a admins.
    """
    roles = current_user.get("roles", []) or []
    if "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="Admin required")
    invalidate_cpi_adopt_cache()
