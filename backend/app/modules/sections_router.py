"""
Sections Router — Portfolio, Projects, Renewals, Admin endpoints
"""
import logging
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.modules.sections_service import (
    get_farol, get_farol_clients, get_companies, get_cisco_ea_metering, get_cisco_ea_consolidated,
    get_projects, get_project_customers, get_project_team, get_account_team_allocated, get_renewals,
    get_users, search_users, get_user_by_id, update_user, search_persons, create_user,
    get_csm_active, get_roles, get_admin_companies,
    get_user_roles, assign_role_to_user, remove_role_from_user,
    get_role_permissions, list_actions, list_resources,
    add_permission_to_role, remove_permission_from_role, update_permission,
    create_role, update_role, toggle_role_active,
    create_action, create_resource, update_resource, toggle_resource_active,
    get_team_goals, get_assets, get_asset_clients, get_account_team,
    get_account_team_matrix, get_account_team_all_rows, get_account_team_ntt_users,
    get_account_team_companies,
    update_account_team_row, insert_account_team_row,
    get_adoption_tasks, get_cisco_sa_usage, get_cisco_true_forward,
    admin_search_companies, admin_get_company, admin_create_company,
    admin_update_company, admin_vacate_company,
    admin_get_company_tab, admin_get_company_tab_multi,
    admin_add_company_name, admin_update_company_name, admin_vacate_company_name,
    admin_update_cisco_ea_customer,
)
from app.modules.admin_task_service import (
    admin_get_task_filter_options,
    admin_filter_tasks,
    admin_get_activities_one,
    admin_get_activities_many,
    admin_get_records_many,
    admin_get_records_task,
    admin_get_records_activity,
    admin_remove_tasks,
    admin_remove_activity,
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

@portfolio_router.get("/farol/clients", response_model=List[Dict[str, Any]])
def portfolio_farol_clients(
    current_user: Annotated[dict, Depends(get_current_user)],
    vendor_id: int = Query(1),
):
    """
    Returns clients available in Farol for a given vendor.
    Source: tbClientFarol WHERE vendor_id = vendor_id
    Returns: [{ client_id, client_name }]
    """
    return get_farol_clients(vendor_id=vendor_id)


@portfolio_router.get("/farol", response_model=List[Dict[str, Any]])
def portfolio_farol(
    current_user: Annotated[dict, Depends(get_current_user)],
    vendor_id: int = Query(1),
    customer_id: Optional[int] = Query(None),
):
    """
    Returns full Farol data for a vendor + client.
    Source: tbFarol WHERE vendor_id = vendor_id AND customer_id = customer_id
    """
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

@portfolio_router.get("/asset-clients", response_model=List[Dict[str, Any]])
def portfolio_asset_clients(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Returns clients that have assets (for the client selector in AssetsPage).
    Source: tbAssetContractSummaryByCustomer via AssetRepository.filter_asset_clients()
    Returns: [{ client_id, client_name }]
    Mirrors asset_repo.filter_asset_clients() from Streamlit asset.py.
    """
    return get_asset_clients()


@portfolio_router.get("/assets", response_model=List[Dict[str, Any]])
def portfolio_assets(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: int = Query(...),
):
    """
    Returns asset contracts for a given client.
    Source: tbAssetContractEndMismatch via AssetRepository.get_asset_contracts()
    Mirrors asset_repo.get_asset_contracts(client_id=...) from Streamlit asset.py.
    """
    return get_assets(customer_id)

@portfolio_router.get("/account-team/companies", response_model=List[Dict[str, Any]])
def portfolio_account_team_companies(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns all non-VAGO companies for the Account Team edit panel navigation.
    Enables adding the first member to companies with no existing tbAccountTeam rows."""
    return get_account_team_companies()

@portfolio_router.get("/account-team/matrix", response_model=List[Dict[str, Any]])
def portfolio_account_team_matrix(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Returns all allocated account team rows joined with Cisco Domain.
    Frontend builds the pivot matrix from these raw rows.
    """
    return get_account_team_matrix()

@portfolio_router.get("/account-team/rows", response_model=List[Dict[str, Any]])
def portfolio_account_team_rows(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Returns ALL account team rows (allocated + unallocated) for the edit panel.
    """
    return get_account_team_all_rows()

@portfolio_router.get("/account-team/users", response_model=List[Dict[str, Any]])
def portfolio_account_team_users(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns all NTT internal users for the 'Add Member' form."""
    return get_account_team_ntt_users()

@portfolio_router.get("/account-team", response_model=List[Dict[str, Any]])
def portfolio_account_team(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    return get_account_team(customer_id)

@portfolio_router.put("/account-team/{accountteam_id}", response_model=Dict[str, Any])
def portfolio_update_account_team(
    accountteam_id: int,
    body: Dict[str, Any],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Updates an account team record (allocated flag, changed_in, changed_by, end_date).
    Mirrors save_account_team_change() from Streamlit.
    """
    success = update_account_team_row(accountteam_id, body)
    return {"success": success}

@portfolio_router.post("/account-team", response_model=Dict[str, Any])
def portfolio_insert_account_team(
    body: Dict[str, Any],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Inserts a new account team member for a company.
    Mirrors account_team_repo.insert(new_dic) from Streamlit.
    """
    new_id = insert_account_team_row(body)
    return {"accountteam_id": new_id, "success": new_id > 0}

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

@projects_router.get("/customers", response_model=List[Dict[str, Any]])
def list_project_customers(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Returns unique customers that have projects (all statuses).
    Used to populate the CUSTOMER dropdown in ProjectsPage.
    Returns: [{ project_customer_id, project_customer_name }]
    """
    return get_project_customers()

@projects_router.get("/account-team", response_model=List[Dict[str, Any]])
def project_account_team(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: int = Query(...),
):
    """
    Returns ALLOCATED account team members for a customer (accountteam_allocated != 0).
    Uses find_all_df() + allocated filter — same logic as AccountTeamPage matrix.
    Used by ProjectsPage Account Team panel.
    Returns: [{ accountteam_person_type, accountteam_person_name, ... }]
    """
    return get_account_team_allocated(customer_id)

@projects_router.get("", response_model=List[Dict[str, Any]])
def list_projects(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    """
    Returns projects from vwProject.
    When customer_id is provided, returns ALL statuses (including Closed/Canceled).
    When no customer_id, applies default active-status filter.
    """
    return get_projects(customer_id=customer_id)

@projects_router.get("/{project_id}/team", response_model=List[Dict[str, Any]])
def project_team(
    project_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Returns the project team from vwProjectTeam for a specific project.
    Columns: projteam_member_name (NAME), projteam_level_name (TYPE), etc.
    """
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

@admin_router.post("/roles", response_model=Dict[str, Any])
def admin_create_role(body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    result = create_role(body.get("role_name", ""), body.get("role_description", ""))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@admin_router.put("/roles/{role_id}", response_model=Dict[str, Any])
def admin_update_role(role_id: int, body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return update_role(role_id, body.get("role_name", ""), body.get("role_description", ""))

@admin_router.post("/roles/{role_id}/toggle-active", response_model=Dict[str, Any])
def admin_toggle_role_active(role_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return toggle_role_active(role_id)

@admin_router.post("/actions", response_model=Dict[str, Any])
def admin_create_action(body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    result = create_action(body.get("action_key", ""), body.get("action_name", ""))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@admin_router.post("/resources", response_model=Dict[str, Any])
def admin_create_resource(body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    result = create_resource(body.get("resource_key", ""), body.get("resource_name", ""), body.get("resource_icon", ""))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@admin_router.put("/resources/{resource_id}", response_model=Dict[str, Any])
def admin_update_resource(resource_id: int, body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return update_resource(resource_id, body.get("resource_key", ""), body.get("resource_name", ""), body.get("resource_icon", ""))

@admin_router.post("/resources/{resource_id}/toggle-active", response_model=Dict[str, Any])
def admin_toggle_resource_active(resource_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return toggle_resource_active(resource_id)

# ─── Admin — Companies ────────────────────────────────────

@admin_router.get("/companies", response_model=List[Dict[str, Any]])
def admin_companies(current_user: Annotated[dict, Depends(get_current_user)], search: Optional[str] = Query(None)):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_admin_companies(search)

@admin_router.get("/companies/search", response_model=List[Dict[str, Any]])
def admin_companies_search(
    current_user: Annotated[dict, Depends(get_current_user)],
    name: str = Query(..., description="Company name (partial match)"),
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_search_companies(name)

@admin_router.get("/companies/{company_id}", response_model=Dict[str, Any])
def admin_company_detail(
    company_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_get_company(company_id)

@admin_router.post("/companies", response_model=Dict[str, Any])
def admin_company_create(
    body: Dict[str, Any],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_create_company(body)

@admin_router.put("/companies/{company_id}", response_model=Dict[str, Any])
def admin_company_update(
    company_id: int,
    body: Dict[str, Any],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_update_company(company_id, body)

@admin_router.post("/companies/{company_id}/vacate", response_model=Dict[str, Any])
def admin_company_vacate(
    company_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_vacate_company(company_id)

@admin_router.get("/companies/{company_id}/tab/{tab_name}", response_model=List[Dict[str, Any]])
def admin_company_tab(
    company_id: int,
    tab_name: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_get_company_tab(tab_name, company_id)

@admin_router.post("/companies/tab-multi", response_model=List[Dict[str, Any]])
def admin_company_tab_multi(
    body: Dict[str, Any],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Get tab data for multiple company IDs. Body: {tab_name, company_ids}"""
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    tab_name = body.get("tab_name", "")
    company_ids = body.get("company_ids", [])
    return admin_get_company_tab_multi(tab_name, company_ids)

@admin_router.post("/companies/{company_id}/names", response_model=Dict[str, Any])
def admin_company_add_name(
    company_id: int,
    body: Dict[str, Any],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_add_company_name(company_id, body.get("name", ""))

@admin_router.put("/companies/names/{listname_id}", response_model=Dict[str, Any])
def admin_company_update_name(
    listname_id: int,
    body: Dict[str, Any],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_update_company_name(listname_id, body.get("company_id", 0), body.get("name", ""))

@admin_router.post("/companies/names/{listname_id}/vacate", response_model=Dict[str, Any])
def admin_company_vacate_name(
    listname_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_vacate_company_name(listname_id)

@admin_router.put("/cisco-ea/{ea_id}/customer", response_model=Dict[str, Any])
def admin_update_ea_customer(
    ea_id: int,
    body: Dict[str, Any],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return admin_update_cisco_ea_customer(ea_id, body.get("end_customer_id", 0))

# ─── Admin — Persons (for user creation) ─────────────────

@admin_router.get("/persons/search", response_model=List[Dict[str, Any]])
def admin_persons_search(
    current_user: Annotated[dict, Depends(get_current_user)],
    name: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
):
    """Search NTT internal persons (person_company_id IS NULL) for user creation."""
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return search_persons(name, email)

@admin_router.post("/users", response_model=Dict[str, Any])
def admin_user_create(body: Dict[str, Any], current_user: Annotated[dict, Depends(get_current_user)]):
    """Create a new user in tbUser linked to a tbPerson record."""
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    if not body.get("user_person_id"):
        raise HTTPException(status_code=400, detail="user_person_id is required")
    if not body.get("user_name"):
        raise HTTPException(status_code=400, detail="user_name is required")
    if not body.get("user_email"):
        raise HTTPException(status_code=400, detail="user_email is required")
    if not body.get("user_password"):
        raise HTTPException(status_code=400, detail="user_password is required")
    result = create_user(body)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

# ─── Admin — CSM List ─────────────────────────────────────

@admin_router.get("/csm-list", response_model=List[Dict[str, Any]])
def admin_csm_list(current_user: Annotated[dict, Depends(get_current_user)]):
    return get_csm_active()

# ─── Admin — Team Goals ───────────────────────────────────

@admin_router.get("/team-goals", response_model=List[Dict[str, Any]])
def admin_team_goals(current_user: Annotated[dict, Depends(get_current_user)], fy: Optional[int] = Query(None)):
    if not _is_admin(current_user): raise HTTPException(status_code=403, detail="Admin required")
    return get_team_goals(fy)


# ─── Admin — Tasks (admin_task.py migration) ──────────────

class AdminTaskFilterRequest(BaseModel):
    task_id: Optional[int] = None
    ws_list: Optional[List[str]] = None
    deal_ids: Optional[List[str]] = None
    tracks: Optional[List[str]] = None
    subtracks: Optional[List[str]] = None


class AdminTaskUpdateRequest(BaseModel):
    data: Dict[str, Any]


class AdminRemoveTasksRequest(BaseModel):
    task_ids: List[int]


class AdminRemoveActivityRequest(BaseModel):
    activity_id: int


@admin_router.get("/tasks/filter-options", response_model=Dict[str, List[str]])
def admin_task_filter_options(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns distinct ws/deal/track/subtrack values for admin task filters."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return admin_get_task_filter_options()


@admin_router.post("/tasks/filter", response_model=List[Dict[str, Any]])
def admin_task_filter(
    body: AdminTaskFilterRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Filters tasks from vwTask by task_id, ws, deal, track, subtrack."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return admin_filter_tasks(
        task_id=body.task_id,
        ws_list=body.ws_list,
        deal_ids=body.deal_ids,
        tracks=body.tracks,
        subtracks=body.subtracks,
    )


@admin_router.put("/tasks/{task_id}", response_model=Dict[str, Any])
def admin_task_update(
    task_id: int,
    body: AdminTaskUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Updates task fields in tbTask (admin use — no auto_completed logic)."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    from app.tasks.filter_service import update_task
    success = update_task(task_id=task_id, data=body.data)
    return {"success": success}


@admin_router.post("/tasks/remove", response_model=Dict[str, Any])
def admin_task_remove(
    body: AdminRemoveTasksRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Zeros out tbTask + tbTaskActivity + tbTaskRecord for given task_ids."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    if not body.task_ids:
        raise HTTPException(status_code=400, detail="task_ids cannot be empty")
    return admin_remove_tasks(body.task_ids)


@admin_router.get("/tasks/{task_id}/activities", response_model=List[Dict[str, Any]])
def admin_task_activities(
    task_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns activities for a single task_id."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return admin_get_activities_one(task_id)


@admin_router.get("/tasks/{task_id}/records", response_model=List[Dict[str, Any]])
def admin_task_records(
    task_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    activity_id: Optional[int] = Query(None),
):
    """Returns records for a task; optionally filtered by activity_id."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    if activity_id:
        return admin_get_records_activity(task_id, activity_id)
    return admin_get_records_task(task_id)


@admin_router.post("/tasks/activities-many", response_model=List[Dict[str, Any]])
def admin_activities_many(
    body: AdminRemoveTasksRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns activities for a list of task_ids (body.task_ids)."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return admin_get_activities_many(body.task_ids)


@admin_router.post("/tasks/records-many", response_model=List[Dict[str, Any]])
def admin_records_many(
    body: AdminRemoveTasksRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns records for a list of task_ids (body.task_ids)."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return admin_get_records_many(body.task_ids)


@admin_router.put("/tasks/activities/{activity_id}", response_model=Dict[str, Any])
def admin_activity_update(
    activity_id: int,
    body: AdminTaskUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Updates activity fields in tbTaskActivity."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    from app.tasks.filter_service import update_activity
    success = update_activity(activity_id=activity_id, data=body.data)
    return {"success": success}


@admin_router.post("/tasks/activities/{activity_id}/remove", response_model=Dict[str, Any])
def admin_activity_remove(
    activity_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Zeros out tbTaskActivity + tbTaskRecord for a given activity_id."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin required")
    return admin_remove_activity(activity_id)
