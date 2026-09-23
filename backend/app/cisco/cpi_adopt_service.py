"""
CPI Adopt Service — lógica de negócio do CPI Adopt Report.

A camada de dados executa a query diretamente via repositório
seguindo o padrão do restante do projeto.

O summary executivo foi remodelado para refletir o funil do CPI Adopt:
    - Potential
    - Claim Approved
    - Paid
    - Lost
    - At Risk
    - Pipeline
"""
import logging
import math
import threading
from typing import Any, Dict, List, Optional, Tuple

from src.infrastructure.database.repositories.cisco_lci_repository import CiscoLCIRepository

logger = logging.getLogger(__name__)

try:
    from cachetools import TTLCache

    _CACHE_OK = True
except ImportError:
    _CACHE_OK = False

_CPI_CACHE_TTL = 300  # 5 minutos
_cpi_cache: Any = TTLCache(maxsize=4, ttl=_CPI_CACHE_TTL) if _CACHE_OK else {}
_cpi_cache_lock = threading.RLock()

_repo = CiscoLCIRepository()


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────


def _safe_float(v) -> float:
    try:
        if v is None:
            return 0.0
        f = float(v)
        return 0.0 if math.isnan(f) else f
    except (TypeError, ValueError):
        return 0.0


def _safe_int(v) -> int:
    try:
        if v is None:
            return 0
        return int(v)
    except (TypeError, ValueError):
        return 0


def _normalize_percent(v: Any) -> float:
    n = _safe_float(v)
    if 0 <= n <= 1:
        n *= 100
    return max(0.0, min(100.0, n))


