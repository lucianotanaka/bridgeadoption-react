"""
Adoption Extras Service — Team Target, LCI Status, Rebate, Use Cases
"""
import sys, os, logging, traceback
from datetime import date
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)
_ROOT = "/opt/bridgeadoption"
if _ROOT not in sys.path and os.path.isdir(os.path.join(_ROOT, "src")):
    sys.path.insert(0, _ROOT)

try:
    from src.infrastructure.database.repositories.task_repository import TaskRepository
    from src.infrastructure.database.repositories.cisco_lci_repository import CiscoLCIRepository
    from src.infrastructure.database.repositories.cisco_ea_repository import CiscoEARepository
    from src.infrastructure.database.repositories.user_repository import UserRepository
    _OK = True
except ImportError as e:
    logger.warning(f"Extras repos not available: {e}"); _OK = False

try:
    from src.infrastructure.database.repositories.team_target_repository import TeamTargetRepository
    _TEAM_OK = True
except ImportError:
    _TEAM_OK = False

try:
    from src.infrastructure.database.repositories.use_case_repository import UseCaseRepository
    from src.infrastructure.database.repositories.company_repository import CompanyRepository
    _UC_OK = True
except ImportError:
    _UC_OK = False


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


def _df_to_list(df) -> List[Dict]:
    if df is None: return []
    try:
        import pandas as pd
        if isinstance(df, pd.DataFrame) and df.empty: return []
        return [_ser(dict(r)) for r in df.to_dict("records")]
    except Exception: return []


# ─── TEAM TARGET ──────────────────────────────────────────

def get_team_target_fiscal_years() -> List[int]:
    if not _TEAM_OK: return []
    try:
        repo = TeamTargetRepository()
        df = repo.load_fiscal_year(30, as_df=True)
        if df is None or df.empty: return []
        col = [c for c in df.columns if "fy" in c.lower() or "year" in c.lower()]
        if col:
            vals = df[col[0]].dropna().unique().tolist()
            return sorted([int(v) for v in vals if str(v).isdigit()])
        return []
    except Exception as e:
        logger.error(f"get_team_target_fiscal_years: {e}"); return []


def get_team_target(fy: Optional[int] = None) -> List[Dict[str, Any]]:
    if not _TEAM_OK or not _OK: return []
    try:
        repo = TeamTargetRepository()
        df = repo.load_fiscal_year(30, as_df=True) if fy is None else repo.load_fiscal_year(fy, as_df=True)
        if df is None or df.empty: return []
        if fy:
            fy_cols = [c for c in df.columns if "fy" in c.lower() or "year" in c.lower()]
            if fy_cols:
                df = df[df[fy_cols[0]] == fy]
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_team_target: {e}\n{traceback.format_exc()}"); return []


# ─── LCI STATUS ───────────────────────────────────────────

def get_lci_eligible_status() -> List[Dict[str, Any]]:
    if not _OK: return []
    try:
        repo = CiscoLCIRepository()
        df = repo.find_all(task_eligible="Y", as_df=True)
        if df is None or df.empty: return []
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_lci_eligible_status: {e}\n{traceback.format_exc()}"); return []


def get_lci_solution_vs_project() -> List[Dict[str, Any]]:
    """
    Returns full dataset from load_lci_solution_vs_project for the React
    LCI Solution vs Project report (charts + filters + KPIs).
    """
    if not _OK: return []
    try:
        repo = CiscoLCIRepository()
        df = repo.load_lci_solution_vs_project(as_df=True)
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_lci_solution_vs_project: {e}\n{traceback.format_exc()}"); return []


# ─── REBATE & OPPORTUNITIES ───────────────────────────────

def get_rebate_fiscal_years() -> List[int]:
    """Returns available FY options from AdoptionForecastRepository."""
    try:
        from src.infrastructure.database.repositories.adoption_forecast_repository import AdoptionForecastRepository
        repo = AdoptionForecastRepository()
        df = repo.load_fy_forecast(as_df=True)
        if df is None or df.empty: return []
        col = "activity_end_fy"
        if col in df.columns:
            return sorted(df[col].dropna().astype(int).unique().tolist())
        return []
    except Exception as e:
        logger.error(f"get_rebate_fiscal_years: {e}"); return []


