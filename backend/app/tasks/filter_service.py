"""
Task Filter Service — business logic para Filter tab + Task Detail + Activities + Next Follow-Up.
Espelha task_filter_tasks.py, task_detail.py, task_filter_next_follow_up.py, task_activity.py.
"""
import sys
import os
import logging
import traceback
from datetime import date
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_ROOT = "/opt/bridgeadoption"
if _ROOT not in sys.path and os.path.isdir(os.path.join(_ROOT, "src")):
    sys.path.insert(0, _ROOT)

try:
    from src.infrastructure.database.repositories.task_repository import TaskRepository
    from src.infrastructure.database.repositories.task_activity_repository import TaskActivityRepository
    from src.infrastructure.database.repositories.task_history_repository import TaskHistoryRepository
    from src.infrastructure.database.repositories.squad_repository import SquadRepository
    from src.infrastructure.database.repositories.status_type_repository import StatusTypeRepository
    from src.domain.status_reclassification import reclassify_status
    _REPOS_OK = True
except ImportError as e:
    logger.warning(f"Task filter repos não disponíveis: {e}")
    _REPOS_OK = False


def _serialize(row: Dict[str, Any]) -> Dict[str, Any]:
    result = {}
    for k, v in row.items():
        if v is None:
            result[k] = None
        elif hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        else:
            try:
                import pandas as pd
                if pd.isna(v):
                    result[k] = None
                    continue
            except Exception:
                pass
            result[k] = v
    return result


def _serialize_df(df) -> List[Dict[str, Any]]:
    if df is None:
        return []
    try:
        import pandas as pd
        if isinstance(df, pd.DataFrame) and df.empty:
            return []
        return [_serialize(dict(r)) for r in df.to_dict("records")]
    except Exception:
        return []


# ─────────────────────────────────────────
# FILTER OPTIONS  (vwFilterTask)
# ─────────────────────────────────────────

def get_filter_options() -> Dict[str, List[Any]]:
    """
    Retorna opções dinâmicas para os filtros de Task (vwFilterTask).
    Espelha task_filter_tasks.py: get_dynamic_options()
    """
    if not _REPOS_OK:
        return {}
    try:
        import pandas as pd
        repo = TaskRepository()
        df = repo.load_for_filtering(as_df=True)

        if df.empty:
            return {}

        # Reclassify status
        df = reclassify_status(df, "task")

        def _sorted_unique(series) -> List[str]:
            vals = series.dropna().astype(str).drop_duplicates()
            return sorted([v for v in vals.tolist() if v.strip() and v.lower() != "none"])

        owners = _sorted_unique(df["task_owner_name"] if "task_owner_name" in df.columns else pd.Series(dtype=str))
        if "UNASSIGNED" in owners:
            owners = [v for v in owners if v != "UNASSIGNED"] + ["UNASSIGNED"]

        result = {
            "owners": owners,
            "task_types": _sorted_unique(df["task_type_name"]) if "task_type_name" in df.columns else [],
            "clients": _sorted_unique(df["task_customer_name"]) if "task_customer_name" in df.columns else [],
            "ws_list": _sorted_unique(df["task_ws"]) if "task_ws" in df.columns else [],
            "tracks": _sorted_unique(df["task_track"]) if "task_track" in df.columns else [],
            "deal_ids": _sorted_unique(df["task_deal_id"]) if "task_deal_id" in df.columns else [],
            "statuses": _sorted_unique(df["task_status_reclassified"]) if "task_status_reclassified" in df.columns else [],
        }
        return result
    except Exception as e:
        logger.error(f"get_filter_options: {e}\n{traceback.format_exc()}")
        return {}


# ─────────────────────────────────────────
# FILTER TASKS  (vwFilterTask + vwTask)
# ─────────────────────────────────────────