def _serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Converte datas para ISO string e limpa valores None/NaN."""
    result: Dict[str, Any] = {}
    for k, v in row.items():
        if v is None:
            result[k] = None
        elif hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        else:
            try:
                if isinstance(v, float) and math.isnan(v):
                    result[k] = None
                    continue
            except Exception:
                pass
            result[k] = v
    return result


def _norm_text(v: Any) -> str:
    return str(v or "").strip().lower()


def _is_opt_in(value: Any) -> bool:
    v = _norm_text(value)
    return v in {"opt in", "opted in", "yes"}


def _is_opt_out(value: Any) -> bool:
    v = _norm_text(value)
    return v in {"opt out", "opted out"}


def _is_pending(value: Any) -> bool:
    return _norm_text(value) == "pending"


def _is_positive_project(value: Any) -> bool:
    v = _norm_text(value)
    return v not in {"", "no", "none", "null"}


def _timeline_pct(row: Dict[str, Any]) -> float:
    return _normalize_percent(
        row.get("time_elapsed_pct")
        if row.get("time_elapsed_pct") is not None
        else row.get("time_elapsed %")
    )


def _progress_pct(row: Dict[str, Any]) -> float:
    return _normalize_percent(
        row.get("task_completed")
        if row.get("task_completed") is not None
        else row.get("task_completed_pct")
    )


def _is_claim_approved(row: Dict[str, Any]) -> bool:
    return _safe_float(row.get("claim_approved_amount_usd")) > 0


def _is_paid(row: Dict[str, Any]) -> bool:
    return _safe_float(row.get("payment_approved_amount_usd")) > 0


def _status_justification(row: Dict[str, Any]) -> str:
    return str(row.get("task_status_justification") or "").strip()


def _is_potential_candidate(row: Dict[str, Any]) -> bool:
    opt = row.get("opt_in_status") or row.get("opt_in")
    return _is_pending(opt) or _is_opt_in(opt) or _is_opt_out(opt)


def _group_key(row: Dict[str, Any]) -> Tuple[str, str]:
    return (
        str(row.get("cr_party_id") or "").strip(),
        str(row.get("solution") or "").strip(),
    )


def _task_is_expired(row: Dict[str, Any]) -> bool:
    if row.get("task_is_expired_without_completion") is not None:
        return bool(_safe_int(row.get("task_is_expired_without_completion")))
    return _safe_int(row.get("days_remaining")) < 0


def _has_child_activities(row: Dict[str, Any]) -> bool:
    if row.get("has_child_activities") is not None:
        return bool(_safe_int(row.get("has_child_activities")))
    return len(row.get("stages") or []) > 0


def _expired_open_activity_amount(row: Dict[str, Any]) -> float:
    explicit = _safe_float(row.get("expired_open_activity_amount_usd"))
    if explicit > 0:
        return explicit

    total = 0.0
    for stage in row.get("stages") or []:
        status = _norm_text(stage.get("activity_status") or stage.get("stage_status") or stage.get("status"))
        end_performed = stage.get("activity_end_performed")
        end = stage.get("activity_end") or stage.get("stage_end") or stage.get("end_date")
        if status in {"cancelled", "canceled", "completed/closed", "completed", "closed"}:
            continue
        if end_performed:
            continue
        if end:
            total += _safe_float(stage.get("activity_value"))
    return total


def _all_activities_cancelled_or_expired(row: Dict[str, Any]) -> bool:
    explicit = row.get("task_all_activities_cancelled_or_expired")
    if explicit is not None:
        return bool(_safe_int(explicit))

    stages = row.get("stages") or []
    if not stages:
        return False

    for stage in stages:
        status = _norm_text(stage.get("activity_status") or stage.get("stage_status") or stage.get("status"))
        end_performed = stage.get("activity_end_performed")
        if end_performed:
            return False
        if status not in {"cancelled", "canceled", "expired"}:
            return False
    return True


def _is_lost(row: Dict[str, Any], is_potential: bool) -> bool:
    if not is_potential:
        return False

    opt = row.get("opt_in_status") or row.get("opt_in")
    justification = _status_justification(row)

    if _is_opt_out(opt) and justification != "OPT OUT: OPTED IN FOR ANOTHER WS":
        return True

    if _has_child_activities(row) and _expired_open_activity_amount(row) > 0:
        return True

    if _is_pending(opt) and not _has_child_activities(row) and _task_is_expired(row):
        return True

    if _has_child_activities(row) and _all_activities_cancelled_or_expired(row):
        return True

    return False


def _is_at_risk(row: Dict[str, Any], is_potential: bool, is_lost: bool) -> bool:
    if not is_potential or is_lost or _is_paid(row):
        return False

    if _has_child_activities(row):
        if _expired_open_activity_amount(row) > 0:
            return False
        return _timeline_pct(row) >= 75 and _progress_pct(row) < 75

    if _is_pending(row.get("opt_in_status") or row.get("opt_in")) and not _task_is_expired(row):
        return _timeline_pct(row) >= 75

    return _timeline_pct(row) >= 75 and _progress_pct(row) < 75


def _is_pipeline(row: Dict[str, Any], is_potential: bool, is_lost: bool, is_at_risk: bool) -> bool:
    if not is_potential or is_lost or is_at_risk or _is_paid(row):
        return False
    return True


def _build_potential_task_ids(rows: List[Dict[str, Any]]) -> set:
    grouped: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for row in rows:
        if not _is_potential_candidate(row):
            continue
        grouped.setdefault(_group_key(row), []).append(row)

    selected_task_ids = set()

    for group_rows in grouped.values():
        opt_rows = [
            row for row in group_rows
            if _is_opt_in(row.get("opt_in_status") or row.get("opt_in"))
            or _is_opt_out(row.get("opt_in_status") or row.get("opt_in"))
        ]
        if opt_rows:
            for row in opt_rows:
                task_id = row.get("task_id")
                if task_id is not None:
                    selected_task_ids.add(task_id)
            continue

        pending_rows = [row for row in group_rows if _is_pending(row.get("opt_in_status") or row.get("opt_in"))]
        if pending_rows:
            chosen = min(
                pending_rows,
                key=lambda r: (
                    _safe_float(r.get("total_amount_usd")),
                    _safe_int(r.get("task_id")),
                ),
            )
            task_id = chosen.get("task_id")
            if task_id is not None:
                selected_task_ids.add(task_id)

    return selected_task_ids


def _annotate_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    potential_task_ids = _build_potential_task_ids(rows)

    annotated: List[Dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        task_id = item.get("task_id")
        is_potential = task_id in potential_task_ids if task_id is not None else False
        is_lost = _is_lost(item, is_potential)
        is_at_risk = _is_at_risk(item, is_potential, is_lost)
        is_pipeline = _is_pipeline(item, is_potential, is_lost, is_at_risk)

        item["is_potential"] = is_potential
        item["is_lost"] = is_lost
        item["is_at_risk"] = is_at_risk
        item["is_pipeline"] = is_pipeline
        annotated.append(item)

    return annotated


# ─────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────


def _load_report_rows(
    fy_start: Optional[int] = None,
    fy_end: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Carrega os dados da vwCiscoCPIAdopt e anexa as stages da vwCiscoCPIAdoptStages
    agrupadas por task_id, com cache TTL de 5 min.
    """
    cache_key = f"cpi_adopt_report:{fy_start}:{fy_end}"
    with _cpi_cache_lock:
        if cache_key in _cpi_cache:
            return _cpi_cache[cache_key]

    raw_rows = _repo.load_cpi_adopt_view(fy_start=fy_start, fy_end=fy_end, as_df=False)
    raw_stages = _repo.load_cpi_adopt_stages_view(fy_start=fy_start, fy_end=fy_end, as_df=False)

    stages_by_task_id: Dict[Any, List[Dict[str, Any]]] = {}
    for stage in raw_stages:
        stage_data = _serialize_row(dict(stage))
        task_id = stage_data.get("task_id")
        if task_id is None:
            continue
        stages_by_task_id.setdefault(task_id, []).append(stage_data)

    data: List[Dict[str, Any]] = []
    for row in raw_rows:
        row_data = _serialize_row(dict(row))
        row_data["stages"] = stages_by_task_id.get(row_data.get("task_id"), [])
        data.append(row_data)

    annotated = _annotate_rows(data)

    with _cpi_cache_lock:
        _cpi_cache[cache_key] = annotated

    logger.info(
        "CPI Adopt Report: %s parent rows loaded from vwCiscoCPIAdopt and %s stages from vwCiscoCPIAdoptStages.",
        len(annotated),
        len(raw_stages),
    )
    return annotated


