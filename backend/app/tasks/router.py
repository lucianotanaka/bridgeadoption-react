"""
Task Router — endpoints:
  GET  /api/tasks/overview
  GET  /api/tasks/kpi
  GET  /api/tasks/action-queue
  GET  /api/tasks/filter-options
  POST /api/tasks/filter
  GET  /api/tasks/{task_id}
  PUT  /api/tasks/{task_id}
  GET  /api/tasks/{task_id}/activities
  GET  /api/tasks/{task_id}/history
  POST /api/tasks/{task_id}/history
  GET  /api/tasks/activities/{activity_id}
  PUT  /api/tasks/activities/{activity_id}
  GET  /api/tasks/follow-up
  GET  /api/tasks/csm-list
  GET  /api/tasks/status-types
"""
import logging
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.tasks.schemas import TaskKPISummary, TaskOverviewResponse
from app.tasks.service import (
    get_task_action_queue,
    get_task_kpi_summary,
    get_task_overview,
)
from app.tasks.filter_service import (
    get_filter_options,
    filter_tasks,
    get_task_detail,
    get_task_activities,
    get_task_history,
    update_task,
    add_task_history,
    get_csm_list,
    get_status_types,
    get_next_follow_up,
    get_activity_detail,
    update_activity,
)
from app.tasks.lci_viability_service import (
    get_lci_track_pm_list,
    get_tasks_for_lci,
    get_cancellation_justifications,
    save_group_status,
    SaveGroupRequest,
    normalize_group_statuses,
)
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
bearer_scheme = HTTPBearer()


# ─── Dependency ───────────────────────────────────────────────────────────────

def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def _is_manager(payload: dict) -> bool:
    return any(r.upper() in {"ADMIN", "MANAGER"} for r in payload.get("roles", []))


# ─── Request schemas ──────────────────────────────────────────────────────────

class FilterRequest(BaseModel):
    owner_names: Optional[List[str]] = None
    task_type_names: Optional[List[str]] = None
    client_names: Optional[List[str]] = None
    ws_list: Optional[List[str]] = None
    tracks: Optional[List[str]] = None
    deal_ids: Optional[List[str]] = None
    status_names: Optional[List[str]] = None
    task_ids: Optional[List[int]] = None


class UpdateTaskRequest(BaseModel):
    data: Dict[str, Any]
    history: Optional[Dict[str, Any]] = None


class UpdateActivityRequest(BaseModel):
    data: Dict[str, Any]


class AddHistoryRequest(BaseModel):
    taskrecord_task_id: int
    taskrecord_activity_id: Optional[int] = 0
    taskrecord_remark: str
    taskrecord_type: Optional[str] = "INFO"
    taskrecord_status: Optional[str] = None
    taskrecord_next_followup: Optional[str] = None
    taskrecord_updated_by: Optional[str] = None


# ─── Overview & KPI (existing) ────────────────────────────────────────────────

@router.get("/overview", response_model=TaskOverviewResponse)
def task_overview(current_user: Annotated[dict, Depends(get_current_user)]):
    user_id = int(current_user.get("sub", 0))
    is_mgr = _is_manager(current_user)
    return get_task_overview(user_id=user_id, is_manager=is_mgr)


@router.get("/kpi", response_model=TaskKPISummary)
def task_kpi(current_user: Annotated[dict, Depends(get_current_user)]):
    user_id = int(current_user.get("sub", 0))
    is_mgr = _is_manager(current_user)
    return get_task_kpi_summary(user_id=user_id, is_manager=is_mgr)


@router.get("/action-queue", response_model=List[Dict[str, Any]])
def task_action_queue(
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: int = 10,
):
    user_id = int(current_user.get("sub", 0))
    is_mgr = _is_manager(current_user)
    return get_task_action_queue(user_id=user_id, is_manager=is_mgr, limit=limit)


# ─── Filter options & Filter tasks ───────────────────────────────────────────

