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
    """Updates task fields in tbTask. Returns True on success.

    Auto-calculates task_completed when task_status changes (mirrors Streamlit logic):
    - No activities: status 2|3 → 25%, status 10 → 100%
    - Has activities: status 10 → 100%, else → avg(activity_completed)
    """
    if not _REPOS_OK or not data:
        return False
    try:
        # Auto task_completed when status changes and user didn't explicitly set it
        if "task_status" in data and "task_completed" not in data:
            new_status = int(data["task_status"])
            try:
                from src.infrastructure.database.connection import get_db_connection
                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)
                cursor.execute(
                    """SELECT COUNT(*) AS cnt, AVG(activity_completed) AS avg_comp
                       FROM tbTaskActivity
                       WHERE activity_task_id = %s AND activity_enabled = 1""",
                    (int(task_id),)
                )
                row = cursor.fetchone()
                cursor.close()
                conn.close()
                count_act = int(row["cnt"] or 0) if row else 0
                avg_comp = float(row["avg_comp"] or 0.0) if row else 0.0
                if count_act == 0:
                    if new_status in (2, 3):
                        data["task_completed"] = 0.25
                    elif new_status == 10:
                        data["task_completed"] = 1.0
                else:
                    if new_status == 10:
                        data["task_completed"] = 1.0
                    else:
                        data["task_completed"] = round(avg_comp, 4)
            except Exception as ce:
                logger.warning(f"update_task auto_completed: {ce}")

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
# TASK TYPES  (para New Task selectbox)
# ─────────────────────────────────────────

def get_task_types() -> List[Dict[str, Any]]:
    """Returns all task types from tbTaskType. Espelha task_new.py: get_task_type_by_ids()."""
    if not _REPOS_OK:
        return []
    try:
        repo = TaskRepository()
        df = repo.get_task_type_by_ids(type_ids=None, as_df=True)
        if df is None or df.empty:
            return []
        df = df.sort_values("tasktype_name").reset_index(drop=True)
        return _serialize_df(df)
    except Exception as e:
        logger.error(f"get_task_types: {e}")
        return []


# ─────────────────────────────────────────
# NEW TASK  (create task)
# ─────────────────────────────────────────

def create_task(data: Dict[str, Any], created_by_name: str) -> Dict[str, Any]:
    """
    Creates a new task in tbTask + inserts a history record.
    Espelha task_new.py: insert_task_submit()

    Returns: {"success": bool, "task_id": int}
    """
    if not _REPOS_OK or not data:
        return {"success": False, "task_id": 0}
    try:
        repo = TaskRepository()
        new_task_id = repo.insert(data=data)

        if new_task_id and int(new_task_id) > 0:
            history_repo = TaskHistoryRepository()
            dt = date.today().strftime("%Y-%b-%d")
            history_repo.insert(record={
                "taskrecord_task_id": int(new_task_id),
                "taskrecord_activity_id": 0,
                "taskrecord_remark": f"Task created at {dt}",
                "taskrecord_updated_by": created_by_name,
            })
            return {"success": True, "task_id": int(new_task_id)}

        return {"success": False, "task_id": 0}
    except Exception as e:
        logger.error(f"create_task: {e}\n{traceback.format_exc()}")
        return {"success": False, "task_id": 0}


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


def add_activity(task_id: int, data: Dict[str, Any]) -> int:
    """Creates a new activity for a task in tbTaskActivity.

    Auto-fills activity_task_id, next activity_seq (max+1), and sensible
    defaults (activity_status, activity_completed) when not provided.
    Returns the new activity_id, or 0 on error.
    """
    if not _REPOS_OK or not data:
        return 0
    try:
        repo = TaskActivityRepository()

        payload = dict(data)
        payload["activity_task_id"] = int(task_id)

        if "activity_seq" not in payload or not payload.get("activity_seq"):
            existing = repo.get_activity(task_id=task_id, activity_id=None, as_df=False) or []
            max_seq = 0
            for r in existing:
                try:
                    seq = int(r.get("activity_seq") or 0)
                    if seq > max_seq:
                        max_seq = seq
                except (TypeError, ValueError):
                    continue
            payload["activity_seq"] = max_seq + 1

        payload.setdefault("activity_status", 1)  # default OPEN
        payload.setdefault("activity_completed", 0)

        return repo.insert(payload)
    except Exception as e:
        logger.error(f"add_activity: {e}\n{traceback.format_exc()}")
        return 0


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


