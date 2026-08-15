"""
Sections Service — Portfolio, Renewals, Presales, Projects, Admin
Handles all non-Adoption section data for the React migration.
"""
import sys, os, logging, traceback
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)
_ROOT = "/opt/bridgeadoption"
if _ROOT not in sys.path and os.path.isdir(os.path.join(_ROOT, "src")):
    sys.path.insert(0, _ROOT)

def _ser(row: Dict) -> Dict:
    result = {}
    for k, v in row.items():
        if v is None: result[k] = None
        elif hasattr(v, "isoformat"): result[k] = v.isoformat()
        else:
            try:
                import pandas as pd
                if pd.isna(v): result[k] = None; continue
            except Exception: pass
            result[k] = v
    return result

def _df(df) -> List[Dict]:
    if df is None: return []
    try:
        import pandas as pd
        if isinstance(df, pd.DataFrame) and df.empty: return []
        return [_ser(dict(r)) for r in df.to_dict("records")]
    except Exception: return []


# ─── Portfolio: Farol ────────────────────────────────────
try:
    from src.infrastructure.database.repositories.farol_repository import FarolRepository
    _FAROL_OK = True
except ImportError: _FAROL_OK = False

def get_farol(vendor_id: int = 1, customer_id: Optional[int] = None) -> List[Dict]:
    if not _FAROL_OK: return []
    try:
        repo = FarolRepository()
        df = repo.load_farol(vendor_id=vendor_id, customer_id=customer_id, as_df=True)
        return _df(df)
    except Exception as e:
        logger.error(f"get_farol: {e}\n{traceback.format_exc()}"); return []


# ─── Portfolio: Company ───────────────────────────────────
try:
    from src.infrastructure.database.repositories.company_repository import CompanyRepository
    _COMPANY_OK = True
except ImportError: _COMPANY_OK = False

def get_companies(search: Optional[str] = None) -> List[Dict]:
    if not _COMPANY_OK: return []
    try:
        repo = CompanyRepository()
        if hasattr(repo, "get_all"):
            rows = repo.get_all(as_df=False) or []
            result = [_ser(dict(r)) for r in rows]
        elif hasattr(repo, "load_companies"):
            df = repo.load_companies(as_df=True)
            result = _df(df)
        else:
            return []
        if search:
            s = search.lower()
            result = [r for r in result if s in str(r.get("company_name", "")).lower() or s in str(r.get("customer_name", "")).lower()]
        return result
    except Exception as e:
        logger.error(f"get_companies: {e}\n{traceback.format_exc()}"); return []


# ─── Portfolio: Cisco EA ──────────────────────────────────
try:
    from src.infrastructure.database.repositories.cisco_ea_repository import CiscoEARepository
    _EA_OK = True
except ImportError: _EA_OK = False

def get_cisco_ea_metering(customer_id: Optional[int] = None) -> List[Dict]:
    if not _EA_OK: return []
    try:
        repo = CiscoEARepository()
        df = repo.load_measure_cisco_ea(as_df=True)
        if df is not None and not df.empty and customer_id:
            id_col = [c for c in df.columns if "customer_id" in c.lower() or "client_id" in c.lower()]
            if id_col: df = df[df[id_col[0]] == customer_id]
        return _df(df)
    except Exception as e:
        logger.error(f"get_cisco_ea_metering: {e}\n{traceback.format_exc()}"); return []

def get_cisco_ea_consolidated(customer_id: Optional[int] = None) -> List[Dict]:
    if not _EA_OK: return []
    try:
        repo = CiscoEARepository()
        df = repo.load_customer_cisco_ea_consolidated(as_df=True)
        if df is not None and not df.empty and customer_id:
            id_col = [c for c in df.columns if "customer_id" in c.lower()]
            if id_col: df = df[df[id_col[0]] == customer_id]
        return _df(df)
    except Exception as e:
        logger.error(f"get_cisco_ea_consolidated: {e}\n{traceback.format_exc()}"); return []


# ─── Projects ────────────────────────────────────────────
try:
    from src.infrastructure.database.repositories.project_repository import ProjectRepository
    _PROJ_OK = True
except ImportError: _PROJ_OK = False