@router.get("/filter-options", response_model=Dict[str, List[Any]])
def task_filter_options(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns dynamic filter options from vwFilterTask."""
    return get_filter_options()


@router.post("/filter", response_model=List[Dict[str, Any]])
def task_filter(
    current_user: Annotated[dict, Depends(get_current_user)],
    body: FilterRequest,
):
    """Applies cascading filters and returns matching tasks from vwTask."""
    return filter_tasks(
        owner_names=body.owner_names,
        task_type_names=body.task_type_names,
        client_names=body.client_names,
        ws_list=body.ws_list,
        tracks=body.tracks,
        deal_ids=body.deal_ids,
        status_names=body.status_names,
        task_ids=body.task_ids,
    )


# ─── Support lists ───────────────────────────────────────────────────────────

@router.get("/csm-list", response_model=List[Dict[str, Any]])
def task_csm_list(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns active CSMs for owner/temp_owner dropdowns."""
    return get_csm_list()


@router.get("/status-types", response_model=List[Dict[str, Any]])
def task_status_types(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns available status types."""
    return get_status_types()


# ─── Task Detail ─────────────────────────────────────────────────────────────

@router.get("/follow-up", response_model=Dict[str, List[Dict[str, Any]]])
def task_follow_up(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns follow-ups grouped by: delayed, today, current_week, next_week."""
    user_id = int(current_user.get("sub", 0))
    is_mgr = _is_manager(current_user)
    return get_next_follow_up(user_id=user_id, is_manager=is_mgr)


@router.get("/detail/{task_id}", response_model=Dict[str, Any])
def task_detail(
    task_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns full task detail from vwTask."""
    result = get_task_detail(task_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return result


@router.put("/detail/{task_id}", response_model=Dict[str, Any])
def task_update(
    task_id: int,
    body: UpdateTaskRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Updates task fields and optionally inserts history record."""
    success = update_task(task_id=task_id, data=body.data)
    history_id = 0
    if body.history:
        body.history["taskrecord_task_id"] = task_id
        body.history.setdefault("taskrecord_activity_id", 0)
        body.history.setdefault("taskrecord_updated_by", current_user.get("user_name", ""))
        history_id = add_task_history(body.history)

    return {"success": success, "history_id": history_id}


# ─── Task Activities ──────────────────────────────────────────────────────────

@router.get("/detail/{task_id}/activities", response_model=List[Dict[str, Any]])
def task_activities(
    task_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns activities for a given task."""
    return get_task_activities(task_id)


# ─── Task History ─────────────────────────────────────────────────────────────

@router.get("/detail/{task_id}/history", response_model=List[Dict[str, Any]])
def task_history(
    task_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    activity_id: Optional[int] = Query(None),
):
    """Returns history records for a task (optionally filtered by activity)."""
    return get_task_history(task_id=task_id, activity_id=activity_id)


@router.post("/detail/{task_id}/history", response_model=Dict[str, Any])
def task_add_history(
    task_id: int,
    body: AddHistoryRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Adds a history/note record to a task."""
    record = {
        "taskrecord_task_id": task_id,
        "taskrecord_activity_id": body.taskrecord_activity_id or 0,
        "taskrecord_remark": body.taskrecord_remark,
        "taskrecord_type": body.taskrecord_type or "INFO",
        "taskrecord_updated_by": body.taskrecord_updated_by or current_user.get("user_name", ""),
    }
    if body.taskrecord_status:
        record["taskrecord_status"] = body.taskrecord_status
    if body.taskrecord_next_followup:
        record["taskrecord_next_followup"] = body.taskrecord_next_followup

    new_id = add_task_history(record)
    return {"success": new_id > 0, "record_id": new_id}


# ─── LCI Viability endpoints ────────────────────────────────────────────────

class SaveGroupStatusRequest(BaseModel):
    group_tasks: List[Dict[str, Any]]
    new_statuses: Dict[int, str]
    cancellation_justification: Optional[str] = None


@router.get("/lci-viability/list", response_model=List[Dict[str, Any]])
def lci_viability_list(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns vwCustomerCiscoLCITrackProjectPM data."""
    return get_lci_track_pm_list()


@router.get("/lci-viability/tasks", response_model=List[Dict[str, Any]])
def lci_viability_tasks(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: int = Query(...),
    track: str = Query(...),
):
    """Returns tasks grouped by Track|PartyID for a given LCI record."""
    return get_tasks_for_lci(customer_id=customer_id, track=track)


@router.get("/lci-viability/justifications", response_model=List[str])
def lci_viability_justifications(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns valid cancellation justifications."""
    return get_cancellation_justifications()


@router.post("/lci-viability/normalize", response_model=Dict[str, Any])
def lci_viability_normalize(
    current_user: Annotated[dict, Depends(get_current_user)],
    status_map: Dict[int, str],
):
    """Returns normalized status map based on business rules."""
    return {"normalized": normalize_group_statuses(status_map)}


@router.post("/lci-viability/save-group", response_model=Dict[str, Any])
def lci_viability_save_group(
    current_user: Annotated[dict, Depends(get_current_user)],
    body: SaveGroupStatusRequest,
):
    """Saves status changes for a group of tasks with history."""
    user_name = current_user.get("user_name", "")
    req = SaveGroupRequest(
        group_tasks=body.group_tasks,
        new_statuses=body.new_statuses,
        cancellation_justification=body.cancellation_justification,
        user_name=user_name,
    )
    return save_group_status(req)


# ─── Activity endpoints ───────────────────────────────────────────────────────

@router.get("/activities/{activity_id}", response_model=Dict[str, Any])
def activity_detail(
    activity_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns single activity detail."""
    result = get_activity_detail(activity_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Activity {activity_id} not found")
    return result


@router.put("/activities/{activity_id}", response_model=Dict[str, Any])
def activity_update(
    activity_id: int,
    body: UpdateActivityRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Updates activity fields in tbTaskActivity."""
    success = update_activity(activity_id=activity_id, data=body.data)
    return {"success": success}
