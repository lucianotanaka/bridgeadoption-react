"""
Task Service — business logic layer.
Usa TaskRepository e TaskActivityRepository do Streamlit (Z:/bridgeadoption/src/).

Performance:
  - Cached data fetchers (_fetch_task_dashboard, _fetch_task_value_rollup,
    _fetch_task_activity_dashboard) com TTL de 2 minutos por owner_id.
  - Unified endpoint (get_task_dashboard_unified) executa cada query uma
    única vez e retorna KPI + overview + action_queue no mesmo payload.
  - _serialize_row() usa math.isnan() ao invés de pd.isna() para valores float,
    evitando milhares de chamadas desnecessárias ao pandas.
"""
import sys
import os
import math
import logging
import threading
import traceback
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────
# Adiciona /opt/bridgeadoption ao PYTHONPATH
# ─────────────────────────────────────────
_STREAMLIT_ROOT = os.environ.get("STREAMLIT_ROOT", "/opt/bridgeadoption")

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
# TTL CACHE (2 minutos por owner_id)
# ─────────────────────────────────────────
try:
    from cachetools import TTLCache
    _CACHE_AVAILABLE = True
except ImportError:
    _CACHE_AVAILABLE = False
    logger.warning("cachetools não disponível — cache desabilitado. Instale: pip install cachetools")

_CACHE_TTL = 120  # segundos

if _CACHE_AVAILABLE:
    _dashboard_cache: TTLCache = TTLCache(maxsize=64, ttl=_CACHE_TTL)
    _value_cache:     TTLCache = TTLCache(maxsize=64, ttl=_CACHE_TTL)
    _activity_cache:  TTLCache = TTLCache(maxsize=64, ttl=_CACHE_TTL)
else:
    _dashboard_cache = {}  # type: ignore
    _value_cache     = {}  # type: ignore
    _activity_cache  = {}  # type: ignore

_cache_lock = threading.RLock()

# ─────────────────────────────────────────
# CLOSED STATUS IDs
# ─────────────────────────────────────────
CLOSED_STATUS_IDS = {4, 5, 6, 10}


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

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
    """
    Serializa um dict de DB convertendo datas para string ISO.
    Usa math.isnan() para floats ao invés de pd.isna() para cada valor,
    evitando overhead desnecessário do pandas.
    """
    result = {}
    for k, v in row.items():
        if v is None:
            result[k] = None
        elif hasattr(v, "isoformat"):
            # datetime, date, pandas Timestamp
            result[k] = v.isoformat()
        elif isinstance(v, float) and math.isnan(v):
            result[k] = None
        else:
            result[k] = v
    return result


# ─────────────────────────────────────────
# CACHED DATA FETCHERS
# Cada fetcher executa a query apenas uma vez por (owner_id, TTL).
# Requisições subsequentes dentro do TTL retornam o cache em memória.
# ─────────────────────────────────────────

def _fetch_task_dashboard(owner_id: Optional[int]) -> List[Dict]:
    """Retorna vwTaskDashboard com cache TTL de 2 minutos por owner_id."""
    cache_key = f"dash:{owner_id}"
    with _cache_lock:
        if cache_key in _dashboard_cache:
            return _dashboard_cache[cache_key]

    if not _REPOS_AVAILABLE:
        return []

    try:
        repo = TaskRepository()
        data = repo.get_task_dashboard(owner_id=owner_id, as_df=False) or []
        with _cache_lock:
            _dashboard_cache[cache_key] = data
        return data
    except Exception as e:
        logger.error(f"_fetch_task_dashboard error: {e}")
        return []


def _fetch_task_value_rollup(owner_id: Optional[int]) -> List[Dict]:
    """Retorna vwTaskValueRollup com cache TTL de 2 minutos por owner_id."""
    cache_key = f"value:{owner_id}"
    with _cache_lock:
        if cache_key in _value_cache:
            return _value_cache[cache_key]

    if not _REPOS_AVAILABLE:
        return []

    try:
        repo = TaskRepository()
        data = repo.get_task_value_rollup(owner_id=owner_id, as_df=False) or []
        with _cache_lock:
            _value_cache[cache_key] = data
        return data
    except Exception as e:
        logger.error(f"_fetch_task_value_rollup error: {e}")
        return []


