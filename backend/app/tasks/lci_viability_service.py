"""
LCI Viability Service — espelha task_lci_viability.py do Streamlit.
Permite visualizar e atualizar status de tasks LCI-eligible agrupadas por Track/PartyID.
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
    from src.infrastructure.database.repositories.cisco_lci_repository import CiscoLCIRepository
    from src.infrastructure.database.repositories.task_repository import TaskRepository
    from src.infrastructure.database.repositories.task_history_repository import TaskHistoryRepository
    from src.infrastructure.database.repositories.status_type_repository import StatusTypeRepository
    from src.infrastructure.database.repositories.project_repository import ProjectRepository
    _REPOS_OK = True
except ImportError as e:
    logger.warning(f"LCI Viability repos nao disponiveis: {e}")
    _REPOS_OK = False

STATUS_IN_PROGRESS = 2
STATUS_ON_HOLD = 3
STATUS_CANCELLED = 4

STATUS_NAME_MAP = {
    1: "OPEN", 2: "IN PROGRESS", 3: "ON HOLD",
    4: "CANCELLED", 5: "DONE", 6: "DECLINED", 10: "CLOSED",
}


def _safe_str(v) -> str:
    return str(v) if v is not None else ""


def _safe_int(v) -> int:
    try:
        return int(v) if v is not None else 0
    except (TypeError, ValueError):
        return 0


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


def get_lci_track_pm_list() -> List[Dict[str, Any]]:
    """Returns vwCustomerCiscoLCITrackProjectPM data."""
    if not _REPOS_OK:
        return []
    try:
        repo = CiscoLCIRepository()
        rows = repo.load_lci_track_project_pm(as_df=False) or []
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_lci_track_pm_list: {e}\n{traceback.format_exc()}")
        return []


def get_tasks_for_lci(customer_id: int, track: str) -> List[Dict[str, Any]]:
    """Returns tasks for a given customer + track combination, grouped by track|party_id."""
    if not _REPOS_OK or not customer_id or not track:
        return []
    try:
        task_repo = TaskRepository()
        track_list = [t.strip() for t in str(track).split(",") if t.strip()]
        if not track_list:
            return []

        track_in_list = ",".join([f"'{t}'" for t in track_list])
        where_raw = (
            f"task_customer_id = {customer_id} "
            f"AND task_track IN ({track_in_list}) "
            f"AND task_status_id IN (1,3)"
        )

        task_columns = [
            "task_id", "task_customer_id", "task_customer_name",
            "task_start", "task_end", "task_status_id", "task_status_name",
            "task_deal_id", "task_cr_party_id", "task_ws", "task_track",
            "task_subtrack", "task_value", "task_opt_in_flag",
        ]

        task_df = task_repo.get_task_by_query(
            columns=task_columns,
            where_raw=where_raw,
            as_df=True,
        )

        if task_df is None or task_df.empty:
            return []

        task_df = task_df.sort_values(
            by=["task_customer_id", "task_track", "task_cr_party_id", "task_deal_id", "task_value"],
            ascending=[True, True, True, True, True],
        ).reset_index(drop=True)

        rows = [_serialize(dict(r)) for r in task_df.to_dict("records")]

        groups: Dict[str, List[Dict]] = {}
        for r in rows:
            cid = _safe_str(r.get("task_customer_id"))
            tr = _safe_str(r.get("task_track"))
            party = _safe_str(r.get("task_cr_party_id"))
            key = f"{cid} | {tr} | Party {party}"
            r["__group_key__"] = key
            groups.setdefault(key, []).append(r)

        result = []
        for group_key, group_rows in groups.items():
            result.append({
                "group_key": group_key,
                "track": group_rows[0].get("task_track", ""),
                "party_id": group_rows[0].get("task_cr_party_id", ""),
                "tasks": group_rows,
            })

        return result

    except Exception as e:
        logger.error(f"get_tasks_for_lci: {e}\n{traceback.format_exc()}")
        return []


def normalize_group_statuses(status_map: Dict[int, str]) -> Dict[int, str]:
    """
    Business rules:
    1) If any IN PROGRESS: first stays IN PROGRESS, others -> CANCELLED
    2) elif any ON HOLD: all -> ON HOLD
    3) elif any CANCELLED: all -> CANCELLED
    4) else: unchanged
    """
    normalized = dict(status_map)
    values = list(normalized.values())

    any_ip = "IN PROGRESS" in values
    any_oh = "ON HOLD" in values
    any_ca = "CANCELLED" in values

    if any_ip:
        first_ip = next(idx for idx, val in normalized.items() if val == "IN PROGRESS")
        for idx in list(normalized.keys()):
            normalized[idx] = "IN PROGRESS" if idx == first_ip else "CANCELLED"
    elif any_oh:
        for idx in list(normalized.keys()):
            normalized[idx] = "ON HOLD"
    elif any_ca:
        for idx in list(normalized.keys()):
            normalized[idx] = "CANCELLED"

    return normalized


def get_cancellation_justifications() -> List[str]:
    """Returns valid justifications for CANCELLED status."""
    if not _REPOS_OK:
        return []
    try:
        repo = StatusTypeRepository()
        df = repo.get_status_type_justification(status_id=4, as_df=True)
        if df is None or df.empty:
            return []
        return df["status_justification_en"].dropna().astype(str).str.strip().unique().tolist()
    except Exception as e:
        logger.error(f"get_cancellation_justifications: {e}")
        return []


def get_projects_in_progress(customer_id: int) -> List[Dict[str, Any]]:
    """Returns active (not closed/cancelled) projects for a customer."""
    if not _REPOS_OK or not customer_id:
        return []
    try:
        repo = ProjectRepository()
        rows = repo.get_project_in_progress(customer_id=int(customer_id), as_df=False) or []
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_projects_in_progress: {e}\n{traceback.format_exc()}")
        return []


class SaveGroupRequest:
    def __init__(
        self,
        group_tasks: List[Dict[str, Any]],
        new_statuses: Dict[int, str],
        cancellation_justification: Optional[str] = None,
        user_name: Optional[str] = None,
        project_id: Optional[int] = None,
        new_project_ov: Optional[str] = None,
        new_project_name: Optional[str] = None,
        customer_id: Optional[int] = None,
        customer_name: Optional[str] = None,
    ):
        self.group_tasks = group_tasks
        self.new_statuses = new_statuses
        self.cancellation_justification = cancellation_justification
        self.user_name = user_name or "system"
        self.project_id = project_id
        self.new_project_ov = new_project_ov
        self.new_project_name = new_project_name
        self.customer_id = customer_id
        self.customer_name = customer_name


def save_group_status(req: SaveGroupRequest) -> Dict[str, Any]:
    """
    Saves status changes for a group of tasks.

    Business rules (mirrors Streamlit task_lci_viability.py):
      - If exactly 1 task IN PROGRESS: requires a project link (existing via
        project_id OR new via new_project_ov/new_project_name). The project
        is created if needed and linked to that task's task_project_id.
        Other tasks in the group become CANCELLED with an automatic
        justification.
      - If all ON HOLD: status 3 with justification "IN REVIEW".
      - If all CANCELLED: requires cancellation_justification.

    Returns {success, errors, updated_tasks}
    """
    if not _REPOS_OK:
        return {"success": False, "errors": ["Repos not available"], "updated_tasks": []}

    task_repo = TaskRepository()
    history_repo = TaskHistoryRepository()
    project_repo = ProjectRepository()
    today = date.today().strftime("%Y-%m-%d")

    errors: List[str] = []
    updated: List[Dict[str, Any]] = []

    # Build task lookup by task_id
    task_lookup = {_safe_int(t.get("task_id")): t for t in req.group_tasks}

    # Normalize statuses (rules are index-based; map back to task_ids preserving order)
    status_map = {int(k): v for k, v in req.new_statuses.items()}
    task_ids = list(status_map.keys())
    indexed_values = {i: v for i, v in enumerate(status_map.values())}
    normalized_indexed = normalize_group_statuses(indexed_values)
    normalized_by_task_id = {task_ids[i]: normalized_indexed[i] for i in range(len(task_ids))}

    in_progress_task_ids = [tid for tid, s in normalized_by_task_id.items() if s == "IN PROGRESS"]

    # If there's an IN PROGRESS task, resolve/create the project first
    resolved_project_id: Optional[int] = None
    if len(in_progress_task_ids) == 1:
        if req.project_id:
            resolved_project_id = int(req.project_id)
        elif req.new_project_ov and req.new_project_name:
            try:
                customer_id = req.customer_id
                if not customer_id:
                    orig_task = task_lookup.get(in_progress_task_ids[0], {})
                    customer_id = _safe_int(orig_task.get("task_customer_id"))

                project_payload: Dict[str, Any] = {
                    "project_ov": req.new_project_ov,
                    "project_name": req.new_project_name,
                    "project_customer_id": customer_id,
                }
                if req.customer_name:
                    project_payload["project_customer_name"] = req.customer_name

                resolved_project_id = project_repo.insert(project_payload)
            except Exception as e:
                errors.append(f"Error creating project: {str(e)}")
                logger.error(f"save_group_status create project: {e}\n{traceback.format_exc()}")
        else:
            errors.append(
                "A project (existing or new) must be provided to move a task to IN PROGRESS."
            )

        if not resolved_project_id and not errors:
            errors.append("Could not resolve/create project for the IN PROGRESS task.")

        if errors:
            return {"success": False, "errors": errors, "updated_tasks": []}

    for task_id, new_status_name in normalized_by_task_id.items():
        orig_task = task_lookup.get(task_id, {})
        old_status_name = _safe_str(orig_task.get("task_status_name")) or "OPEN"

        task_data: Dict[str, Any] = {}

        if new_status_name == "IN PROGRESS":
            task_data["task_status"] = STATUS_IN_PROGRESS
            task_data["task_start_performed"] = today
            task_end = orig_task.get("task_end")
            if task_end:
                task_data["task_end_performed"] = task_end if isinstance(task_end, str) else str(task_end)
            if resolved_project_id:
                task_data["task_project_id"] = resolved_project_id

        elif new_status_name == "ON HOLD":
            task_data["task_status"] = STATUS_ON_HOLD
            task_data["task_status_justification"] = "IN REVIEW"

        elif new_status_name == "CANCELLED":
            task_data["task_status"] = STATUS_CANCELLED
            if len(in_progress_task_ids) == 1:
                task_data["task_status_justification"] = (
                    "OPTED IN FOR ANOTHER TASK WITH SAME DEAL ID / TRACK / PARTY ID"
                )
            elif req.cancellation_justification:
                task_data["task_status_justification"] = req.cancellation_justification
            else:
                errors.append(f"Cancellation justification is required for task {task_id}.")
                continue
        else:
            continue  # No recognized target status — skip

        if old_status_name.upper() == new_status_name.upper():
            continue  # No change needed

        try:
            rows = task_repo.update(data=task_data, where={"task_id": task_id})
            if rows == 0:
                errors.append(f"Failed to update task {task_id}")
                continue

            remark = f"Task status changed from {old_status_name} to {new_status_name}"
            if new_status_name == "CANCELLED" and task_data.get("task_status_justification"):
                remark += f" — {task_data['task_status_justification']}"

            history_repo.insert(record={
                "taskrecord_task_id": task_id,
                "taskrecord_activity_id": 0,
                "taskrecord_remark": remark,
                "taskrecord_updated_by": req.user_name,
            })

            updated.append({"task_id": task_id, "new_status": new_status_name})

        except Exception as e:
            errors.append(f"Error updating task {task_id}: {str(e)}")
            logger.error(f"save_group_status task {task_id}: {e}")

    return {
        "success": len(errors) == 0,
        "errors": errors,
        "updated_tasks": updated,
    }
