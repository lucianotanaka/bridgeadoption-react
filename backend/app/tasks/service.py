"""
Task Service — business logic layer.
Usa TaskRepository e TaskActivityRepository do Streamlit (Z:/bridgeadoption/src/).
"""
import sys
import os
import logging
import traceback
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────
# Adiciona /opt/bridgeadoption ao PYTHONPATH
# para reutilizar os repositórios do Streamlit
# ─────────────────────────────────────────
_STREAMLIT_ROOT = os.environ.get("STREAMLIT_ROOT", "/opt/bridgeadoption")

# Tenta múltiplos caminhos possíveis
_CANDIDATE_PATHS = [
    _STREAMLIT_ROOT,
    "/opt/bridgeadoption",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")),
]

for _path in _CANDIDATE_PATHS:
    if _path and _path not in sys.path and os.path.isdir(os.path.join(_path, "src")):
        sys.path.insert(0, _path)
        logger.info(f"TaskService: adicionado ao sys.path: {_path}")
        break

try:
    from src.infrastructure.database.repositories.task_repository import TaskRepository
    from src.infrastructure.database.repositories.task_activity_repository import TaskActivityRepository
    _REPOS_AVAILABLE = True
    logger.info("TaskRepository disponível.")
except ImportError as e:
    logger.warning(f"TaskRepository não disponível: {e}")
    _REPOS_AVAILABLE = False


# ─────────────────────────────────────────
# CLOSED STATUS IDs (não aparecem no dashboard)
# ─────────────────────────────────────────
CLOSED_STATUS_IDS = {4, 5, 6, 10}


def _safe_float(v, default: float = 0.0) -> float:
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _safe_int(v, default: int = 0) -> int:
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def _safe_str(v, default: str = "") -> str:
    return str(v).upper() if v is not None else default


def _to_date(v) -> Optional[date]:
    """Converte valor para date de forma segura."""
    if v is None:
        return None
    if isinstance(v, date):
        return v
    try:
        import pandas as pd
        dt = pd.to_datetime(v, errors="coerce")
        if dt is not None and str(dt) != "NaT":
            return dt.date()
    except Exception:
        pass
    return None


