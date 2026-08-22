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


def get_team_target_targets(fy: int) -> List[Dict[str, Any]]:
    """
    Returns enriched Team Target list for a given FY (team_id=30).
    Includes resolved task names and user names.
    Espelha lógica de show_adoption_team_target() — filtros de seleção de meta.
    """
    if not _TEAM_OK or not _OK:
        return []
    try:
        import pandas as pd
        repo = TeamTargetRepository()
        df = repo.get_team_target_by_fy(fy=fy, team_id=30, as_df=True)
        if df is None or df.empty:
            return []

        from src.infrastructure.database.repositories.task_repository import TaskRepository
        from src.infrastructure.database.repositories.user_repository import UserRepository
        task_repo_inst = TaskRepository()
        user_repo_inst = UserRepository()

        result = []
        for _, row in df.iterrows():
            tasks_list_raw = str(row.get("TASKS", "") or "")
            users_list_raw = str(row.get("USERS", "") or "")

            # --- resolve task type names ---
            task_names: List[str] = []
            if tasks_list_raw and tasks_list_raw.lower() not in ("", "none", "nan"):
                try:
                    tasks_df = task_repo_inst.get_task_type_by_ids(type_ids=tasks_list_raw, as_df=True)
                    if tasks_df is not None and not tasks_df.empty and "tasktype_name" in tasks_df.columns:
                        task_names = tasks_df["tasktype_name"].dropna().tolist()
                except Exception as te:
                    logger.warning(f"get_team_target_targets: task names error: {te}")

            # --- resolve user names and IDs ---
            user_names: List[str] = []
            user_ids: List[int] = []
            # parse user IDs directly from the raw string (comma-separated ints)
            for uid in users_list_raw.split(","):
                uid = uid.strip()
                if uid.isdigit():
                    user_ids.append(int(uid))
            if users_list_raw and users_list_raw.lower() not in ("", "none", "nan"):
                try:
                    users_df = user_repo_inst.get_users_by_squad(
                        department_id=30,
                        user_id_str=users_list_raw,
                        as_df=True,
                    )
                    if users_df is not None and not users_df.empty and "squad_user_name" in users_df.columns:
                        user_names = users_df["squad_user_name"].dropna().tolist()
                except Exception as ue:
                    logger.warning(f"get_team_target_targets: user names error: {ue}")

            desc_raw = row.get("DESCRIPTION", "")
            description = "" if (desc_raw is None or (isinstance(desc_raw, float) and pd.isna(desc_raw))) else str(desc_raw)

            result.append({
                "id": int(row.get("ID", 0) or 0),
                "fy": int(row.get("FY", fy) or fy),
                "name": str(row.get("TARGET", "") or ""),
                "description": description,
                "tasks_list": tasks_list_raw,
                "task_names": task_names,
                "users_list": users_list_raw,
                "user_ids": user_ids,
                "user_names": user_names,
                "measure_by_counting": int(row.get("MEASURE_BY_COUNTING", 0) or 0),
                "measure_by_sum": int(row.get("MEASURE_BY_SUM", 0) or 0),
                "points": int(row.get("POINTS", 0) or 0),
                "multiplier": int(row.get("MULTIPLIER", 0) or 0),
                "value": float(row.get("VALUE", 0) or 0),
                "individual": int(row.get("INDIVIDUAL", 0) or 0),
            })

        return result
    except Exception as e:
        logger.error(f"get_team_target_targets: {e}\n{traceback.format_exc()}")
        return []


