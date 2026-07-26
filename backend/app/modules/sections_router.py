"""
Sections Router — Portfolio, Projects, Renewals, Admin endpoints
"""
import logging
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.modules.sections_service import (
    get_farol, get_companies, get_cisco_ea_metering, get_cisco_ea_consolidated,
    get_projects, get_project_team, get_renewals,
    get_users, search_users, get_user_by_id, update_user,
    get_csm_active, get_roles, get_admin_companies,
    get_user_roles, assign_role_to_user, remove_role_from_user,
    get_role_permissions, list_actions, list_resources,
    add_permission_to_role, remove_permission_from_role, update_permission,
    get_team_goals, get_assets, get_account_team,
    get_adoption_tasks, get_cisco_sa_usage, get_cisco_true_forward,
)
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)]) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    return payload


def _is_admin(payload: dict) -> bool:
    return any(r.upper() in {"ADMIN"} for r in payload.get("roles", []))


# ─── Portfolio ────────────────────────────────────────────
portfolio_router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

@portfolio_router.get("/farol", response_model=List[Dict[str, Any]])
def portfolio_farol(
    current_user: Annotated[dict, Depends(get_current_user)],
    vendor_id: int = Query(1),
    customer_id: Optional[int] = Query(None),
):
    return get_farol(vendor_id=vendor_id, customer_id=customer_id)

@portfolio_router.get("/companies", response_model=List[Dict[str, Any]])
def portfolio_companies(
    current_user: Annotated[dict, Depends(get_current_user)],
    search: Optional[str] = Query(None),
):
    return get_companies(search)

@portfolio_router.get("/cisco-ea/metering", response_model=List[Dict[str, Any]])
def portfolio_ea_metering(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_cisco_ea_metering(customer_id)

@portfolio_router.get("/cisco-ea/consolidated", response_model=List[Dict[str, Any]])
def portfolio_ea_consolidated(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_cisco_ea_consolidated(customer_id)

@portfolio_router.get("/assets", response_model=List[Dict[str, Any]])
def portfolio_assets(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: int = Query(...),
):
    return get_assets(customer_id)

@portfolio_router.get("/account-team", response_model=List[Dict[str, Any]])
def portfolio_account_team(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_account_team(customer_id)

@portfolio_router.get("/adoption-tasks", response_model=List[Dict[str, Any]])
def portfolio_adoption_tasks(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_adoption_tasks(customer_id)

@portfolio_router.get("/cisco-sa/usage", response_model=List[Dict[str, Any]])
def portfolio_cisco_sa(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_cisco_sa_usage(customer_id)

@portfolio_router.get("/cisco-true-forward", response_model=List[Dict[str, Any]])
def portfolio_cisco_true_forward(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_cisco_true_forward()


# ─── Projects ─────────────────────────────────────────────
projects_router = APIRouter(prefix="/api/projects", tags=["projects"])

@projects_router.get("", response_model=List[Dict[str, Any]])
def list_projects(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_projects(customer_id=customer_id)

@projects_router.get("/{project_id}/team", response_model=List[Dict[str, Any]])
def project_team(
    project_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return get_project_team(project_id)


# ─── Renewals ─────────────────────────────────────────────
renewals_router = APIRouter(prefix="/api/renewals", tags=["renewals"])

@renewals_router.get("", response_model=List[Dict[str, Any]])
def list_renewals(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_renewals(customer_id)


# ─── Admin ────────────────────────────────────────────────
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

# ─── Admin — Users ───────────────────────────────────────

@admin_router.get("/users", response_model=List[Dict[str, Any]])
def admin_users(current_user: Annotated[dict, Depends(get_current_user)], active_only: bool = Query(False)):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_users(active_only)

@admin_router.get("/users/search", response_model=List[Dict[str, Any]])
def admin_users_search(current_user: Annotated[dict, Depends(get_current_user)], name: Optional[str] = Query(None), email: Optional[str] = Query(None)):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return search_users(name, email)

@admin_router.get("/users/{user_id}", response_model=Dict[str, Any])
def admin_user_detail(user_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_user_by_id(user_id)

@admin_router.put("/users/{user_id}", response_model=Dict[str, Any])
def admin_user_update(user_id: int, body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return {"success": update_user(user_id, body)}

@admin_router.get("/users/{user_id}/roles", response_model=List[Dict[str, Any]])
def admin_user_roles(user_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_user_roles(user_id)

@admin_router.post("/users/{user_id}/roles/{role_id}", response_model=Dict[str, Any])
def admin_assign_role(user_id: int, role_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return {"success": assign_role_to_user(user_id, role_id)}

@admin_router.delete("/users/{user_id}/roles/{role_id}", response_model=Dict[str, Any])
def admin_remove_role(user_id: int, role_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return {"success": remove_role_from_user(user_id, role_id)}

# ─── Admin — Roles & Permissions ─────────────────────────

@admin_router.get("/roles", response_model=List[Dict[str, Any]])
def admin_roles(current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_roles()

@admin_router.get("/roles/{user_role_id}/permissions", response_model=List[Dict[str, Any]])
def admin_role_permissions(user_role_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_role_permissions(user_role_id)

@admin_router.get("/actions", response_model=List[Dict[str, Any]])
def admin_actions(current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return list_actions()

@admin_router.get("/resources", response_model=List[Dict[str, Any]])
def admin_resources(current_user: Annotated[dict, Depends(get_current_user)], only_active: bool = Query(True)):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return list_resources(only_active)

@admin_router.post("/permissions", response_model=Dict[str, Any])
def admin_add_permission(body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return {"success": add_permission_to_role(body["user_role_id"], body["resource_id"], body["action_id"])}

@admin_router.delete("/permissions/{permission_id}", response_model=Dict[str, Any])
def admin_remove_permission(permission_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return {"success": remove_permission_from_role(permission_id)}

@admin_router.put("/permissions/{permission_id}", response_model=Dict[str, Any])
def admin_update_permission(permission_id: int, body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return {"success": update_permission(permission_id, body["action_id"])}

# ─── Admin — Companies ────────────────────────────────────

@admin_router.get("/companies", response_model=List[Dict[str, Any]])
def admin_companies(current_user: Annotated[dict, Depends(get_current_user)], search: Optional[str] = Query(None)):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_admin_companies(search)

# ─── Admin — CSM List ─────────────────────────────────────

@admin_router.get("/csm-list", response_model=List[Dict[str, Any]])
def admin_csm_list(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_csm_active()

# ─── Admin — Team Goals ───────────────────────────────────

@admin_router.get("/team-goals", response_model=List[Dict[str, Any]])
def admin_team_goals(current_user: Annotated[dict, Depends(get_current_user)], fy: Optional[int] = Query(None)):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_team_goals(fy)