def filter_tasks(
    owner_names: Optional[List[str]] = None,
    task_type_names: Optional[List[str]] = None,
    client_names: Optional[List[str]] = None,
    ws_list: Optional[List[str]] = None,
    tracks: Optional[List[str]] = None,
    deal_ids: Optional[List[str]] = None,
    status_names: Optional[List[str]] = None,
    task_ids: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    """
    Aplica filtros em cascata e retorna tasks completas (vwTask).
    Espelha task_filter_tasks.py: filter_tasks() + filter_tasks_dynamic()
    """
    if not _REPOS_OK:
        return []
    try:
        import pandas as pd
        repo = TaskRepository()

        # Load filter DF
        filter_df = repo.load_for_filtering(as_df=True)
        if filter_df.empty:
            return []

        filter_df = reclassify_status(filter_df, "task")
        df = filter_df.copy()

        # Apply cascading filters
        if owner_names:
            df = df[df["task_owner_name"].isin(owner_names)]
        if task_type_names:
            df = df[df["task_type_name"].isin(task_type_names)]
        if client_names:
            df = df[df["task_customer_name"].isin(client_names)]
        if ws_list:
            df = df[df["task_ws"].isin(ws_list)]
        if tracks:
            df = df[df["task_track"].isin(tracks)]
        if deal_ids:
            df = df[df["task_deal_id"].isin(deal_ids)]
        if status_names and "task_status_reclassified" in df.columns:
            df = df[df["task_status_reclassified"].isin(status_names)]
        if task_ids:
            df = df[df["task_id"].isin(task_ids)]

        if df.empty:
            return []

        # Get full task data from vwTask
        selected_ids = df["task_id"].dropna().astype(int).tolist()
        task_df = repo.get_task(task_id=selected_ids, as_df=True)
        if task_df.empty:
            return []

        task_df = reclassify_status(task_df, "task")
        return _serialize_df(task_df)

    except Exception as e:
        logger.error(f"filter_tasks: {e}\n{traceback.format_exc()}")
        return []


# ─────────────────────────────────────────
# TASK DETAIL  (GET single task + activities)
# ─────────────────────────────────────────

def get_task_detail(task_id: int) -> Dict[str, Any]:
    """Returns full task detail from vwTask."""
    if not _REPOS_OK:
        return {}
    try:
        repo = TaskRepository()
        task_df = repo.get_task(task_id=task_id, as_df=True)
        if task_df is None or task_df.empty:
            return {}
        task_df = reclassify_status(task_df, "task")
        rows = _serialize_df(task_df)
        return rows[0] if rows else {}
    except Exception as e:
        logger.error(f"get_task_detail: {e}")
        return {}


def get_task_activities(task_id: int) -> List[Dict[str, Any]]:
    """Returns activities for a given task_id."""
    if not _REPOS_OK:
        return []
    try:
        repo = TaskActivityRepository()
        act_df = repo.get_activity(task_id=task_id, activity_id=None, as_df=True)
        if act_df is None or act_df.empty:
            return []
        act_df = reclassify_status(act_df, "activity")
        return _serialize_df(act_df)
    except Exception as e:
        logger.error(f"get_task_activities: {e}")
        return []


def get_task_history(task_id: int, activity_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Returns history records for a task (optionally filtered by activity)."""
    if not _REPOS_OK:
        return []
    try:
        repo = TaskHistoryRepository()
        rows = repo.get_history(task_id=task_id, activity_id=activity_id, as_df=False) or []
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_task_history: {e}")
        return []


# ─────────────────────────────────────────
# UPDATE TASK
# ─────────────────────────────────────────

def update_task(task_id: int, data: Dict[str, Any]) -> bool:
    """Updates task fields in tbTask. Returns True on success."""
    if not _REPOS_OK or not data:
        return False
    try:
        repo = TaskRepository()
        rows = repo.update(data=data, where={"task_id": task_id})
        return rows > 0
    except Exception as e:
        logger.error(f"update_task: {e}")
        return False


def add_task_history(record: Dict[str, Any]) -> int:
    """Inserts a history record in tbTaskRecord. Returns new record ID."""
    if not _REPOS_OK or not record:
        return 0
    try:
        repo = TaskHistoryRepository()
        return repo.insert(record=record)
    except Exception as e:
        logger.error(f"add_task_history: {e}")
        return 0


# ─────────────────────────────────────────
# CSM LIST (for owner selectbox)
# ─────────────────────────────────────────

def get_csm_list() -> List[Dict[str, Any]]:
    """Returns active CSMs for owner/temp_owner dropdowns."""
    if not _REPOS_OK:
        return []
    try:
        repo = SquadRepository()
        csm_df = repo.get_csm_active(as_df=True)
        if csm_df is None or csm_df.empty:
            return []
        csm_df = csm_df.sort_values("csm_name").reset_index(drop=True)
        return _serialize_df(csm_df)
    except Exception as e:
        logger.error(f"get_csm_list: {e}")
        return []


# ─────────────────────────────────────────
# STATUS OPTIONS
# ─────────────────────────────────────────

def get_status_types() -> List[Dict[str, Any]]:
    """Returns available status types from tbStatusType."""
    if not _REPOS_OK:
        return []
    try:
        repo = StatusTypeRepository()
        df = repo.load_status(as_df=True)
        if df is None or df.empty:
            return []
        # Filter out status IDs not available for direct editing
        df = df[~df["statustype_id"].astype(int).isin([5])]
        df = df.sort_values("statustype_id").reset_index(drop=True)
        return _serialize_df(df)
    except Exception as e:
        logger.error(f"get_status_types: {e}")
        return []


# ─────────────────────────────────────────
# NEXT FOLLOW-UP
# ─────────────────────────────────────────

def get_next_follow_up(user_id: int, is_manager: bool) -> Dict[str, List[Dict[str, Any]]]:
    """
    Returns follow-ups grouped by period: delayed, today, current_week, next_week.
    Espelha task_filter_next_follow_up.py: filter_next_follow_up()
    """
    if not _REPOS_OK:
        return {"delayed": [], "today": [], "current_week": [], "next_week": []}
    try:
        repo = TaskHistoryRepository()

        def _filter_by_owner(rows: list) -> list:
            if is_manager:
                return rows
            return [r for r in rows if int(r.get("task_owner_id") or 0) == user_id]

        delayed = _filter_by_owner(repo.get_next_follow_up_delayed(as_df=False) or [])
        today_items = _filter_by_owner(repo.get_next_follow_up_today(as_df=False) or [])
        current_week = _filter_by_owner(repo.get_next_follow_up_current_week(as_df=False) or [])
        next_week = _filter_by_owner(repo.get_next_follow_up_next_week(as_df=False) or [])

        return {
            "delayed": [_serialize(dict(r)) for r in delayed],
            "today": [_serialize(dict(r)) for r in today_items],
            "current_week": [_serialize(dict(r)) for r in current_week],
            "next_week": [_serialize(dict(r)) for r in next_week],
        }
    except Exception as e:
        logger.error(f"get_next_follow_up: {e}\n{traceback.format_exc()}")
        return {"delayed": [], "today": [], "current_week": [], "next_week": []}


# ─────────────────────────────────────────
# UPDATE ACTIVITY
# ─────────────────────────────────────────

def get_activity_detail(activity_id: int) -> Dict[str, Any]:
    """Returns single activity record."""
    if not _REPOS_OK:
        return {}
    try:
        repo = TaskActivityRepository()
        act_df = repo.get_activity(task_id=None, activity_id=activity_id, as_df=True)
        if act_df is None or act_df.empty:
            return {}
        act_df = reclassify_status(act_df, "activity")
        rows = _serialize_df(act_df)
        return rows[0] if rows else {}
    except Exception as e:
        logger.error(f"get_activity_detail: {e}")
        return {}


def update_activity(activity_id: int, data: Dict[str, Any]) -> bool:
    """Updates activity fields in tbTaskActivity."""
    if not _REPOS_OK or not data:
        return False
    try:
        repo = TaskActivityRepository()
        rows = repo.update(data=data, where={"activity_id": activity_id})
        return rows > 0
    except Exception as e:
        logger.error(f"update_activity: {e}")
        return False


# ─────────────────────────────────────────
# PERSON LIST  (para RACI selectbox)
# ─────────────────────────────────────────

def get_company_list() -> List[Dict[str, Any]]:
    """Returns list of companies from tbCompany for RACI person filter."""
    if not _REPOS_OK:
        return []
    try:
        from src.infrastructure.database.repositories.company_repository import CompanyRepository
        repo = CompanyRepository()
        rows = repo.list_available_companies(as_df=False)
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_company_list: {e}")
        return []


def get_person_list(company_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Returns active persons from tbPerson, optionally filtered by company."""
    if not _REPOS_OK:
        return []
    try:
        from src.infrastructure.database.repositories.person_repository import PersonRepository
        repo = PersonRepository()
        where: dict = {"person_enabled": 1}
        if company_id is not None:
            where["person_company_id"] = int(company_id)
        rows = repo.list_by(where=where, as_df=False)
        return [_serialize({
            "person_id": r["person_id"],
            "person_name": r["person_name"],
            "person_type": r.get("person_type"),
            "person_company_id": r.get("person_company_id"),
            "person_job_title": r.get("person_job_title"),
        }) for r in rows]
    except Exception as e:
        logger.error(f"get_person_list: {e}")
        return []


# ─────────────────────────────────────────
# RACI
# ─────────────────────────────────────────

def get_task_raci(task_id: int, activity_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Returns active RACI records for a task/activity, joined with person name."""
    if not _REPOS_OK:
        return []
    try:
        from src.infrastructure.database.connection import get_db_connection
        conditions = ["r.taskraci_task_id = %s", "r.taskraci_enabled = 1"]
        params: List[Any] = [int(task_id)]

        if activity_id is not None:
            conditions.append("r.taskraci_activity_id = %s")
            params.append(int(activity_id))
        else:
            conditions.append("(r.taskraci_activity_id IS NULL OR r.taskraci_activity_id = 0)")

        where_clause = " AND ".join(conditions)
        query = f"""
            SELECT
                r.taskraci_id,
                r.taskraci_task_id,
                r.taskraci_activity_id,
                r.taskraci_person_id,
                r.taskraci_person_type,
                r.taskraci_responsibility,
                r.taskraci_enabled,
                COALESCE(p.person_name, CONCAT('Person #', r.taskraci_person_id)) AS person_name,
                p.person_email,
                p.person_job_title,
                p.person_telephone,
                p.person_cellphone,
                p.person_type AS person_type_label,
                c.company_name AS person_company_name
            FROM tbTaskRACI r
            LEFT JOIN tbPerson p ON p.person_id = r.taskraci_person_id
            LEFT JOIN tbCompany c ON c.company_id = p.person_company_id
            WHERE {where_clause}
            ORDER BY r.taskraci_responsibility, person_name
        """
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_task_raci: {e}\n{traceback.format_exc()}")
        return []


def add_raci(
    task_id: int,
    person_id: int,
    responsibility: str,
    activity_id: Optional[int] = None,
    person_type: str = "user",
    subtask_id: int = 0,
) -> int:
    """Inserts a RACI record. Returns new taskraci_id or 0 on error."""
    if not _REPOS_OK:
        return 0
    try:
        from src.infrastructure.database.repositories.task_raci_repository import TaskRACIRepository
        repo = TaskRACIRepository()
        data = {
            "taskraci_task_id": int(task_id),
            "taskraci_activity_id": int(activity_id) if activity_id is not None else 0,
            "taskraci_subtask_id": subtask_id,
            "taskraci_person_id": int(person_id),
            "taskraci_person_type": person_type,
            "taskraci_responsibility": responsibility,
            "taskraci_enabled": 1,
        }
        return repo.insert(data)
    except Exception as e:
        logger.error(f"add_raci: {e}")
        return 0


def remove_raci(raci_id: int, disabled_by: str) -> bool:
    """Disables a RACI record (soft delete)."""
    if not _REPOS_OK:
        return False
    try:
        from src.infrastructure.database.repositories.task_raci_repository import TaskRACIRepository
        repo = TaskRACIRepository()
        rows = repo.update(
            data={
                "taskraci_enabled": 0,
                "taskraci_disabled_by": disabled_by,
                "taskraci_disabled_date": date.today().isoformat(),
            },
            where={"taskraci_id": raci_id},
        )
        return rows > 0
    except Exception as e:
        logger.error(f"remove_raci: {e}")
        return False


def update_raci_responsibility(raci_id: int, responsibility: str) -> bool:
    """Updates the responsibility (R/A/C/I) of an existing RACI record."""
    if not _REPOS_OK:
        return False
    try:
        from src.infrastructure.database.repositories.task_raci_repository import TaskRACIRepository
        repo = TaskRACIRepository()
        rows = repo.update(
            data={"taskraci_responsibility": responsibility},
            where={"taskraci_id": raci_id, "taskraci_enabled": 1},
        )
        return rows > 0
    except Exception as e:
        logger.error(f"update_raci_responsibility: {e}")
        return False