def _fetch_task_activity_dashboard(owner_id: Optional[int]) -> List[Dict]:
    """Retorna vwTaskActivityDashboard com cache TTL de 2 minutos por owner_id."""
    cache_key = f"act:{owner_id}"
    with _cache_lock:
        if cache_key in _activity_cache:
            return _activity_cache[cache_key]

    if not _REPOS_AVAILABLE:
        return []

    try:
        repo = TaskActivityRepository()
        data = repo.get_task_activity_dashboard(owner_id=owner_id, as_df=False) or []
        with _cache_lock:
            _activity_cache[cache_key] = data
        return data
    except Exception as e:
        logger.error(f"_fetch_task_activity_dashboard error: {e}")
        return []


def _build_value_map(value_rows: List[Dict]) -> Dict[int, Dict]:
    """Constrói mapa task_id -> {brl, usd} a partir de vwTaskValueRollup."""
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
    return value_map


# ─────────────────────────────────────────
# PURE COMPUTATION HELPERS
# Recebem dados já carregados (sem acessar DB).
# ─────────────────────────────────────────

def _compute_kpi(
    task_rows: List[Dict],
    act_rows: List[Dict],
    value_map: Dict[int, Dict],
) -> Dict[str, Any]:
    """Calcula KPIs a partir de dados já carregados em memória."""
    today = date.today()
    next_7 = today + timedelta(days=7)

    active = [
        r for r in task_rows
        if _safe_int(r.get("task_status_id")) not in CLOSED_STATUS_IDS
    ]

    total_active = len(active)
    n1 = n2 = fu_today = fu_7d = planned_overdue = 0
    open_count = inprog_count = onhold_count = 0
    high = medium = low = 0
    revenue_tasks = expense_tasks = service_impact = 0
    revenue_brl = revenue_usd = expense_brl = expense_usd = 0.0

    active_task_ids: set = set()

    for r in active:
        task_id = _safe_int(r.get("task_id"))
        if task_id:
            active_task_ids.add(task_id)

        lvl = _safe_str(r.get("critical_level"))
        if lvl == "N1":
            n1 += 1
        elif lvl == "N2":
            n2 += 1

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
    overdue_task_ids: set = set()
    for r in act_rows:
        if _safe_int(r.get("activity_task_id")) not in active_task_ids:
            continue
        act_end = _to_date(r.get("activity_end_performed")) or _to_date(r.get("activity_end"))
        if act_end and act_end < today:
            tid = _safe_int(r.get("activity_task_id"))
            if tid:
                overdue_task_ids.add(tid)

    return {
        "total_active": total_active,
        "n1_critical": n1,
        "n2_critical": n2,
        "follow_up_today": fu_today,
        "follow_up_next_7d": fu_7d,
        "planned_overdue": planned_overdue,
        "activity_overdue_tasks": len(overdue_task_ids),
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


def _compute_overview(task_rows: List[Dict], value_map: Dict[int, Dict]) -> Dict[str, Any]:
    """Constrói o payload de overview enriquecido com task_value_brl/usd."""
    tasks = []
    for r in task_rows:
        row = _serialize_row(dict(r))
        tid = _safe_int(r.get("task_id"))
        if tid in value_map:
            row["task_value_brl"] = value_map[tid]["brl"]
            row["task_value_usd"] = value_map[tid]["usd"]
        else:
            row["task_value_brl"] = row.get("task_value_brl") or 0.0
            row["task_value_usd"] = row.get("task_value_usd") or 0.0
        tasks.append(row)
    return {"tasks": tasks, "values": []}


def _compute_action_queue(
    task_rows: List[Dict],
    value_map: Dict[int, Dict],
    limit: int = 10,
) -> List[Dict]:
    """Calcula action queue ordenada por score de prioridade."""
    today = date.today()
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


# ─────────────────────────────────────────
# PUBLIC API — mantém assinatura original dos endpoints existentes
# Agora usa cached fetchers + pure computation helpers.
# ─────────────────────────────────────────

def get_task_overview(user_id: int, is_manager: bool) -> Dict[str, Any]:
    """Retorna tasks + values para o overview. Usa cache de 2 min."""
    if not _REPOS_AVAILABLE:
        return {"tasks": [], "values": []}
    try:
        owner_id = None if is_manager else user_id
        task_rows = _fetch_task_dashboard(owner_id)
        value_rows = _fetch_task_value_rollup(owner_id)
        value_map = _build_value_map(value_rows)
        return _compute_overview(task_rows, value_map)
    except Exception as e:
        logger.error(f"get_task_overview error: {e}\n{traceback.format_exc()}")
        return {"tasks": [], "values": []}


def get_task_kpi_summary(user_id: int, is_manager: bool) -> Dict[str, Any]:
    """Calcula KPIs do painel de monitoramento. Usa cache de 2 min."""
    if not _REPOS_AVAILABLE:
        return _empty_kpi()
    try:
        owner_id = None if is_manager else user_id
        task_rows = _fetch_task_dashboard(owner_id)
        act_rows  = _fetch_task_activity_dashboard(owner_id)
        value_rows = _fetch_task_value_rollup(owner_id)
        value_map = _build_value_map(value_rows)
        return _compute_kpi(task_rows, act_rows, value_map)
    except Exception as e:
        logger.error(f"get_task_kpi_summary error: {e}\n{traceback.format_exc()}")
        return _empty_kpi()


def get_task_action_queue(user_id: int, is_manager: bool, limit: int = 10) -> List[Dict[str, Any]]:
    """Retorna fila de ações críticas ordenada por score. Usa cache de 2 min."""
    if not _REPOS_AVAILABLE:
        return []
    try:
        owner_id = None if is_manager else user_id
        task_rows  = _fetch_task_dashboard(owner_id)
        value_rows = _fetch_task_value_rollup(owner_id)
        value_map  = _build_value_map(value_rows)
        return _compute_action_queue(task_rows, value_map, limit)
    except Exception as e:
        logger.error(f"get_task_action_queue error: {e}\n{traceback.format_exc()}")
        return []


def get_task_dashboard_unified(
    user_id: int,
    is_manager: bool,
    action_queue_limit: int = 10,
) -> Dict[str, Any]:
    """
    NOVO endpoint unificado — retorna KPI + overview + action_queue
    em um único payload, executando cada query UMA ÚNICA VEZ
    (beneficia de cache TTL 2min).

    Substitui as 3 chamadas paralelas: /kpi + /action-queue + /overview
    """
    if not _REPOS_AVAILABLE:
        return {"kpi": _empty_kpi(), "overview": {"tasks": [], "values": []}, "action_queue": []}
    try:
        owner_id = None if is_manager else user_id

        # Cada fetcher é cacheado — chamadas subsequentes são instantâneas
        task_rows  = _fetch_task_dashboard(owner_id)
        value_rows = _fetch_task_value_rollup(owner_id)
        act_rows   = _fetch_task_activity_dashboard(owner_id)

        value_map = _build_value_map(value_rows)

        kpi          = _compute_kpi(task_rows, act_rows, value_map)
        overview     = _compute_overview(task_rows, value_map)
        action_queue = _compute_action_queue(task_rows, value_map, action_queue_limit)

        return {"kpi": kpi, "overview": overview, "action_queue": action_queue}

    except Exception as e:
        logger.error(f"get_task_dashboard_unified error: {e}\n{traceback.format_exc()}")
        return {"kpi": _empty_kpi(), "overview": {"tasks": [], "values": []}, "action_queue": []}


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
