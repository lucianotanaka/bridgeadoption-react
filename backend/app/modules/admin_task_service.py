"""
Admin Task Service — espelha a lógica do Streamlit admin_task.py.

Fornece:
- Opções de filtro dinâmico (ws/deal/track/subtrack) da vwTask
- Filtragem de tarefas por task_id, ws, deal, track, subtrack
- Activities para múltiplos task_ids ou um único
- Registros (history) para múltiplos task_ids, único task, ou task+activity
- Remoção lógica de tasks (zera task + activities + records)
- Remoção lógica de activity (zera activity + records relacionados)
"""
import sys
import os
import logging
import traceback
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_ROOT = "/opt/bridgeadoption"
if _ROOT not in sys.path and os.path.isdir(os.path.join(_ROOT, "src")):
    sys.path.insert(0, _ROOT)

try:
    from src.infrastructure.database.connection import get_db_connection
    from src.infrastructure.database.repositories.task_repository import TaskRepository
    from src.infrastructure.database.repositories.task_activity_repository import TaskActivityRepository
    from src.infrastructure.database.repositories.task_history_repository import TaskHistoryRepository
    _REPOS_OK = True
except ImportError as e:
    logger.warning(f"Admin task repos nao disponiveis: {e}")
    _REPOS_OK = False


# ─── Serializer ──────────────────────────────────────────────────────────────

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


# ─── Remove value maps (mirrors Streamlit _TASK_REMOVE_VALUES etc.) ──────────

_TASK_REMOVE_VALUES: Dict[str, Any] = {
    "task_tasktype_id": 0, "task_reference": None, "task_owner_id": 0,
    "task_temp_owner_id": None, "task_customer_id": 0, "task_cr_party_id": None,
    "task_cr_party_name": None, "task_customer_name": None,
    "task_created_by": 0, "task_priority": "LOW",
    "task_project_id": 0, "task_status": 0, "task_status_justification": None,
    "task_start": None, "task_end": None, "task_start_performed": None,
    "task_end_performed": None, "task_value": 0, "task_forecast": 0,
    "task_backlog": 0, "task_ws": None, "task_deal_id": None,
    "task_track": None, "task_subtrack": None, "task_highlight": 0,
    "task_remark": None, "task_description": None, "task_ea_flag": 0,
    "task_telemetry_flag": 0, "task_opt_in_flag": 0, "task_completed": 0,
    "task_architecture": None, "task_solution_domain": None,
    "task_eligible": "Y", "task_end_fy": None,
    "task_booking_date": None, "task_booking_amount": 0,
}

_ACTIVITY_REMOVE_VALUES: Dict[str, Any] = {
    "activity_task_id": 0, "activity_seq": 0, "activity_name": None,
    "activity_objective": None, "activity_scope": None,
    "activity_expected_results": None, "activity_effort": 0,
    "activity_status": 0, "activity_ws": None, "activity_deal_id": None,
    "activity_track": None, "activity_sub_track": None, "activity_value": 0,
    "activity_start": None, "activity_end": None,
    "activity_start_performed": None, "activity_end_performed": None,
    "activity_effort_performed": 0, "activity_completed": 0,
    "activity_approved": 0, "activity_approved_value": 0,
    "activity_approved_currency": None, "activity_approval_date": None,
    "activity_approval_request_date": None, "activity_approval_fy": None,
    "activity_end_fy": None, "activity_backlog_value": 0,
}

_RECORD_REMOVE_VALUES: Dict[str, Any] = {
    "taskrecord_task_id": 0, "taskrecord_activity_id": 0,
    "taskrecord_remark": None, "taskrecord_next_followup": None,
    "taskrecord_updated_by": None,
}


# ─── Filter Options ───────────────────────────────────────────────────────────