def get_projects(customer_id: Optional[int] = None, status: Optional[List[str]] = None) -> List[Dict]:
    if not _PROJ_OK: return []
    try:
        repo = ProjectRepository()
        status_list = status or ["Business Model", "In progress", "Not started", "Unidentified"]
        df = repo.get_project(customer_id=customer_id, project_status=status_list, as_df=True)
        return _df(df)
    except Exception as e:
        logger.error(f"get_projects: {e}\n{traceback.format_exc()}"); return []

def get_project_team(project_id: int) -> List[Dict]:
    if not _PROJ_OK: return []
    try:
        repo = ProjectRepository()
        df = repo.get_project_team(customer_id=None, project_status=None, as_df=True)
        if df is not None and not df.empty:
            id_col = [c for c in df.columns if "project_id" in c.lower()]
            if id_col: df = df[df[id_col[0]] == project_id]
        return _df(df)
    except Exception as e:
        logger.error(f"get_project_team: {e}\n{traceback.format_exc()}"); return []


# ─── Renewals ────────────────────────────────────────────
try:
    from src.infrastructure.database.repositories.cisco_subscription_ccw_repository import CiscoSubscriptionCCWRepository
    _CCW_OK = True
except ImportError: _CCW_OK = False

def get_renewals(customer_id: Optional[int] = None) -> List[Dict]:
    if not _CCW_OK: return []
    try:
        repo = CiscoSubscriptionCCWRepository()
        if hasattr(repo, "load_subscriptions"):
            df = repo.load_subscriptions(as_df=True)
        elif hasattr(repo, "get_all"):
            df = repo.get_all(as_df=True)
        else:
            return []
        if df is not None and not df.empty and customer_id:
            id_col = [c for c in df.columns if "customer_id" in c.lower() or "client_id" in c.lower()]
            if id_col: df = df[df[id_col[0]] == customer_id]
        return _df(df)
    except Exception as e:
        logger.error(f"get_renewals: {e}\n{traceback.format_exc()}"); return []


# ─── Admin: Users ─────────────────────────────────────────
try:
    from src.infrastructure.database.repositories.user_repository import UserRepository
    _USER_OK = True
except ImportError: _USER_OK = False

def get_users(active_only: bool = False) -> List[Dict]:
    if not _USER_OK: return []
    try:
        repo = UserRepository()
        if hasattr(repo, "get_all_users"):
            rows = repo.get_all_users(as_df=False) or []
        elif hasattr(repo, "load_users"):
            df = repo.load_users(as_df=True)
            rows = df.to_dict("records") if df is not None and not df.empty else []
        else:
            return []
        result = [_ser(dict(r)) for r in rows]
        if active_only:
            result = [r for r in result if r.get("user_active") or r.get("is_active")]
        return result
    except Exception as e:
        logger.error(f"get_users: {e}\n{traceback.format_exc()}"); return []

