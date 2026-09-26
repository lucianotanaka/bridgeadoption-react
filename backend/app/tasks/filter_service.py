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
    TaskRepository = None
    TaskActivityRepository = None
    TaskHistoryRepository = None
    SquadRepository = None
    StatusTypeRepository = None

    def reclassify_status(df, _kind):
        return df

    _REPOS_OK = False


def _activities_via_sql(task_id: int) -> List[Dict[str, Any]]:
    query = """
        SELECT *
        FROM tbTaskActivity
        WHERE activity_task_id = %s
        ORDER BY activity_seq, activity_id
    """
    try:
        from src.infrastructure.database.connection import get_db_connection

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(task_id),))
            rows = cursor.fetchall() or []
            cursor.close()
            return [_serialize(dict(r)) for r in rows]
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"_activities_via_sql: {e}")
        return []


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
        if getattr(df, "empty", False):
            return []
        records = df.to_dict("records")
        return [_serialize(dict(r)) for r in records]
    except Exception:
        return []


def _rows_to_df(rows: List[Dict[str, Any]]):
    try:
        import pandas as pd
        return pd.DataFrame(rows)
    except Exception:
        return None


def _sorted_unique_from_rows(rows: List[Dict[str, Any]], key: str) -> List[str]:
    values = []
    seen = set()
    for row in rows:
        value = row.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if not text or text.lower() == "none":
            continue
        normalized = text.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        values.append(text)
    return sorted(values, key=lambda v: v.casefold())


# ─────────────────────────────────────────
# FILTER OPTIONS  (vwFilterTask)
# ─────────────────────────────────────────