def admin_get_task_filter_options() -> Dict[str, List[str]]:
    """
    Retorna opcoes distintas de ws/deal/track/subtrack da vwFilterTask (+ tbTask para subtracks).
    Usa load_for_filtering() — mesmo padrao de filter_service.py que funciona corretamente.
    """
    empty = {"ws_list": [], "deal_ids": [], "tracks": [], "subtracks": []}
    if not _REPOS_OK:
        return empty
    try:
        import pandas as pd
        repo = TaskRepository()

        # Step 1: use vwFilterTask (proven, no INFORMATION_SCHEMA overhead)
        df = repo.load_for_filtering(as_df=True)
        if df is None or df.empty:
            return empty

        def _distinct(col: str, src_df=df) -> List[str]:
            if col not in src_df.columns:
                return []
            return sorted([
                str(x) for x in src_df[col].dropna().unique()
                if str(x).strip() not in ("", "None", "nan")
            ])

        result: Dict[str, List[str]] = {
            "ws_list":   _distinct("task_ws"),
            "deal_ids":  _distinct("task_deal_id"),
            "tracks":    _distinct("task_track"),
            "subtracks": _distinct("task_subtrack"),  # may not be in vwFilterTask
        }

        # Step 2: if subtracks empty (vwFilterTask lacks task_subtrack), query tbTask directly
        if not result["subtracks"]:
            try:
                from src.infrastructure.database.connection import get_sqlalchemy_engine
                engine = get_sqlalchemy_engine()
                df2 = pd.read_sql(
                    "SELECT DISTINCT task_subtrack FROM tbTask "
                    "WHERE task_subtrack IS NOT NULL AND task_subtrack <> '' "
                    "ORDER BY task_subtrack",
                    engine,
                )
                if df2 is not None and not df2.empty:
                    result["subtracks"] = sorted([
                        str(x) for x in df2["task_subtrack"].tolist()
                        if str(x).strip() not in ("", "None", "nan")
                    ])
            except Exception as sub_err:
                logger.warning(f"admin_get_task_filter_options subtracks fallback: {sub_err}")

        return result
    except Exception as e:
        logger.error(f"admin_get_task_filter_options: {e}\n{traceback.format_exc()}")
        return empty


# ─── Filter Tasks ─────────────────────────────────────────────────────────────