# ─────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────


def get_cpi_adopt_report(
    client: Optional[str] = None,
    task_id: Optional[str] = None,
    task_ws: Optional[str] = None,
    deal_id: Optional[str] = None,
    solution: Optional[List[str]] = None,
    task_status: Optional[List[str]] = None,
    opt_in: Optional[List[str]] = None,
    project: Optional[List[str]] = None,
    timeline_stage: Optional[List[str]] = None,
    fy_start: Optional[int] = None,
    fy_end: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Retorna linhas do CPI Adopt Report com filtros opcionais.
    """
    rows = _load_report_rows(fy_start=fy_start, fy_end=fy_end)

    if client:
        client_lower = client.strip().lower()
        rows = [r for r in rows if client_lower in (r.get("client") or "").lower()]

    if task_id:
        task_id_search = task_id.strip().lower()
        rows = [r for r in rows if task_id_search in str(r.get("task_id") or "").lower()]

    if task_ws:
        task_ws_lower = task_ws.strip().lower()
        rows = [r for r in rows if task_ws_lower in (r.get("task_ws") or "").lower()]

    if deal_id:
        deal_id_lower = deal_id.strip().lower()
        rows = [r for r in rows if deal_id_lower in str(r.get("deal_id") or "").lower()]

    if solution:
        allowed_solutions = set(solution)
        rows = [r for r in rows if (r.get("solution") or "") in allowed_solutions]

    if task_status:
        allowed_statuses = set(task_status)
        rows = [r for r in rows if (r.get("task_status") or "") in allowed_statuses]

    if opt_in:
        allowed_opt_in = set(opt_in)
        rows = [r for r in rows if (r.get("opt_in_status") or r.get("opt_in") or "") in allowed_opt_in]

    if project:
        allowed_projects = set(project)
        rows = [r for r in rows if (r.get("project") or "") in allowed_projects]

    if timeline_stage:
        allowed_stages = set(timeline_stage)

        def matches_timeline_stage(row: Dict[str, Any]) -> bool:
            timeline_pct = _timeline_pct(row)
            progress_pct = _progress_pct(row)

            matched: List[str] = []
            if progress_pct == 100:
                matched.append("Completed")
            if timeline_pct < 50:
                matched.append("Early")
            elif timeline_pct < 75:
                matched.append("Mid")
            else:
                matched.append("Late")

            return any(stage in allowed_stages for stage in matched)

        rows = [r for r in rows if matches_timeline_stage(r)]

    return rows


def get_cpi_adopt_filter_options(
    fy_start: Optional[int] = None,
    fy_end: Optional[int] = None,
) -> Dict[str, List[str]]:
    """
    Retorna os valores únicos disponíveis para cada filtro dropdown.
    """
    rows = _load_report_rows(fy_start=fy_start, fy_end=fy_end)

    solutions = sorted({r["solution"] for r in rows if r.get("solution")})
    statuses = sorted({r["task_status"] for r in rows if r.get("task_status")})
    projects = sorted({r["project"] for r in rows if r.get("project")})
    opt_in_statuses = sorted({
        (r.get("opt_in_status") or r.get("opt_in"))
        for r in rows
        if (r.get("opt_in_status") or r.get("opt_in"))
    })

    return {
        "solutions": solutions,
        "statuses": statuses,
        "projects": projects,
        "opt_in_statuses": opt_in_statuses,
    }


def get_cpi_adopt_summary(
    rows: Optional[List[Dict[str, Any]]] = None,
    fy_start: Optional[int] = None,
    fy_end: Optional[int] = None,
) -> Dict[str, Any]:
    """
    KPIs agregados do CPI Adopt Report.
    Se `rows` for None, carrega todos os dados (sem filtros).
    """
    if rows is None:
        rows = _load_report_rows(fy_start=fy_start, fy_end=fy_end)

    potential_rows = [r for r in rows if r.get("is_potential")]
    lost_rows = [r for r in potential_rows if r.get("is_lost")]
    at_risk_rows = [r for r in potential_rows if r.get("is_at_risk")]
    pipeline_rows = [r for r in potential_rows if r.get("is_pipeline")]

    claim_approved_amount = sum(_safe_float(r.get("claim_approved_amount_usd")) for r in potential_rows)
    paid_amount = sum(_safe_float(r.get("payment_approved_amount_usd")) for r in potential_rows)
    lost_amount = sum(
        max(_safe_float(r.get("lost_amount_usd")), _expired_open_activity_amount(r), _safe_float(r.get("total_amount_usd")) if (_is_pending(r.get("opt_in_status") or r.get("opt_in")) and not _has_child_activities(r) and _task_is_expired(r)) else 0.0)
        for r in lost_rows
    )
    potential_amount = sum(_safe_float(r.get("total_amount_usd")) for r in potential_rows)
    at_risk_amount = sum(_safe_float(r.get("total_amount_usd")) for r in at_risk_rows)
    pipeline_amount = sum(_safe_float(r.get("remaining_balance_usd")) or _safe_float(r.get("total_amount_usd")) for r in pipeline_rows)

    with_project_count = sum(1 for r in rows if _is_positive_project(r.get("project")))

    return {
        "potential_count": len(potential_rows),
        "potential_value_usd": round(potential_amount, 2),
        "claim_approved_amount_usd": round(claim_approved_amount, 2),
        "paid_amount_usd": round(paid_amount, 2),
        "lost_amount_usd": round(lost_amount, 2),
        "at_risk_amount_usd": round(at_risk_amount, 2),
        "pipeline_amount_usd": round(pipeline_amount, 2),
        "with_project_count": with_project_count,
        "total_tasks": len(rows),
    }


def invalidate_cpi_adopt_cache() -> None:
    """Força re-carga dos dados na próxima requisição."""
    with _cpi_cache_lock:
        _cpi_cache.clear()