def get_person_list(company_id: Optional[int] = None, internal_only: bool = False) -> List[Dict[str, Any]]:
    """Returns active persons from tbPerson.

    - If internal_only=True: returns only persons with person_company_id IS NULL
      (internal resources, no company association).
    - Elif company_id is provided: filters by that company.
    - Else: returns all active persons (no company filter).
    """
    if not _REPOS_OK:
        return []
    try:
        from src.infrastructure.database.connection import get_db_connection
        conditions = ["person_enabled = 1"]
        params: List[Any] = []
        if internal_only:
            conditions.append("person_company_id IS NULL")
        elif company_id is not None:
            conditions.append("person_company_id = %s")
            params.append(int(company_id))
        where_clause = " AND ".join(conditions)
        query = f"""
            SELECT person_id, person_name, person_type, person_company_id, person_job_title
            FROM tbPerson
            WHERE {where_clause}
            ORDER BY person_name
        """
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_person_list: {e}")
        return []


def create_person(data: Dict[str, Any]) -> int:
    """Creates a new person in tbPerson. Returns new person_id, or 0 on error.

    Required: person_name.
    Optional: person_company_id, person_job_title, person_email,
              person_telephone, person_cellphone, person_type.
    Always sets person_enabled = 1.
    """
    if not _REPOS_OK or not data or not str(data.get("person_name") or "").strip():
        return 0
    try:
        from src.infrastructure.database.repositories.person_repository import PersonRepository
        repo = PersonRepository()
        payload = {k: v for k, v in data.items() if v not in (None, "")}
        payload["person_name"] = str(payload["person_name"]).strip()
        payload.setdefault("person_enabled", 1)
        if "person_company_id" in payload:
            try:
                payload["person_company_id"] = int(payload["person_company_id"])
            except (TypeError, ValueError):
                payload.pop("person_company_id", None)
        return repo.insert(payload)
    except Exception as e:
        logger.error(f"create_person: {e}\n{traceback.format_exc()}")
        return 0


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


# ─────────────────────────────────────────
# STATUS JUSTIFICATIONS
# ─────────────────────────────────────────

def get_status_justifications(status_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Returns status justification options from tbStatusTypeJustification."""
    if not _REPOS_OK:
        return []
    try:
        from src.infrastructure.database.repositories.status_type_repository import StatusTypeRepository
        repo = StatusTypeRepository()
        rows = repo.get_status_type_justification(status_id=status_id, as_df=False) or []
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_status_justifications: {e}")
        return []


# ─────────────────────────────────────────
# PROJECTS FOR TASK
# ─────────────────────────────────────────

def get_projects_for_task(customer_id: int) -> List[Dict[str, Any]]:
    """Returns active projects for a customer."""
    if not _REPOS_OK or not customer_id:
        return []
    try:
        from src.infrastructure.database.repositories.project_repository import ProjectRepository
        repo = ProjectRepository()
        statuses = ["Business Model", "In progress", "Not started", "Unidentified"]
        rows = repo.get_project(customer_id=int(customer_id), project_status=statuses, as_df=False) or []
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_projects_for_task: {e}")
        return []


def get_project_team_for_task(customer_id: int) -> List[Dict[str, Any]]:
    """Returns project team members for a customer's active projects."""
    if not _REPOS_OK or not customer_id:
        return []
    try:
        from src.infrastructure.database.repositories.project_repository import ProjectRepository
        repo = ProjectRepository()
        statuses = ["Business Model", "In progress", "Not started", "Unidentified"]
        rows = repo.get_project_team(customer_id=int(customer_id), project_status=statuses, as_df=False) or []
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_project_team_for_task: {e}")
        return []


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