def admin_filter_tasks(
    task_id: Optional[int] = None,
    ws_list: Optional[List[str]] = None,
    deal_ids: Optional[List[str]] = None,
    tracks: Optional[List[str]] = None,
    subtracks: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Filtra tarefas usando o mesmo padrao de filter_service.py:
      1. Carrega vwFilterTask (load_for_filtering) — leve, sem overhead de INFORMATION_SCHEMA
      2. Aplica filtros em pandas
      3. Busca dados completos de vwTask via get_task(task_ids)
    Espelha _load_tasks() do Streamlit admin_task.py.
    """
    if not _REPOS_OK:
        return []
    try:
        import pandas as pd
        repo = TaskRepository()

        # Step 1: load filter base
        filter_df = repo.load_for_filtering(as_df=True)
        if filter_df is None or filter_df.empty:
            return []

        df = filter_df.copy()

        # Step 2: apply cascading filters on vwFilterTask
        if ws_list and "task_ws" in df.columns:
            df = df[df["task_ws"].isin(ws_list)]
        if deal_ids and "task_deal_id" in df.columns:
            df = df[df["task_deal_id"].isin(deal_ids)]
        if tracks and "task_track" in df.columns:
            df = df[df["task_track"].isin(tracks)]
        if subtracks:
            if "task_subtrack" in df.columns:
                df = df[df["task_subtrack"].isin(subtracks)]
            # else: subtrack not in vwFilterTask — skip filter (show all)

        if df.empty:
            return []

        # Step 3: get full task rows from vwTask
        selected_ids = df["task_id"].dropna().astype(int).drop_duplicates().tolist()
        if not selected_ids:
            return []

        # Direct client-side filter by task_id (numeric)
        task_df = repo.get_task(task_id=selected_ids, as_df=True)
        if task_df is None or task_df.empty:
            return []

        if task_id is not None and "task_id" in task_df.columns:
            task_df = task_df[task_df["task_id"] == task_id]

        return _serialize_df(task_df.reset_index(drop=True))
    except Exception as e:
        logger.error(f"admin_filter_tasks: {e}\n{traceback.format_exc()}")
        return []


# ─── Activities ───────────────────────────────────────────────────────────────

def admin_get_activities_one(task_id: int) -> List[Dict[str, Any]]:
    """Activities para um unico task_id."""
    if not _REPOS_OK or not task_id:
        return []
    try:
        repo = TaskActivityRepository()
        df = repo.get_activity(task_id=int(task_id), activity_id=None, as_df=True)
        return _serialize_df(df)
    except Exception as e:
        logger.error(f"admin_get_activities_one: {e}")
        return []


def admin_get_activities_many(task_ids: List[int]) -> List[Dict[str, Any]]:
    """Activities para uma lista de task_ids via SQL direto."""
    if not _REPOS_OK or not task_ids:
        return []
    try:
        placeholders = ", ".join(["%s"] * len(task_ids))
        query = f"""
            SELECT *
            FROM tbTaskActivity
            WHERE activity_task_id IN ({placeholders})
            ORDER BY activity_task_id, activity_seq
        """
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, tuple(int(x) for x in task_ids))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"admin_get_activities_many: {e}")
        return []


# ─── Records (History) ────────────────────────────────────────────────────────

def admin_get_records_many(task_ids: List[int]) -> List[Dict[str, Any]]:
    """Records para uma lista de task_ids via SQL direto."""
    if not _REPOS_OK or not task_ids:
        return []
    try:
        placeholders = ", ".join(["%s"] * len(task_ids))
        query = f"""
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_task_id IN ({placeholders})
            ORDER BY taskrecord_task_id, taskrecord_id DESC
        """
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, tuple(int(x) for x in task_ids))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"admin_get_records_many: {e}")
        return []


def admin_get_records_task(task_id: int) -> List[Dict[str, Any]]:
    """Records para um unico task_id."""
    if not _REPOS_OK or not task_id:
        return []
    try:
        query = """
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_task_id = %s
            ORDER BY taskrecord_id DESC
        """
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (int(task_id),))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"admin_get_records_task: {e}")
        return []


def admin_get_records_activity(task_id: int, activity_id: int) -> List[Dict[str, Any]]:
    """Records para um task_id + activity_id especificos."""
    if not _REPOS_OK or not task_id or not activity_id:
        return []
    try:
        query = """
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_task_id = %s
              AND taskrecord_activity_id = %s
            ORDER BY taskrecord_id DESC
        """
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (int(task_id), int(activity_id)))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"admin_get_records_activity: {e}")
        return []


# ─── Remove Tasks (bulk zero-out) ────────────────────────────────────────────

def admin_remove_tasks(task_ids: List[int]) -> Dict[str, Any]:
    """
    Zera tbTask + tbTaskActivity + tbTaskRecord para os task_ids informados.
    Espelha o bloco 'Confirmar Remocao' do Streamlit admin_task.py.
    Returns: {removed: int, errors: List[str]}
    """
    if not _REPOS_OK or not task_ids:
        return {"removed": 0, "errors": ["No task_ids provided"]}

    errors: List[str] = []
    removed = 0

    repo_task = TaskRepository()
    repo_act = TaskActivityRepository()
    repo_rec = TaskHistoryRepository()

    for tid in task_ids:
        try:
            repo_task.update(data=_TASK_REMOVE_VALUES, where={"task_id": int(tid)})
        except Exception as e:
            errors.append(f"tbTask task_id={tid}: {e}")

        try:
            repo_act.update(data=_ACTIVITY_REMOVE_VALUES, where={"activity_task_id": int(tid)})
        except Exception as e:
            errors.append(f"tbTaskActivity task_id={tid}: {e}")

        try:
            repo_rec.update(data=_RECORD_REMOVE_VALUES, where={"taskrecord_task_id": int(tid)})
        except Exception as e:
            errors.append(f"tbTaskRecord task_id={tid}: {e}")

        if not any(str(tid) in err for err in errors):
            removed += 1

    return {"removed": removed, "errors": errors}


# ─── Remove Activity ─────────────────────────────────────────────────────────

def admin_remove_activity(activity_id: int) -> Dict[str, Any]:
    """
    Zera tbTaskActivity + tbTaskRecord WHERE activity_id.
    Espelha o bloco 'Confirmar Remocao' de atividade do Streamlit admin_task.py.
    Returns: {success: bool, errors: List[str]}
    """
    if not _REPOS_OK or not activity_id:
        return {"success": False, "errors": ["No activity_id provided"]}

    errors: List[str] = []

    repo_act = TaskActivityRepository()
    repo_rec = TaskHistoryRepository()

    try:
        repo_act.update(
            data=_ACTIVITY_REMOVE_VALUES,
            where={"activity_id": int(activity_id)},
        )
    except Exception as e:
        errors.append(f"tbTaskActivity activity_id={activity_id}: {e}")

    try:
        repo_rec.update(
            data=_RECORD_REMOVE_VALUES,
            where={"taskrecord_activity_id": int(activity_id)},
        )
    except Exception as e:
        errors.append(f"tbTaskRecord activity_id={activity_id}: {e}")

    return {"success": len(errors) == 0, "errors": errors}