def _serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Serializa um dict de DB convertendo datas para string ISO."""
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


# ─────────────────────────────────────────
# OVERVIEW DATA
# ─────────────────────────────────────────

def get_task_overview(
    user_id: int,
    is_manager: bool,
) -> Dict[str, Any]:
    """
    Retorna tasks + values para o overview.
    Espelha task_overview.py: show_task_overview()
    Enriquece cada task com task_value_brl / task_value_usd do rollup de valores.
    """
    if not _REPOS_AVAILABLE:
        return {"tasks": [], "values": []}

    try:
        task_repo = TaskRepository()

        owner_id = None if is_manager else user_id

        task_rows = task_repo.get_task_dashboard(owner_id=owner_id, as_df=False)
        value_rows = task_repo.get_task_value_rollup(owner_id=owner_id, as_df=False)

        # Build value map — same logic as action queue
        value_map: Dict[int, Dict] = {}
        for v in (value_rows or []):
            tid = _safe_int(v.get("task_id"))
            if tid:
                value_map[tid] = {
                    "brl": max(
                        _safe_float(v.get("task_value_effective_brl")),
                        _safe_float(v.get("task_value_sum_brl")),
                    ),
                    "usd": max(
                        _safe_float(v.get("task_value_effective_usd")),
                        _safe_float(v.get("task_value_sum_usd")),
                    ),
                }

        tasks = []
        for r in (task_rows or []):
            row = _serialize_row(dict(r))
            tid = _safe_int(r.get("task_id"))
            if tid in value_map:
                row["task_value_brl"] = value_map[tid]["brl"]
                row["task_value_usd"] = value_map[tid]["usd"]
            else:
                row["task_value_brl"] = row.get("task_value_brl") or 0.0
                row["task_value_usd"] = row.get("task_value_usd") or 0.0
            tasks.append(row)

        values = [_serialize_row(dict(r)) for r in (value_rows or [])]

        return {"tasks": tasks, "values": values}

    except Exception as e:
        logger.error(f"get_task_overview error: {e}\n{traceback.format_exc()}")
        return {"tasks": [], "values": []}


# ─────────────────────────────────────────
# KPI SUMMARY
# ─────────────────────────────────────────

def get_task_kpi_summary(
    user_id: int,
    is_manager: bool,
) -> Dict[str, Any]:
    """
    Calcula KPIs do painel de monitoramento.
    Espelha a lógica do monitoring panel em task_overview.py.
    """
    if not _REPOS_AVAILABLE:
        return _empty_kpi()

    try:
        task_repo = TaskRepository()
        activity_repo = TaskActivityRepository()

        owner_id = None if is_manager else user_id
        today = date.today()
        next_7 = today + timedelta(days=7)

        task_rows = task_repo.get_task_dashboard(owner_id=owner_id, as_df=False) or []
        act_rows = activity_repo.get_task_activity_dashboard(owner_id=owner_id, as_df=False) or []

        # Filter active tasks
        active = [
            r for r in task_rows
            if _safe_int(r.get("task_status_id")) not in CLOSED_STATUS_IDS
        ]

        total_active = len(active)
        n1 = sum(1 for r in active if _safe_str(r.get("critical_level")) == "N1")
        n2 = sum(1 for r in active if _safe_str(r.get("critical_level")) == "N2")

        fu_today = 0
        fu_7d = 0
        planned_overdue = 0
        open_count = 0
        inprog_count = 0
        onhold_count = 0
        high = 0
        medium = 0
        low = 0
        revenue_tasks = 0
        expense_tasks = 0
        service_impact = 0
        revenue_brl = 0.0
        revenue_usd = 0.0
        expense_brl = 0.0
        expense_usd = 0.0

        active_task_ids = set()

        for r in active:
            task_id = _safe_int(r.get("task_id"))
            if task_id:
                active_task_ids.add(task_id)

            status_id = _safe_int(r.get("task_status_id"))
            if status_id == 1:
                open_count += 1
            elif status_id == 3:
                onhold_count += 1
            else:
                inprog_count += 1

            nfu = _to_date(r.get("next_followup_any_effective"))
            if nfu:
                if nfu <= today:
                    fu_today += 1
                if nfu <= next_7:
                    fu_7d += 1

            task_end = _to_date(r.get("task_end"))
            completed = _safe_float(r.get("task_completed"), 0.0)
            if completed <= 1.5:
                completed *= 100
            if task_end and task_end < today and completed < 100:
                planned_overdue += 1

            pr = _safe_str(r.get("task_priority"))
            if pr == "HIGH":
                high += 1
            elif pr == "MEDIUM":
                medium += 1
            else:
                low += 1

            fin = _safe_str(r.get("task_finance_type"))
            brl = _safe_float(r.get("task_value_effective_brl"))
            usd = _safe_float(r.get("task_value_effective_usd"))
            if fin == "REVENUE":
                revenue_tasks += 1
                revenue_brl += brl
                revenue_usd += usd
            elif fin == "EXPENSE":
                expense_tasks += 1
                expense_brl += brl
                expense_usd += usd

            if _safe_int(r.get("is_service_impacting")) == 1:
                service_impact += 1

        # Activity overdue tasks
        activity_overdue_tasks = 0
        act_active = [
            r for r in act_rows
            if _safe_int(r.get("activity_task_id")) in active_task_ids
        ]
        overdue_task_ids = set()
        for r in act_active:
            act_end = _to_date(r.get("activity_end_performed")) or _to_date(r.get("activity_end"))
            if act_end and act_end < today:
                tid = _safe_int(r.get("activity_task_id"))
                if tid:
                    overdue_task_ids.add(tid)
        activity_overdue_tasks = len(overdue_task_ids)

        return {
            "total_active": total_active,
            "n1_critical": n1,
            "n2_critical": n2,
            "follow_up_today": fu_today,
            "follow_up_next_7d": fu_7d,
            "planned_overdue": planned_overdue,
            "activity_overdue_tasks": activity_overdue_tasks,
            "open_count": open_count,
            "inprogress_count": inprog_count,
            "onhold_count": onhold_count,
            "high_priority": high,
            "medium_priority": medium,
            "low_priority": low,
            "revenue_tasks": revenue_tasks,
            "expense_tasks": expense_tasks,
            "service_impact_tasks": service_impact,
            "revenue_brl": round(revenue_brl, 2),
            "revenue_usd": round(revenue_usd, 2),
            "expense_brl": round(expense_brl, 2),
            "expense_usd": round(expense_usd, 2),
        }

    except Exception as e:
        logger.error(f"get_task_kpi_summary error: {e}\n{traceback.format_exc()}")
        return _empty_kpi()


def _empty_kpi() -> Dict[str, Any]:
    return {
        "total_active": 0, "n1_critical": 0, "n2_critical": 0,
        "follow_up_today": 0, "follow_up_next_7d": 0, "planned_overdue": 0,
        "activity_overdue_tasks": 0, "open_count": 0, "inprogress_count": 0,
        "onhold_count": 0, "high_priority": 0, "medium_priority": 0,
        "low_priority": 0, "revenue_tasks": 0, "expense_tasks": 0,
        "service_impact_tasks": 0, "revenue_brl": 0.0, "revenue_usd": 0.0,
        "expense_brl": 0.0, "expense_usd": 0.0,
    }


# ─────────────────────────────────────────
# ACTION QUEUE (fila crítica)
# ─────────────────────────────────────────

def get_task_action_queue(
    user_id: int,
    is_manager: bool,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Retorna a fila de ações críticas ordenada por score.
    Espelha o cálculo _score() do task_overview.py.
    """
    if not _REPOS_AVAILABLE:
        return []

    try:
        task_repo = TaskRepository()
        owner_id = None if is_manager else user_id
        today = date.today()

        task_rows = task_repo.get_task_dashboard(owner_id=owner_id, as_df=False) or []
        value_rows = task_repo.get_task_value_rollup(owner_id=owner_id, as_df=False) or []

        # Build value map
        value_map: Dict[int, Dict] = {}
        for v in value_rows:
            tid = _safe_int(v.get("task_id"))
            if tid:
                value_map[tid] = {
                    "brl": max(
                        _safe_float(v.get("task_value_effective_brl")),
                        _safe_float(v.get("task_value_sum_brl")),
                    ),
                    "usd": max(
                        _safe_float(v.get("task_value_effective_usd")),
                        _safe_float(v.get("task_value_sum_usd")),
                    ),
                }

        active = [
            r for r in task_rows
            if _safe_int(r.get("task_status_id")) not in CLOSED_STATUS_IDS
        ]

        scored = []
        for r in active:
            s = 0
            lvl = _safe_str(r.get("critical_level"))
            if lvl == "N1":
                s += 100
            elif lvl == "N2":
                s += 60
            elif lvl == "N3":
                s += 30

            nfu = _to_date(r.get("next_followup_any_effective"))
            if nfu and nfu <= today:
                s += 40

            task_end = _to_date(r.get("task_end"))
            completed = _safe_float(r.get("task_completed"), 0.0)
            if completed <= 1.5:
                completed *= 100
            if task_end and task_end < today and completed < 100:
                s += 30

            pr = _safe_str(r.get("task_priority"))
            if pr == "HIGH":
                s += 10
            elif pr == "MEDIUM":
                s += 5

            if _safe_str(r.get("task_finance_type")) == "EXPENSE":
                s += 8

            if s >= 40:
                row = _serialize_row(dict(r))
                tid = _safe_int(r.get("task_id"))
                if tid in value_map:
                    row["task_value_brl"] = value_map[tid]["brl"]
                    row["task_value_usd"] = value_map[tid]["usd"]
                else:
                    row["task_value_brl"] = 0.0
                    row["task_value_usd"] = 0.0
                row["__score"] = s
                scored.append(row)

        scored.sort(key=lambda x: x["__score"], reverse=True)
        return scored[:limit]

    except Exception as e:
        logger.error(f"get_task_action_queue error: {e}\n{traceback.format_exc()}")
        return []