def search_users(name: Optional[str] = None, email: Optional[str] = None) -> List[Dict]:
    if not _USER_OK: return []
    try:
        repo = UserRepository()
        rows = repo.search_users(name=name, email=email) or []
        return [_ser(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"search_users: {e}\n{traceback.format_exc()}"); return []

def get_user_by_id(user_id: int) -> Dict:
    if not _USER_OK: return {}
    try:
        repo = UserRepository()
        user = repo.get_by_id(user_id)
        return _ser(dict(user)) if user else {}
    except Exception as e:
        logger.error(f"get_user_by_id: {e}"); return {}

def update_user(user_id: int, data: Dict) -> bool:
    if not _USER_OK or not data: return False
    try:
        repo = UserRepository()
        repo.update(data, user_id=user_id)
        return True
    except Exception as e:
        logger.error(f"update_user: {e}"); return False

def get_csm_active() -> List[Dict]:
    if not _USER_OK: return []
    try:
        repo = UserRepository()
        df = repo.get_csm_active(as_df=True)
        return _df(df)
    except Exception as e:
        logger.error(f"get_csm_active: {e}\n{traceback.format_exc()}"); return []


# ─── Admin: Roles / Auth ──────────────────────────────────
try:
    from src.infrastructure.database.repositories.auth_repository import AuthRepository
    _AUTH_OK = True
except ImportError: _AUTH_OK = False

def get_roles() -> List[Dict]:
    if not _AUTH_OK: return []
    try:
        repo = AuthRepository()
        if hasattr(repo, "list_roles"):
            rows = repo.list_roles() or []
            return [_ser(dict(r)) for r in rows]
        elif hasattr(repo, "get_all_roles"):
            rows = repo.get_all_roles(as_df=False) or []
            return [_ser(dict(r)) for r in rows]
        return []
    except Exception as e:
        logger.error(f"get_roles: {e}\n{traceback.format_exc()}"); return []

def get_user_roles(user_id: int) -> List[Dict]:
    if not _AUTH_OK: return []
    try:
        repo = AuthRepository()
        rows = repo.get_user_roles(user_id) or []
        return [_ser(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_user_roles: {e}"); return []

def assign_role_to_user(user_id: int, role_id: int) -> bool:
    if not _AUTH_OK: return False
    try:
        repo = AuthRepository()
        repo.assign_role_to_user(user_id, role_id)
        return True
    except Exception as e:
        logger.error(f"assign_role_to_user: {e}"); return False

def remove_role_from_user(user_id: int, role_id: int) -> bool:
    if not _AUTH_OK: return False
    try:
        repo = AuthRepository()
        repo.remove_role_from_user(user_id, role_id)
        return True
    except Exception as e:
        logger.error(f"remove_role_from_user: {e}"); return False

def get_role_permissions(user_role_id: int) -> List[Dict]:
    if not _AUTH_OK: return []
    try:
        repo = AuthRepository()
        rows = repo.get_role_permissions(user_role_id) or []
        return [_ser(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_role_permissions: {e}"); return []

def list_actions() -> List[Dict]:
    if not _AUTH_OK: return []
    try:
        repo = AuthRepository()
        rows = repo.list_actions() or []
        return [_ser(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"list_actions: {e}"); return []

def list_resources(only_active: bool = True) -> List[Dict]:
    if not _AUTH_OK: return []
    try:
        repo = AuthRepository()
        rows = repo.list_resources(only_is_active=only_active) or []
        return [_ser(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"list_resources: {e}"); return []

def add_permission_to_role(user_role_id: int, resource_id: int, action_id: int) -> bool:
    if not _AUTH_OK: return False
    try:
        repo = AuthRepository()
        repo.add_permission_to_role(user_role_id, resource_id, action_id)
        return True
    except Exception as e:
        logger.error(f"add_permission_to_role: {e}"); return False

def remove_permission_from_role(permission_id: int) -> bool:
    if not _AUTH_OK: return False
    try:
        repo = AuthRepository()
        repo.remove_permission_from_role(permission_id)
        return True
    except Exception as e:
        logger.error(f"remove_permission_from_role: {e}"); return False

def update_permission(permission_id: int, action_id: int) -> bool:
    if not _AUTH_OK: return False
    try:
        repo = AuthRepository()
        repo.update_permission(permission_id, action_id)
        return True
    except Exception as e:
        logger.error(f"update_permission: {e}"); return False

def create_role(role_name: str, role_description: str) -> Dict:
    if not _AUTH_OK: return {"error": "Repository not available"}
    try:
        repo = AuthRepository()
        new_id = repo.create_role(role_name, role_description)
        if new_id is None:
            return {"error": "Failed to create role (possibly duplicate name)"}
        return {"role_id": new_id}
    except Exception as e:
        logger.error(f"create_role: {e}"); return {"error": str(e)}

def update_role(role_id: int, role_name: str, role_description: str) -> Dict:
    if not _AUTH_OK: return {"error": "Repository not available"}
    try:
        repo = AuthRepository()
        ok = repo.update_role(role_id, role_name, role_description)
        return {"success": ok}
    except Exception as e:
        logger.error(f"update_role: {e}"); return {"error": str(e)}

def toggle_role_active(role_id: int) -> Dict:
    if not _AUTH_OK: return {"error": "Repository not available"}
    try:
        repo = AuthRepository()
        ok = repo.toggle_role_active(role_id)
        return {"success": ok}
    except Exception as e:
        logger.error(f"toggle_role_active: {e}"); return {"error": str(e)}

def create_action(action_key: str, action_name: str) -> Dict:
    if not _AUTH_OK: return {"error": "Repository not available"}
    try:
        repo = AuthRepository()
        new_id = repo.create_action(action_key, action_name)
        if new_id is None:
            return {"error": "Failed to create action (possibly duplicate key)"}
        return {"action_id": new_id}
    except Exception as e:
        logger.error(f"create_action: {e}"); return {"error": str(e)}

def create_resource(resource_key: str, resource_name: str, resource_icon: str) -> Dict:
    if not _AUTH_OK: return {"error": "Repository not available"}
    try:
        repo = AuthRepository()
        new_id = repo.create_resource(resource_key, resource_name, resource_icon)
        if new_id is None:
            return {"error": "Failed to create resource (possibly duplicate key)"}
        return {"resource_id": new_id}
    except Exception as e:
        logger.error(f"create_resource: {e}"); return {"error": str(e)}

def update_resource(resource_id: int, resource_key: str, resource_name: str, resource_icon: str) -> Dict:
    if not _AUTH_OK: return {"error": "Repository not available"}
    try:
        repo = AuthRepository()
        ok = repo.update_resource(resource_id, resource_key, resource_name, resource_icon)
        return {"success": ok}
    except Exception as e:
        logger.error(f"update_resource: {e}"); return {"error": str(e)}

def toggle_resource_active(resource_id: int) -> Dict:
    if not _AUTH_OK: return {"error": "Repository not available"}
    try:
        repo = AuthRepository()
        ok = repo.toggle_resource_active(resource_id)
        return {"success": ok}
    except Exception as e:
        logger.error(f"toggle_resource_active: {e}"); return {"error": str(e)}


# ─── Admin: Team Goals ────────────────────────────────────
def get_team_goals(fy: Optional[int] = None) -> List[Dict]:
    """Returns team goals (from TeamTargetRepository or similar)."""
    try:
        from src.infrastructure.database.repositories.team_target_repository import TeamTargetRepository
        repo = TeamTargetRepository()
        df = repo.load_fiscal_year(fy or 30, as_df=True)
        return _df(df)
    except Exception as e:
        logger.error(f"get_team_goals: {e}"); return []


# ─── Admin: Companies (admin view) ───────────────────────
def get_admin_companies(search: Optional[str] = None) -> List[Dict]:
    return get_companies(search)


# ─── Admin: Companies — full CRUD ─────────────────────────

def admin_search_companies(name_part: str) -> List[Dict]:
    """Search companies by name part via tbCompanyListName JOIN tbCompany."""
    try:
        from src.infrastructure.database.connection import get_sqlalchemy_engine
        import pandas as pd
        engine = get_sqlalchemy_engine()
        sql = """
            SELECT DISTINCT
                c.company_id,
                c.company_type,
                c.company_name
            FROM tbCompany c
            INNER JOIN tbCompanyListName l ON l.companylistname_company_id = c.company_id
            WHERE l.companylistname_name LIKE %(name)s
            ORDER BY c.company_name
            LIMIT 500
        """
        df = pd.read_sql(sql, engine, params={"name": f"%{name_part}%"})
        return _df(df)
    except Exception as e:
        logger.error(f"admin_search_companies: {e}\n{traceback.format_exc()}"); return []


def admin_get_company(company_id: int) -> Dict:
    """Get a company record by ID."""
    if not _COMPANY_OK: return {}
    try:
        repo = CompanyRepository()
        result = repo.find_by_id(company_id)
        return _ser(dict(result)) if result else {}
    except Exception as e:
        logger.error(f"admin_get_company: {e}"); return {}


def admin_create_company(data: Dict) -> Dict:
    """Create a new company (reuses VAGO slots)."""
    if not _COMPANY_OK: return {"error": "Repository not available"}
    try:
        repo = CompanyRepository()
        new_id = repo.insert(data)
        return {"company_id": new_id}
    except Exception as e:
        logger.error(f"admin_create_company: {e}"); return {"error": str(e)}


def admin_update_company(company_id: int, data: Dict) -> Dict:
    """Update a company by ID."""
    if not _COMPANY_OK: return {"error": "Repository not available"}
    try:
        repo = CompanyRepository()
        repo.update_with_custom_where(data=data, where_clause="company_id = %s", params=(company_id,))
        return {"success": True}
    except Exception as e:
        logger.error(f"admin_update_company: {e}"); return {"error": str(e)}


def admin_vacate_company(company_id: int) -> Dict:
    """Vacate a company — clears all fields, sets name to 'VAGO {id}'."""
    if not _COMPANY_OK: return {"error": "Repository not available"}
    try:
        repo = CompanyRepository()
        vacate_data: Dict[str, Any] = {
            "company_is_vendor": None,
            "company_type": None,
            "company_name": f"VAGO {company_id}",
            "company_priority": None,
            "company_vertical": None,
            "company_meeting_frequency": None,
            "company_logo": None,
            "company_homepage": None,
            "company_remark": None,
            "company_cnpj": None,
            "company_group_id": 0,
        }
        repo.update_with_custom_where(data=vacate_data, where_clause="company_id = %s", params=(company_id,))
        return {"success": True}
    except Exception as e:
        logger.error(f"admin_vacate_company: {e}"); return {"error": str(e)}


def admin_get_company_tab(tab_name: str, company_id: int) -> List[Dict]:
    """Return rows for a specific tab for a single company_id."""
    try:
        from src.infrastructure.database.connection import get_sqlalchemy_engine
        import pandas as pd
        engine = get_sqlalchemy_engine()
        queries: Dict[str, tuple] = {
            "tbCompany": (
                "SELECT company_id, company_type, company_name FROM tbCompany WHERE company_id = %(id)s",
                {"id": company_id},
            ),
            "tbCompanyListName": (
                "SELECT companylistname_company_id, companylistname_name, companylistname_id FROM tbCompanyListName WHERE companylistname_company_id = %(id)s ORDER BY companylistname_name",
                {"id": company_id},
            ),
            "tbCiscoEA": (
                "SELECT * FROM tbCiscoEA WHERE ea_end_customer_id = %(id)s ORDER BY ea_id LIMIT 500",
                {"id": company_id},
            ),
            "tbProject": (
                "SELECT project_id, project_customer_id, project_ov, project_name, project_status FROM tbProject WHERE project_customer_id = %(id)s ORDER BY project_id LIMIT 500",
                {"id": company_id},
            ),
            "tbNotaFiscalAsset": (
                """SELECT nfa.* FROM tbNotaFiscalAsset nfa
                   WHERE nfa.nfasset_asset_id IN (
                       SELECT vendorasset_asset_id FROM tbContractVendorAsset WHERE vendorasset_customer_id = %(id)s
                       UNION
                       SELECT nttasset_asset_id FROM tbContractNTTAsset WHERE nttasset_customer_id = %(id)s
                   ) ORDER BY nfa.nfasset_id LIMIT 500""",
                {"id": company_id},
            ),
            "tbContractNTTAsset": (
                "SELECT * FROM tbContractNTTAsset WHERE nttasset_customer_id = %(id)s ORDER BY nttasset_id LIMIT 500",
                {"id": company_id},
            ),
            "tbContractVendorAsset": (
                "SELECT * FROM tbContractVendorAsset WHERE vendorasset_customer_id = %(id)s ORDER BY vendorasset_id LIMIT 500",
                {"id": company_id},
            ),
            "tbTask": (
                "SELECT task_id, task_customer_id, task_ws, task_deal_id, task_reference, task_status FROM tbTask WHERE task_customer_id = %(id)s ORDER BY task_id LIMIT 500",
                {"id": company_id},
            ),
            "tbAccountTeam": (
                "SELECT * FROM tbAccountTeam WHERE accountteam_company_id = %(id)s ORDER BY accountteam_id LIMIT 500",
                {"id": company_id},
            ),
        }
        if tab_name not in queries:
            return []
        sql, params = queries[tab_name]
        df = pd.read_sql(sql, engine, params=params)
        return _df(df)
    except Exception as e:
        logger.error(f"admin_get_company_tab({tab_name},{company_id}): {e}\n{traceback.format_exc()}"); return []


def admin_get_company_tab_multi(tab_name: str, company_ids: List[int]) -> List[Dict]:
    """Return rows for a specific tab for a list of company_ids."""
    if not company_ids:
        return []
    try:
        from src.infrastructure.database.connection import get_sqlalchemy_engine
        import pandas as pd
        engine = get_sqlalchemy_engine()
        ph = ", ".join(str(i) for i in company_ids)
        queries: Dict[str, str] = {
            "tbCompany": f"SELECT company_id, company_type, company_name FROM tbCompany WHERE company_id IN ({ph}) ORDER BY company_name",
            "tbCompanyListName": f"SELECT companylistname_company_id, companylistname_name, companylistname_id FROM tbCompanyListName WHERE companylistname_company_id IN ({ph}) ORDER BY companylistname_name",
            "tbCiscoEA": f"SELECT * FROM tbCiscoEA WHERE ea_end_customer_id IN ({ph}) ORDER BY ea_id LIMIT 500",
            "tbProject": f"SELECT project_id, project_customer_id, project_ov, project_name, project_status FROM tbProject WHERE project_customer_id IN ({ph}) ORDER BY project_id LIMIT 500",
            "tbNotaFiscalAsset": f"SELECT nfa.* FROM tbNotaFiscalAsset nfa WHERE nfa.nfasset_asset_id IN (SELECT vendorasset_asset_id FROM tbContractVendorAsset WHERE vendorasset_customer_id IN ({ph}) UNION SELECT nttasset_asset_id FROM tbContractNTTAsset WHERE nttasset_customer_id IN ({ph})) ORDER BY nfa.nfasset_id LIMIT 500",
            "tbContractNTTAsset": f"SELECT * FROM tbContractNTTAsset WHERE nttasset_customer_id IN ({ph}) ORDER BY nttasset_id LIMIT 500",
            "tbContractVendorAsset": f"SELECT * FROM tbContractVendorAsset WHERE vendorasset_customer_id IN ({ph}) ORDER BY vendorasset_id LIMIT 500",
            "tbTask": f"SELECT task_id, task_customer_id, task_ws, task_deal_id, task_reference, task_status FROM tbTask WHERE task_customer_id IN ({ph}) ORDER BY task_id LIMIT 500",
            "tbAccountTeam": f"SELECT * FROM tbAccountTeam WHERE accountteam_company_id IN ({ph}) ORDER BY accountteam_id LIMIT 500",
        }
        if tab_name not in queries:
            return []
        df = pd.read_sql(queries[tab_name], engine)
        return _df(df)
    except Exception as e:
        logger.error(f"admin_get_company_tab_multi({tab_name}): {e}\n{traceback.format_exc()}"); return []


def admin_add_company_name(company_id: int, name: str) -> Dict:
    """Insert a new row into tbCompanyListName."""
    try:
        from src.infrastructure.database.repositories.company_list_name_repository import CompanyListNameRepository
        repo = CompanyListNameRepository()
        new_id = repo.insert({"companylistname_company_id": company_id, "companylistname_name": name})
        return {"companylistname_id": new_id}
    except Exception as e:
        logger.error(f"admin_add_company_name: {e}"); return {"error": str(e)}


def admin_update_company_name(listname_id: int, company_id: int, name: str) -> Dict:
    """Update a tbCompanyListName record."""
    try:
        from src.infrastructure.database.repositories.company_list_name_repository import CompanyListNameRepository
        repo = CompanyListNameRepository()
        repo.update(
            data={"companylistname_company_id": company_id, "companylistname_name": name},
            where={"companylistname_id": listname_id},
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"admin_update_company_name: {e}"); return {"error": str(e)}


def admin_vacate_company_name(listname_id: int) -> Dict:
    """Vacate a tbCompanyListName record (set company_id=0, name='VAGO {id}')."""
    try:
        from src.infrastructure.database.repositories.company_list_name_repository import CompanyListNameRepository
        repo = CompanyListNameRepository()
        repo.update(
            data={"companylistname_company_id": 0, "companylistname_name": f"VAGO {listname_id}"},
            where={"companylistname_id": listname_id},
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"admin_vacate_company_name: {e}"); return {"error": str(e)}


def admin_update_cisco_ea_customer(ea_id: int, end_customer_id: int) -> Dict:
    """Update ea_end_customer_id for a tbCiscoEA record."""
    try:
        from src.infrastructure.database.repositories.cisco_ea_repository import CiscoEARepository
        repo = CiscoEARepository()
        repo.update(data={"ea_end_customer_id": end_customer_id}, where={"ea_id": ea_id})
        return {"success": True}
    except Exception as e:
        logger.error(f"admin_update_cisco_ea_customer: {e}"); return {"error": str(e)}


# ─── Portfolio: Asset ─────────────────────────────────────
try:
    from src.infrastructure.database.repositories.asset_repository import AssetRepository
    _ASSET_OK = True
except ImportError: _ASSET_OK = False

def get_assets(customer_id: int) -> List[Dict]:
    if not _ASSET_OK: return []
    try:
        repo = AssetRepository()
        if hasattr(repo, "load_customer_assets"):
            df = repo.load_customer_assets(customer_id=customer_id, as_df=True)
        elif hasattr(repo, "get_assets"):
            df = repo.get_assets(customer_id=customer_id, as_df=True)
        else:
            return []
        return _df(df)
    except Exception as e:
        logger.error(f"get_assets: {e}\n{traceback.format_exc()}"); return []


# ─── Portfolio: Adoption Tasks ───────────────────────────
def get_adoption_tasks(customer_id: Optional[int] = None) -> List[Dict]:
    try:
        from src.infrastructure.database.repositories.task_technology_adoption_report_repository import TaskTechnologyAdoptionReportRepository
        repo = TaskTechnologyAdoptionReportRepository()
        # Try common method names
        if hasattr(repo, "load_report"):
            df = repo.load_report(as_df=True)
        elif hasattr(repo, "get_all"):
            df = repo.get_all(as_df=True)
        elif hasattr(repo, "load"):
            df = repo.load(as_df=True)
        else:
            return []
        if df is not None and not df.empty and customer_id:
            id_col = [c for c in df.columns if "customer_id" in c.lower() or "client_id" in c.lower()]
            if id_col: df = df[df[id_col[0]] == customer_id]
        return _df(df)
    except Exception as e:
        logger.error(f"get_adoption_tasks: {e}\n{traceback.format_exc()}"); return []


# ─── Portfolio: Cisco SA ──────────────────────────────────
def get_cisco_sa_usage(customer_id: Optional[int] = None) -> List[Dict]:
    try:
        from src.infrastructure.database.repositories.cisco_sa_repository import CiscoSARepository
        repo = CiscoSARepository()
        if hasattr(repo, "load_measure_cisco_sa"):
            df = repo.load_measure_cisco_sa(as_df=True)
        elif hasattr(repo, "load_sa_usage"):
            df = repo.load_sa_usage(as_df=True)
        elif hasattr(repo, "get_all"):
            df = repo.get_all(as_df=True)
        else:
            return []
        if df is not None and not df.empty and customer_id:
            id_col = [c for c in df.columns if "customer_id" in c.lower() or "client_id" in c.lower()]
            if id_col: df = df[df[id_col[0]] == customer_id]
        return _df(df)
    except Exception as e:
        logger.error(f"get_cisco_sa_usage: {e}\n{traceback.format_exc()}"); return []


# ─── Portfolio: Cisco True Forward ───────────────────────
def get_cisco_true_forward() -> List[Dict]:
    if not _EA_OK: return []
    try:
        repo = CiscoEARepository()
        df = repo.load_measure_cisco_ea(as_df=True)
        return _df(df)
    except Exception as e:
        logger.error(f"get_cisco_true_forward: {e}\n{traceback.format_exc()}"); return []


# ─── Portfolio: Account Team ─────────────────────────────
try:
    from src.infrastructure.database.repositories.account_team_repository import AccountTeamRepository
    _AT_OK = True
except ImportError: _AT_OK = False

def get_account_team(customer_id: Optional[int] = None) -> List[Dict]:
    if not _AT_OK: return []
    try:
        repo = AccountTeamRepository()
        if hasattr(repo, "load_account_team"):
            df = repo.load_account_team(customer_id=customer_id, as_df=True)
        elif hasattr(repo, "get_account_team"):
            df = repo.get_account_team(customer_id=customer_id, as_df=True)
        else:
            return []
        return _df(df)
    except Exception as e:
        logger.error(f"get_account_team: {e}\n{traceback.format_exc()}"); return []