def get_filter_options() -> Dict[str, List[Any]]:
    """
    Retorna opções dinâmicas para os filtros de Task (vwFilterTask).
    Espelha task_filter_tasks.py: get_dynamic_options()
    """
    try:
        if _REPOS_OK and TaskRepository is not None:
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

            statuses = _sorted_unique(df["task_status_name"]) if "task_status_name" in df.columns else []

            if "task_status_id" in df.columns:
                try:
                    status_types = get_status_types()
                    status_map = {}
                    for item in status_types:
                        status_id = item.get("statustype_id")
                        status_name = item.get("statustype_name")
                        if status_id is None or status_name is None:
                            continue
                        status_map[int(status_id)] = str(status_name).strip()

                    known_statuses = {s.casefold() for s in statuses}
                    for status_id in sorted(df["task_status_id"].dropna().astype(int).unique().tolist()):
                        status_name = status_map.get(status_id)
                        if status_name and status_name.casefold() not in known_statuses:
                            statuses.append(status_name)
                            known_statuses.add(status_name.casefold())

                    statuses = sorted(statuses, key=lambda v: v.casefold())
                except Exception:
                    pass

            reclassified_statuses = _sorted_unique(df["task_status_reclassified"]) if "task_status_reclassified" in df.columns else []
            for status_name in reclassified_statuses:
                if status_name.casefold() not in {s.casefold() for s in statuses}:
                    statuses.append(status_name)
            statuses = sorted(statuses, key=lambda v: v.casefold())

            task_types_from_view = _sorted_unique(df["task_type_name"]) if "task_type_name" in df.columns else []
            try:
                all_task_types = get_task_types()
                known_types = {t.casefold() for t in task_types_from_view}
                for item in all_task_types:
                    type_name = str(item.get("tasktype_name") or "").strip()
                    if type_name and type_name.casefold() not in known_types:
                        task_types_from_view.append(type_name)
                        known_types.add(type_name.casefold())
                task_types_from_view = sorted(task_types_from_view, key=lambda v: v.casefold())
            except Exception:
                pass

            return {
                "owners": owners,
                "task_types": task_types_from_view,
                "clients": _sorted_unique(df["task_customer_name"]) if "task_customer_name" in df.columns else [],
                "ws_list": _sorted_unique(df["task_ws"]) if "task_ws" in df.columns else [],
                "tracks": _sorted_unique(df["task_track"]) if "task_track" in df.columns else [],
                "deal_ids": _sorted_unique(df["task_deal_id"]) if "task_deal_id" in df.columns else [],
                "statuses": statuses,
            }

        from src.infrastructure.database.connection import get_db_connection

        query = """
            SELECT
                task_owner_name,
                task_type_name,
                task_customer_name,
                task_ws,
                task_track,
                task_deal_id,
                task_status_name,
                task_status_id
            FROM vwFilterTask
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            rows = cursor.fetchall() or []
            cursor.close()
        finally:
            conn.close()

        if not rows:
            return {}

        owners = _sorted_unique_from_rows(rows, "task_owner_name")
        if "UNASSIGNED" in owners:
            owners = [v for v in owners if v != "UNASSIGNED"] + ["UNASSIGNED"]

        statuses = _sorted_unique_from_rows(rows, "task_status_name")

        try:
            status_types = get_status_types()
            status_map = {}
            for item in status_types:
                status_id = item.get("statustype_id")
                status_name = item.get("statustype_name")
                if status_id is None or status_name is None:
                    continue
                status_map[int(status_id)] = str(status_name).strip()

            known_statuses = {s.casefold() for s in statuses}
            for row in rows:
                status_id = row.get("task_status_id")
                if status_id is None:
                    continue
                try:
                    status_name = status_map.get(int(status_id))
                except (TypeError, ValueError):
                    status_name = None
                if status_name and status_name.casefold() not in known_statuses:
                    statuses.append(status_name)
                    known_statuses.add(status_name.casefold())

            statuses = sorted(statuses, key=lambda v: v.casefold())
        except Exception:
            pass

        task_types_from_view = _sorted_unique_from_rows(rows, "task_type_name")
        try:
            all_task_types = get_task_types()
            known_types = {t.casefold() for t in task_types_from_view}
            for item in all_task_types:
                type_name = str(item.get("tasktype_name") or "").strip()
                if type_name and type_name.casefold() not in known_types:
                    task_types_from_view.append(type_name)
                    known_types.add(type_name.casefold())
            task_types_from_view = sorted(task_types_from_view, key=lambda v: v.casefold())
        except Exception:
            pass

        return {
            "owners": owners,
            "task_types": task_types_from_view,
            "clients": _sorted_unique_from_rows(rows, "task_customer_name"),
            "ws_list": _sorted_unique_from_rows(rows, "task_ws"),
            "tracks": _sorted_unique_from_rows(rows, "task_track"),
            "deal_ids": _sorted_unique_from_rows(rows, "task_deal_id"),
            "statuses": statuses,
        }
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
    try:
        if _REPOS_OK and TaskRepository is not None:
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

            # Get full task data from vwTask; if a matching task_id is not present in
            # vwTask, fallback to the filtering rows themselves so the Filter tab does
            # not lose valid matches coming from vwFilterTask/tbTask.
            selected_ids = df["task_id"].dropna().astype(int).tolist()
            task_df = repo.get_task(task_id=selected_ids, as_df=True)

            if task_df is not None and not task_df.empty:
                task_df = reclassify_status(task_df, "task")
                return _serialize_df(task_df)

            return _serialize_df(df)

        from src.infrastructure.database.connection import get_db_connection

        filter_where_clauses: List[str] = []
        filter_params: List[Any] = []

        def _add_in_filter(column: str, values: Optional[List[Any]]) -> None:
            if not values:
                return
            cleaned = [str(v).strip() for v in values if str(v).strip()]
            if not cleaned:
                return
            placeholders = ", ".join(["%s"] * len(cleaned))
            filter_where_clauses.append(f"{column} IN ({placeholders})")
            filter_params.extend(cleaned)

        _add_in_filter("task_owner_name", owner_names)
        _add_in_filter("task_type_name", task_type_names)
        _add_in_filter("task_customer_name", client_names)
        _add_in_filter("task_ws", ws_list)
        _add_in_filter("task_track", tracks)
        _add_in_filter("task_deal_id", deal_ids)

        if status_names:
            cleaned_status = [str(v).strip() for v in status_names if str(v).strip()]
            if cleaned_status:
                placeholders = ", ".join(["%s"] * len(cleaned_status))
                filter_where_clauses.append(
                    f"(task_status_name IN ({placeholders}) OR task_status_reclassified IN ({placeholders}))"
                )
                filter_params.extend(cleaned_status)
                filter_params.extend(cleaned_status)

        if task_ids:
            cleaned_ids = [int(v) for v in task_ids if v is not None]
            if cleaned_ids:
                placeholders = ", ".join(["%s"] * len(cleaned_ids))
                filter_where_clauses.append(f"task_id IN ({placeholders})")
                filter_params.extend(cleaned_ids)

        filter_where_sql = f"WHERE {' AND '.join(filter_where_clauses)}" if filter_where_clauses else ""

        query_filter = f"""
            SELECT *
            FROM vwFilterTask
            {filter_where_sql}
            ORDER BY task_id DESC
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query_filter, tuple(filter_params))
            filter_rows = cursor.fetchall() or []
            cursor.close()
        finally:
            conn.close()

        if not filter_rows:
            return []

        selected_ids = []
        seen_ids = set()
        for row in filter_rows:
            task_id = row.get("task_id")
            try:
                numeric_id = int(task_id)
            except (TypeError, ValueError):
                continue
            if numeric_id in seen_ids:
                continue
            seen_ids.add(numeric_id)
            selected_ids.append(numeric_id)

        task_rows: List[Dict[str, Any]] = []
        if selected_ids:
            placeholders = ", ".join(["%s"] * len(selected_ids))
            query_vwtask = f"""
                SELECT *
                FROM vwTask
                WHERE task_id IN ({placeholders})
                ORDER BY task_id DESC
            """

            conn = get_db_connection()
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query_vwtask, tuple(selected_ids))
                task_rows = cursor.fetchall() or []
                cursor.close()
            finally:
                conn.close()

        if task_rows:
            task_map = {}
            for row in task_rows:
                task_id = row.get("task_id")
                if task_id is None:
                    continue
                task_map[int(task_id)] = dict(row)

            merged_rows = []
            for row in filter_rows:
                task_id = row.get("task_id")
                try:
                    numeric_id = int(task_id)
                except (TypeError, ValueError):
                    numeric_id = None

                if numeric_id is not None and numeric_id in task_map:
                    merged = dict(row)
                    merged.update(task_map[numeric_id])
                    merged_rows.append(merged)
                else:
                    merged_rows.append(dict(row))

            df = _rows_to_df(merged_rows)
            if df is not None:
                df = reclassify_status(df, "task")
                return _serialize_df(df)
            return [_serialize(dict(r)) for r in merged_rows]

        df = _rows_to_df([dict(r) for r in filter_rows])
        if df is not None:
            df = reclassify_status(df, "task")
            return _serialize_df(df)

        return [_serialize(dict(r)) for r in filter_rows]
    except Exception as e:
        logger.error(f"filter_tasks: {e}\n{traceback.format_exc()}")
        return []


