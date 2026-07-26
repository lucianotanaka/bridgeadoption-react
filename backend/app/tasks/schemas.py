"""
Schemas Pydantic para o módulo Tasks.
Espelha as colunas das views vwTaskDashboard, vwTaskValueRollup, vwTask.
"""
from typing import Any, List, Optional
from pydantic import BaseModel


# ─────────────────────────────────────────
# DASHBOARD (vwTaskDashboard)
# ─────────────────────────────────────────

class TaskDashboardItem(BaseModel):
    task_id: Optional[int] = None
    task_owner_id: Optional[int] = None
    task_owner_name: Optional[str] = None
    task_customer_id: Optional[int] = None
    task_customer_name: Optional[str] = None
    task_type_id: Optional[int] = None
    task_type_name: Optional[str] = None
    task_status_id: Optional[int] = None
    task_status_name: Optional[str] = None
    task_priority: Optional[str] = None
    task_start: Optional[Any] = None
    task_end: Optional[Any] = None
    task_start_performed: Optional[Any] = None
    task_end_performed: Optional[Any] = None
    task_created_in: Optional[Any] = None
    task_completed: Optional[float] = None
    task_deal_id: Optional[str] = None
    task_ws: Optional[str] = None
    task_track: Optional[str] = None
    task_subtrack: Optional[str] = None
    task_finance_type: Optional[str] = None
    task_for_team: Optional[str] = None
    is_service_impacting: Optional[int] = None
    critical_level: Optional[str] = None
    critical_reason: Optional[str] = None
    next_followup_any_effective: Optional[Any] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────
# VALUE ROLLUP (vwTaskValueRollup)
# ─────────────────────────────────────────

class TaskValueRollupItem(BaseModel):
    task_id: Optional[int] = None
    task_value_sum_brl: Optional[float] = None
    task_value_sum_usd: Optional[float] = None
    task_value_effective_brl: Optional[float] = None
    task_value_effective_usd: Optional[float] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────
# OVERVIEW RESPONSE (agregado)
# ─────────────────────────────────────────

class TaskOverviewResponse(BaseModel):
    tasks: List[dict]
    values: List[dict]


# ─────────────────────────────────────────
# KPI SUMMARY
# ─────────────────────────────────────────

class TaskKPISummary(BaseModel):
    total_active: int
    n1_critical: int
    n2_critical: int
    follow_up_today: int
    follow_up_next_7d: int
    planned_overdue: int
    activity_overdue_tasks: int
    open_count: int
    inprogress_count: int
    onhold_count: int
    high_priority: int
    medium_priority: int
    low_priority: int
    revenue_tasks: int
    expense_tasks: int
    service_impact_tasks: int
    revenue_brl: float
    revenue_usd: float
    expense_brl: float
    expense_usd: float