def get_rebate_task_incentive(fy: Optional[int] = None) -> List[Dict[str, Any]]:
    if not _OK: return []
    try:
        import pandas as pd
        repo = TaskRepository()
        df = repo.load_task_incentive(as_df=True)
        if df is None or df.empty: return []
        if fy:
            # filter by task_end year (NTT FY: Apr–Mar)
            if "task_end" in df.columns:
                df["task_end"] = pd.to_datetime(df["task_end"], errors="coerce")
                df = df[df["task_end"].dt.year == fy]
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_rebate_task_incentive: {e}\n{traceback.format_exc()}"); return []


def get_rebate_sip_opportunities(squad_ids: int = 30) -> List[Dict[str, Any]]:
    """Returns SIP New Opportunity tasks (task type 'new opportunity')."""
    if not _OK: return []
    try:
        repo = TaskRepository()
        df = repo.get_task_sip_new_opportunity(squad_ids=squad_ids, owner_ids=None, as_df=True)
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_rebate_sip_opportunities: {e}\n{traceback.format_exc()}"); return []


def get_rebate_cisco_ea() -> List[Dict[str, Any]]:
    if not _OK: return []
    try:
        repo = CiscoEARepository()
        df = repo.load_measure_cisco_ea(as_df=True)
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_rebate_cisco_ea: {e}\n{traceback.format_exc()}"); return []


def get_rebate_lci_approved(fy: Optional[int] = None) -> List[Dict[str, Any]]:
    if not _OK: return []
    try:
        import pandas as pd
        repo = CiscoLCIRepository()
        df = repo.load_cisco_lci_approved(as_df=True)
        if df is None or df.empty: return []
        if fy and "lci_stage_approval_fy" in df.columns:
            df = df[df["lci_stage_approval_fy"] == fy]
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_rebate_lci_approved: {e}\n{traceback.format_exc()}"); return []


def get_rebate_lci_journey(fy: Optional[int] = None) -> List[Dict[str, Any]]:
    if not _OK: return []
    try:
        import pandas as pd
        from datetime import date
        from dateutil.relativedelta import relativedelta
        repo = CiscoLCIRepository()
        df = repo.load_cisco_lci_journey(as_df=True)
        if df is None or df.empty: return []
        if fy and "task_start_date" in df.columns:
            df["task_start_date"] = pd.to_datetime(df["task_start_date"], errors="coerce")
            date_to = pd.to_datetime(date(fy + 1, 3, 31))
            date_from = date_to - relativedelta(months=18)
            df = df[(df["task_start_date"] >= date_from) & (df["task_start_date"] <= date_to)]
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_rebate_lci_journey: {e}\n{traceback.format_exc()}"); return []