# ─────────────────────────────────────────
# TASK DETAIL  (GET single task + activities)
# ─────────────────────────────────────────

def _get_task_detail_via_sql(task_id: int) -> Dict[str, Any]:
    try:
        from src.infrastructure.database.connection import get_db_connection

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)

            cursor.execute("SELECT * FROM vwTask WHERE task_id = %s", (int(task_id),))
            view_rows = cursor.fetchall() or []
            if view_rows:
                task_df = _rows_to_df([dict(r) for r in view_rows])
                if task_df is not None:
                    task_df = reclassify_status(task_df, "task")
                    rows = _serialize_df(task_df)
                else:
                    rows = [_serialize(dict(r)) for r in view_rows]
                return rows[0] if rows else {}

            cursor.execute("SELECT * FROM tbTask WHERE task_id = %s", (int(task_id),))
            table_rows = cursor.fetchall() or []
            cursor.close()

            if table_rows:
                rows = [_serialize(dict(r)) for r in table_rows]
                return rows[0] if rows else {}
            return {}
        finally:
            conn.close()
    except Exception as e:
        logger.warning(f"_get_task_detail_via_sql: {e}")
        return {}


def get_task_detail(task_id: int) -> Dict[str, Any]:
    """Returns full task detail from vwTask, with tbTask fallback for task types not in the view."""
    try:
        if _REPOS_OK and TaskRepository is not None:
            repo = TaskRepository()
            task_df = repo.get_task(task_id=task_id, as_df=True)
            if task_df is not None and not task_df.empty:
                task_df = reclassify_status(task_df, "task")
                rows = _serialize_df(task_df)
                return rows[0] if rows else {}

        return _get_task_detail_via_sql(task_id)
    except Exception as e:
        logger.error(f"get_task_detail: {e}")
        return _get_task_detail_via_sql(task_id)