def get_team_target_measure(target_id: int) -> List[Dict[str, Any]]:
    """
    Returns measurement rows from vwMeasureTeamTarget for a given target_id.
    Espelha create_target_progress_chart() — dados de medição.
    """
    if not _TEAM_OK:
        return []
    try:
        import pandas as pd
        repo = TeamTargetRepository()
        df = repo.get_measure_team_target_by_id(target_id=target_id, as_df=True)
        if df is None or df.empty:
            return []
        # Normalise numeric columns
        for col in ("target_value", "activity_approved_value"):
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_team_target_measure: {e}\n{traceback.format_exc()}")
        return []


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
    Returns full dataset from load_lci_solution_vs_project_with_task_end for
    the React LCI Solution vs Project report (charts + filters + KPIs).
    Includes 'potential_task_end' and computed 'potential_task_end_fy'
    (NTT Fiscal Year: April -> March) so the frontend can filter by FY.
    """
    if not _OK: return []
    try:
        import pandas as pd
        repo = CiscoLCIRepository()
        df = repo.load_lci_solution_vs_project_with_task_end(as_df=True)
        if df is None or df.empty:
            return []
        if "potential_task_end" in df.columns:
            df["potential_task_end"] = pd.to_datetime(df["potential_task_end"], errors="coerce")
            fy = df["potential_task_end"].dt.year.where(
                df["potential_task_end"].dt.month >= 4,
                df["potential_task_end"].dt.year - 1,
            )
            df["potential_task_end_fy"] = fy
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
    """
    Loads Cisco EA metering data WITH customer names.
    Uses a single query that includes mcea_client (name) and mcea_client_id
    directly from vwCiscoEAMeteringLatest, plus fallback to vwCustomerCiscoEAConsolidated.
    """
    if not _OK: return []
    try:
        import pandas as pd
        repo = CiscoEARepository()

        # Primary: load metering data WITH mcea_client (name) in one query
        # Uses get_sqlalchemy_engine() which supports pd.read_sql directly.
        try:
            from src.infrastructure.database.connection import get_sqlalchemy_engine
            engine = get_sqlalchemy_engine()
            df = pd.read_sql(
                """
                SELECT
                    mcea_client_id,
                    mcea_client,
                    mcea_subscription,
                    mcea_suite_name,
                    mcea_sku,
                    mcea_domain,
                    mcea_virtual_account,
                    mcea_status,
                    mcea_start_date,
                    mcea_end_date,
                    mcea_purchased,
                    mcea_total_purchased,
                    mcea_generated,
                    mcea_balance,
                    mcea_update
                FROM vwCiscoEAMeteringLatest
                """,
                engine,
            )
        except Exception as eq:
            logger.warning(f"get_rebate_cisco_ea SQLAlchemy query failed: {eq}, using repo method")
            df = repo.load_measure_cisco_ea(as_df=True)

        if df is None or df.empty:
            return []

        # Use mcea_client as customer_name if available and non-empty
        if "mcea_client" in df.columns:
            df["customer_name"] = df["mcea_client"].where(
                df["mcea_client"].notna() & (df["mcea_client"].astype(str).str.strip() != ""),
                None
            )
        else:
            df["customer_name"] = None

        # Fill remaining NULLs using vwCustomerCiscoEAConsolidated
        needs_name = df["customer_name"].isna().any()
        if needs_name:
            try:
                df_c = repo.load_customer_cisco_ea_consolidated(as_df=True)
                if df_c is not None and not df_c.empty and "customer_id" in df_c.columns and "customer_name" in df_c.columns:
                    df_cust = (
                        df_c[["customer_id", "customer_name"]]
                        .dropna(subset=["customer_name"])
                        .drop_duplicates("customer_id")
                    )
                    df_cust["customer_id"] = pd.to_numeric(df_cust["customer_id"], errors="coerce")
                    df["mcea_client_id"]   = pd.to_numeric(df["mcea_client_id"],   errors="coerce")
                    # Merge only for rows missing customer_name
                    missing_mask = df["customer_name"].isna()
                    df_missing = df[missing_mask][["mcea_client_id"]].merge(
                        df_cust, left_on="mcea_client_id", right_on="customer_id", how="left"
                    )
                    df.loc[missing_mask, "customer_name"] = df_missing["customer_name"].values
            except Exception as ec:
                logger.warning(f"get_rebate_cisco_ea consolidated fallback: {ec}")

        # Last resort: use mcea_client_id as string
        df["customer_name"] = df["customer_name"].where(
            df["customer_name"].notna(),
            df["mcea_client_id"].astype(str)
        )

        # Drop helper column
        df.drop(columns=["mcea_client"], errors="ignore", inplace=True)

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

def get_use_case_vendors() -> List[Dict[str, Any]]:
    """
    Returns the list of vendors (role='vendor') for the Use Cases filter,
    plus a special ADOPTION entry (id=341) — mirrors the Streamlit logic.
    """
    if not _UC_OK:
        return []
    try:
        import pandas as pd
        repo = CompanyRepository()
        df = repo.list_companies_by_role("vendor", as_df=True)
        if df is None or df.empty:
            df = pd.DataFrame(columns=["vendor_id", "vendor_name"])

        # Ensure ADOPTION special entry exists
        if "vendor_id" in df.columns and not (df["vendor_id"] == 341).any():
            new_row = pd.DataFrame([{"vendor_id": 341, "vendor_name": "ADOPTION"}])
            df = pd.concat([df, new_row], ignore_index=True)

        # Normalise column names (some repos return company_id/company_name)
        if "vendor_id" not in df.columns and "company_id" in df.columns:
            df = df.rename(columns={"company_id": "vendor_id", "company_name": "vendor_name"})

        result = []
        for _, row in df.iterrows():
            vid = row.get("vendor_id") or row.get("id")
            vname = row.get("vendor_name") or row.get("name", "")
            if vname:
                result.append({"vendor_id": int(vid) if vid is not None else 0, "vendor_name": str(vname)})
        result.sort(key=lambda x: x["vendor_name"])
        return result
    except Exception as e:
        logger.error(f"get_use_case_vendors: {e}\n{traceback.format_exc()}")
        return []


def get_use_cases_by_vendor(vendor_id: int) -> List[Dict[str, Any]]:
    """
    Returns use cases filtered by vendor_id (uc_vendor_id).
    Mirrors: case_repo.select_use_case_df(company_id=vendor_id)
    Fields: uc_id, uc_vendor_id, uc_vendor_name, uc_architecture,
            uc_solution_domain, uc_use_case, uc_primary_product_id,
            uc_primary_product_name, uc_description, uc_key_supporting_products,
            uc_key_capabilities, uc_it_operations_benefits, uc_business_benefits,
            uc_success_metrics, uc_business_outcomes
    """
    if not _UC_OK or not vendor_id:
        return []
    try:
        repo = UseCaseRepository()
        df = repo.select_use_case_df(company_id=vendor_id)
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_use_cases_by_vendor: {e}\n{traceback.format_exc()}")
        return []


def get_exit_criteria_by_uc_ids(uc_ids: List[int]) -> List[Dict[str, Any]]:
    """
    Returns exit criteria for a list of uc_ids.
    Mirrors: case_repo.select_exit_criteria_df(uc_id_list)
    Fields: ucec_id, ucec_uc_id, ucec_tasktype_id, ucec_tasktype_name,
            ucec_seq, ucec_name, ucec_objective, ucec_scope,
            ucec_expected_results, ucec_update_date
    """
    if not _UC_OK or not uc_ids:
        return []
    try:
        repo = UseCaseRepository()
        df = repo.select_exit_criteria_df(uc_ids)
        return _df_to_list(df)
    except Exception as e:
        logger.error(f"get_exit_criteria_by_uc_ids: {e}\n{traceback.format_exc()}")
        return []


def get_use_cases(company_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Legacy endpoint — kept for compatibility."""
    if not _UC_OK:
        return []
    if company_id:
        return get_use_cases_by_vendor(company_id)
    return []


def get_use_case_companies() -> List[Dict[str, Any]]:
    """Legacy endpoint — kept for compatibility. Use get_use_case_vendors() instead."""
    return get_use_case_vendors()