def get_rebate_summary(fy: int) -> Dict[str, Any]:
    """
    Computes all 9 KPI cards for Rebate & Opportunities page.
    Espelha show_rebate_and_opportunities() KPI section.
    """
    if not _OK:
        return {}
    try:
        import pandas as pd
        from datetime import date
        from dateutil.relativedelta import relativedelta

        today = date.today()
        date_to = pd.to_datetime(date(fy + 1, 3, 31))
        date_from = date_to - relativedelta(months=18)

        # LCI tasks
        task_repo = TaskRepository()
        lci_df = task_repo.load_task_incentive(as_df=True)
        count_tasks = count_completed = count_in_progress = count_under_review = 0
        if lci_df is not None and not lci_df.empty:
            lci_df["task_start"] = pd.to_datetime(lci_df["task_start"], errors="coerce")
            lci_df["task_end"] = pd.to_datetime(lci_df["task_end"], errors="coerce")
            lci_df = lci_df.dropna(subset=["task_start", "task_end"])
            filtered = lci_df[(lci_df["task_start"] >= date_from) & (lci_df["task_end"] <= date_to)]
            count_tasks = filtered["task_id"].nunique()
            count_completed = filtered[filtered["task_status_id"].isin([10])]["task_id"].nunique()
            count_in_progress = filtered[filtered["task_status_id"].isin([2])]["task_id"].nunique()
            count_under_review = filtered[filtered["task_status_id"].isin([1])]["task_id"].nunique()

        # LCI approved
        lci_repo = CiscoLCIRepository()
        stage_df = lci_repo.load_cisco_lci_approved(as_df=True)
        forecast_sum = backlog_sum = 0.0
        if stage_df is not None and not stage_df.empty:
            if "lci_stage_approval_fy" in stage_df.columns and "lci_stage_approval_value" in stage_df.columns:
                fy_stage = stage_df[stage_df["lci_stage_approval_fy"] == fy]
                forecast_sum = float(fy_stage["lci_stage_approval_value"].sum() or 0)
            if "lci_stage_backlog_value" in stage_df.columns:
                # filter by date
                if "lci_stage_start_date" in stage_df.columns and "lci_stage_end_date" in stage_df.columns:
                    stage_df["lci_stage_start_date"] = pd.to_datetime(stage_df["lci_stage_start_date"], errors="coerce")
                    stage_df["lci_stage_end_date"] = pd.to_datetime(stage_df["lci_stage_end_date"], errors="coerce")
                    filtered_stage = stage_df[(stage_df["lci_stage_start_date"] >= date_from) & (stage_df["lci_stage_end_date"] <= date_to)]
                else:
                    filtered_stage = stage_df
                backlog_sum = float(filtered_stage["lci_stage_backlog_value"].sum() or 0)

        # SIP
        sip_df = task_repo.get_task_sip_new_opportunity(squad_ids=30, owner_ids=None, as_df=True)
        count_sip_approved = count_sip_in_progress = 0
        if sip_df is not None and not sip_df.empty:
            sip_df["task_end"] = pd.to_datetime(sip_df["task_end"], errors="coerce")
            count_sip_approved = int(sip_df[
                sip_df["task_status_id"].isin([9, 10]) & (sip_df["task_end"] >= date_from)
            ].shape[0])
            count_sip_in_progress = int(sip_df[sip_df["task_status_id"].isin([1, 2, 3, 7, 8])].shape[0])

        # EA
        ea_repo = CiscoEARepository()
        ea_df = ea_repo.load_measure_cisco_ea(as_df=True)
        ea_generated_pct = "N/A"
        if ea_df is not None and not ea_df.empty:
            ea_df["mcea_end_date"] = pd.to_datetime(ea_df["mcea_end_date"], errors="coerce")
            filtered_ea = ea_df[ea_df["mcea_end_date"] >= pd.to_datetime(today)]
            if not filtered_ea.empty:
                filtered_ea = filtered_ea.copy()
                mask = filtered_ea["mcea_generated"] > filtered_ea["mcea_purchased"]
                filtered_ea.loc[mask, "mcea_generated"] = filtered_ea.loc[mask, "mcea_purchased"]
                total_purchased = filtered_ea["mcea_purchased"].sum()
                total_generated = filtered_ea["mcea_generated"].sum()
                if total_purchased > 0:
                    ratio = total_generated / total_purchased
                    ea_generated_pct = f"{ratio * 100:.1f}%"

        return {
            "fy": fy,
            "ea_generated_pct": ea_generated_pct,
            "count_sip_in_progress": count_sip_in_progress,
            "count_sip_approved": count_sip_approved,
            "count_tasks": count_tasks,
            "count_completed": count_completed,
            "count_in_progress": count_in_progress,
            "count_under_review": count_under_review,
            "total_approved_usd": round(forecast_sum, 2),
            "total_backlog_usd": round(backlog_sum, 2),
        }
    except Exception as e:
        logger.error(f"get_rebate_summary: {e}\n{traceback.format_exc()}")
        return {}


# ─── USE CASES ────────────────────────────────────────────

def get_use_cases(company_id: Optional[int] = None) -> List[Dict[str, Any]]:
    if not _UC_OK: return []
    try:
        repo = UseCaseRepository()
        if hasattr(repo, "get_all"):
            rows = repo.get_all(as_df=False) or []
        elif hasattr(repo, "load_use_cases"):
            df = repo.load_use_cases(as_df=True)
            rows = df.to_dict("records") if df is not None and not df.empty else []
        else:
            return []
        result = [_ser(dict(r)) for r in rows]
        if company_id:
            result = [r for r in result if r.get("company_id") == company_id or r.get("customer_id") == company_id]
        return result
    except Exception as e:
        logger.error(f"get_use_cases: {e}\n{traceback.format_exc()}"); return []


def get_use_case_companies() -> List[Dict[str, Any]]:
    if not _UC_OK: return []
    try:
        repo = CompanyRepository()
        if hasattr(repo, "get_all"):
            rows = repo.get_all(as_df=False) or []
            return [_ser(dict(r)) for r in rows]
        elif hasattr(repo, "load_companies"):
            df = repo.load_companies(as_df=True)
            return _df_to_list(df)
        return []
    except Exception as e:
        logger.error(f"get_use_case_companies: {e}\n{traceback.format_exc()}"); return []