def get_task_activities(task_id: int) -> List[Dict[str, Any]]:
    """Returns activities for a given task_id."""
    if not task_id:
        return []

    if not _REPOS_OK or TaskActivityRepository is None:
        return _activities_via_sql(task_id)

    try:
        repo = TaskActivityRepository()
        act_df = repo.get_activity(task_id=task_id, activity_id=None, as_df=True)
        if act_df is None or act_df.empty:
            return _activities_via_sql(task_id)
        act_df = reclassify_status(act_df, "activity")
        return _serialize_df(act_df)
    except Exception as e:
        logger.error(f"get_task_activities: {e}")
        return _activities_via_sql(task_id)


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

    Observação:
    - MariaDB/MySQL pode retornar rowcount=0 quando o registro existe,
      mas os valores enviados são idênticos aos já persistidos.
    - Nesse caso tratamos como sucesso lógico, desde que a task exista.
    """

    def _normalize_task_update_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        allowed_fields = {
            "task_owner_id",
            "task_temp_owner_id",
            "task_project_id",
            "task_status",
            "task_status_justification",
            "task_start",
            "task_end",
            "task_start_performed",
            "task_end_performed",
            "task_value",
            "task_currency",
            "task_ws",
            "task_deal_id",
            "task_priority",
            "task_reference",
            "task_remark",
            "task_description",
            "task_completed",
            "task_end_fy",
        }

        integer_fields = {
            "task_owner_id",
            "task_temp_owner_id",
            "task_project_id",
            "task_status",
            "task_end_fy",
        }

        decimal_fields = {
            "task_value",
            "task_completed",
        }

        nullable_string_fields = {
            "task_status_justification",
            "task_currency",
            "task_ws",
            "task_deal_id",
            "task_priority",
            "task_reference",
            "task_remark",
            "task_description",
        }

        nullable_date_fields = {
            "task_start",
            "task_end",
            "task_start_performed",
            "task_end_performed",
        }

        normalized: Dict[str, Any] = {}
        for key, value in payload.items():
            if key not in allowed_fields:
                logger.warning("update_task: ignoring unsupported field %s", key)
                continue

            if key in nullable_date_fields:
                normalized[key] = None if value in ("", None) else value
                continue

            if key in nullable_string_fields:
                if value is None:
                    normalized[key] = None
                else:
                    text = str(value).strip()
                    normalized[key] = text or None
                continue

            if key in integer_fields:
                if value in ("", None):
                    normalized[key] = None
                else:
                    normalized[key] = int(value)
                continue

            if key in decimal_fields:
                if value in ("", None):
                    normalized[key] = None
                else:
                    normalized[key] = float(value)
                continue

            normalized[key] = value

        return normalized

    if not _REPOS_OK or not data:
        return False
    try:
        repo = TaskRepository()
        existing = repo.get_columns_by_task_id(
            task_id=int(task_id),
            columns=[
                "task_id",
                "task_owner_id",
                "task_temp_owner_id",
                "task_project_id",
                "task_status",
                "task_status_justification",
                "task_start",
                "task_end",
                "task_start_performed",
                "task_end_performed",
                "task_value",
                "task_currency",
                "task_ws",
                "task_deal_id",
                "task_priority",
                "task_reference",
                "task_remark",
                "task_description",
                "task_completed",
                "task_end_fy",
            ],
            as_df=False,
        )
        if not existing:
            logger.warning("update_task: task_id=%s not found", task_id)
            return False

        normalized_data = _normalize_task_update_payload(data)
        if not normalized_data:
            logger.warning("update_task: no valid fields to update for task_id=%s payload=%s", task_id, data)
            return False

        # Auto task_completed when status changes and user didn't explicitly set it
        if "task_status" in normalized_data and "task_completed" not in normalized_data:
            new_status = int(normalized_data["task_status"])
            try:
                activities = get_task_activities(int(task_id))
                count_act = len(activities)
                completed_values = [
                    float(a.get("activity_completed") or 0.0)
                    for a in activities
                    if a.get("activity_completed") is not None
                ]
                avg_comp = (sum(completed_values) / len(completed_values)) if completed_values else 0.0

                if count_act == 0:
                    if new_status in (2, 3):
                        normalized_data["task_completed"] = 0.25
                    elif new_status == 10:
                        normalized_data["task_completed"] = 1.0
                else:
                    if new_status == 10:
                        normalized_data["task_completed"] = 1.0
                    else:
                        normalized_data["task_completed"] = round(avg_comp, 4)
            except Exception as ce:
                logger.warning(f"update_task auto_completed: {ce}")

        changed_data: Dict[str, Any] = {}
        for key, new_value in normalized_data.items():
            old_value = existing.get(key)

            if key in {"task_start", "task_end", "task_start_performed", "task_end_performed"}:
                old_norm = old_value.isoformat() if hasattr(old_value, "isoformat") else (str(old_value)[:10] if old_value is not None else None)
                new_norm = str(new_value)[:10] if new_value is not None else None
            elif key in {"task_value", "task_completed"}:
                old_norm = None if old_value is None else float(old_value)
                new_norm = None if new_value is None else float(new_value)
            elif key in {"task_owner_id", "task_temp_owner_id", "task_project_id", "task_status", "task_end_fy"}:
                old_norm = None if old_value is None else int(old_value)
                new_norm = None if new_value is None else int(new_value)
            else:
                old_norm = None if old_value is None else str(old_value).strip()
                new_norm = None if new_value is None else str(new_value).strip()

            if old_norm != new_norm:
                changed_data[key] = new_value

        if not changed_data:
            logger.info("update_task: no-op for task_id=%s after diffing sanitized payload=%s", task_id, normalized_data)
            return True

        rows = repo.update(data=changed_data, where={"task_id": int(task_id)})
        if rows > 0:
            logger.info("update_task: updated task_id=%s fields=%s", task_id, sorted(changed_data.keys()))
            return True

        refreshed = repo.get_columns_by_task_id(
            task_id=int(task_id),
            columns=list(changed_data.keys()),
            as_df=False,
        )
        if refreshed:
            persisted = True
            for key, expected_value in changed_data.items():
                current_value = refreshed.get(key)

                if key in {"task_start", "task_end", "task_start_performed", "task_end_performed"}:
                    current_norm = current_value.isoformat() if hasattr(current_value, "isoformat") else (str(current_value)[:10] if current_value is not None else None)
                    expected_norm = str(expected_value)[:10] if expected_value is not None else None
                elif key in {"task_value", "task_completed"}:
                    current_norm = None if current_value is None else float(current_value)
                    expected_norm = None if expected_value is None else float(expected_value)
                elif key in {"task_owner_id", "task_temp_owner_id", "task_project_id", "task_status", "task_end_fy"}:
                    current_norm = None if current_value is None else int(current_value)
                    expected_norm = None if expected_value is None else int(expected_value)
                else:
                    current_norm = None if current_value is None else str(current_value).strip()
                    expected_norm = None if expected_value is None else str(expected_value).strip()

                if current_norm != expected_norm:
                    persisted = False
                    break

            if persisted:
                logger.info("update_task: persistence confirmed after rowcount=0 for task_id=%s", task_id)
                return True

        logger.warning(
            "update_task: update did not persist for task_id=%s changed_data=%s original_payload=%s",
            task_id,
            changed_data,
            data,
        )
        return False
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


def get_task_record_templates(
    template_type: Optional[str] = None,
    enabled_only: bool = True,
) -> List[Dict[str, Any]]:
    """Returns note templates from tbTaskRecordTemplate."""
    if not _REPOS_OK:
        return []
    try:
        repo = TaskHistoryRepository()
        rows = repo.get_record_templates(
            template_type=template_type,
            enabled_only=enabled_only,
            as_df=False,
        ) or []
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_task_record_templates: {e}")
        return []


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
    try:
        if _REPOS_OK and TaskRepository is not None:
            repo = TaskRepository()
            df = repo.get_task_type_by_ids(type_ids=None, as_df=True)
            if df is not None and not df.empty:
                if "tasktype_name" in df.columns:
                    df["tasktype_name"] = df["tasktype_name"].astype(str).str.strip()
                    df = df[df["tasktype_name"].str.len() > 0]
                    df = df.drop_duplicates(subset=["tasktype_name"], keep="first")
                    df = df.sort_values("tasktype_name").reset_index(drop=True)
                return _serialize_df(df)

        from src.infrastructure.database.connection import get_db_connection

        query = """
            SELECT DISTINCT
                tasktype_id,
                TRIM(tasktype_name) AS tasktype_name
            FROM tbTaskType
            WHERE tasktype_name IS NOT NULL
              AND TRIM(tasktype_name) <> ''
            ORDER BY tasktype_name
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            rows = cursor.fetchall() or []
            cursor.close()
            return [_serialize(dict(r)) for r in rows]
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"get_task_types: {e}\n{traceback.format_exc()}")
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
    """Updates activity fields in tbTaskActivity.

    Observação:
    - MariaDB/MySQL pode retornar rowcount=0 quando o registro existe,
      mas os valores enviados são idênticos aos já persistidos.
    - Nesse caso tratamos como sucesso lógico, desde que a activity exista.
    """

    def _normalize_activity_update_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        allowed_fields = {
            "activity_seq",
            "activity_status",
            "activity_start",
            "activity_end",
            "activity_start_performed",
            "activity_end_performed",
            "activity_effort",
            "activity_effort_performed",
            "activity_completed",
            "activity_deal_id",
            "activity_ws",
            "activity_value",
            "activity_currency",
            "activity_approved",
            "activity_approved_value",
            "activity_approved_currency",
            "activity_approval_request_date",
            "activity_approval_date",
            "activity_approval_fy",
            "activity_end_fy",
            "activity_backlog_value",
            "activity_track",
            "activity_sub_track",
            "activity_objective",
            "activity_scope",
            "activity_expected_results",
            "activity_name",
        }

        integer_fields = {
            "activity_seq",
            "activity_status",
            "activity_approved",
            "activity_approval_fy",
            "activity_end_fy",
        }

        decimal_fields = {
            "activity_effort",
            "activity_effort_performed",
            "activity_completed",
            "activity_value",
            "activity_approved_value",
        }

        nullable_string_fields = {
            "activity_name",
            "activity_deal_id",
            "activity_ws",
            "activity_currency",
            "activity_approved_currency",
            "activity_track",
            "activity_sub_track",
            "activity_objective",
            "activity_scope",
            "activity_expected_results",
            "activity_backlog_value",
        }

        nullable_date_fields = {
            "activity_start",
            "activity_end",
            "activity_start_performed",
            "activity_end_performed",
            "activity_approval_request_date",
            "activity_approval_date",
        }

        normalized: Dict[str, Any] = {}
        for key, value in payload.items():
            if key not in allowed_fields:
                logger.warning("update_activity: ignoring unsupported field %s", key)
                continue

            if key in nullable_date_fields:
                if value in ("", None):
                    normalized[key] = None
                else:
                    normalized[key] = value
                continue

            if key in nullable_string_fields:
                if value is None:
                    normalized[key] = None
                else:
                    text = str(value).strip()
                    normalized[key] = text or None
                continue

            if key in integer_fields:
                if value in ("", None):
                    normalized[key] = None
                else:
                    normalized[key] = int(value)
                continue

            if key in decimal_fields:
                if value in ("", None):
                    normalized[key] = None
                else:
                    normalized[key] = float(value)
                continue

            normalized[key] = value

        return normalized

    if not _REPOS_OK or not data:
        return False
    try:
        repo = TaskActivityRepository()
        existing = repo.get_activity_by_id(int(activity_id), as_df=False)
        if not existing:
            logger.warning("update_activity: activity_id=%s not found", activity_id)
            return False

        normalized_data = _normalize_activity_update_payload(data)
        if not normalized_data:
            logger.warning("update_activity: no valid fields to update for activity_id=%s payload=%s", activity_id, data)
            return False

        changed_data: Dict[str, Any] = {}
        for key, new_value in normalized_data.items():
            old_value = existing.get(key)

            if key in {
                "activity_start",
                "activity_end",
                "activity_start_performed",
                "activity_end_performed",
                "activity_approval_request_date",
                "activity_approval_date",
            }:
                old_norm = old_value.isoformat() if hasattr(old_value, "isoformat") else (str(old_value)[:10] if old_value is not None else None)
                new_norm = str(new_value)[:10] if new_value is not None else None
            elif key in {
                "activity_effort",
                "activity_effort_performed",
                "activity_completed",
                "activity_value",
                "activity_approved_value",
            }:
                old_norm = None if old_value is None else float(old_value)
                new_norm = None if new_value is None else float(new_value)
            elif key in {
                "activity_seq",
                "activity_status",
                "activity_approved",
                "activity_approval_fy",
                "activity_end_fy",
            }:
                old_norm = None if old_value is None else int(old_value)
                new_norm = None if new_value is None else int(new_value)
            else:
                old_norm = None if old_value is None else str(old_value).strip()
                new_norm = None if new_value is None else str(new_value).strip()

            if old_norm != new_norm:
                changed_data[key] = new_value

        if not changed_data:
            logger.info("update_activity: no-op for activity_id=%s after diffing sanitized payload=%s", activity_id, normalized_data)
            return True

        rows = repo.update(data=changed_data, where={"activity_id": int(activity_id)})
        if rows > 0:
            logger.info("update_activity: updated activity_id=%s fields=%s", activity_id, sorted(changed_data.keys()))
            return True

        refreshed = repo.get_activity_by_id(int(activity_id), as_df=False)
        if refreshed:
            persisted = True
            for key, expected_value in changed_data.items():
                current_value = refreshed.get(key)

                if key in {
                    "activity_start",
                    "activity_end",
                    "activity_start_performed",
                    "activity_end_performed",
                    "activity_approval_request_date",
                    "activity_approval_date",
                }:
                    current_norm = current_value.isoformat() if hasattr(current_value, "isoformat") else (str(current_value)[:10] if current_value is not None else None)
                    expected_norm = str(expected_value)[:10] if expected_value is not None else None
                elif key in {
                    "activity_effort",
                    "activity_effort_performed",
                    "activity_completed",
                    "activity_value",
                    "activity_approved_value",
                }:
                    current_norm = None if current_value is None else float(current_value)
                    expected_norm = None if expected_value is None else float(expected_value)
                elif key in {
                    "activity_seq",
                    "activity_status",
                    "activity_approved",
                    "activity_approval_fy",
                    "activity_end_fy",
                }:
                    current_norm = None if current_value is None else int(current_value)
                    expected_norm = None if expected_value is None else int(expected_value)
                else:
                    current_norm = None if current_value is None else str(current_value).strip()
                    expected_norm = None if expected_value is None else str(expected_value).strip()

                if current_norm != expected_norm:
                    persisted = False
                    break

            if persisted:
                logger.info("update_activity: persistence confirmed after rowcount=0 for activity_id=%s", activity_id)
                return True

        logger.warning(
            "update_activity: update did not persist for activity_id=%s changed_data=%s original_payload=%s",
            activity_id,
            changed_data,
            data,
        )
        return False
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
