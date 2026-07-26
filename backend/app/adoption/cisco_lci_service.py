"""
Cisco LCI Service — espelha report_cisco_lci.py do Streamlit.
Usa CiscoLCIRepository de /opt/bridgeadoption/src/.
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
    _REPO_OK = True
except ImportError as e:
    logger.warning(f"CiscoLCIRepository não disponível: {e}")
    _REPO_OK = False

# Status IDs
STATUS_APPROVED = {9, 10}
STATUS_AWAITING = {1}
STATUS_ONGOING = {2, 3, 7, 8}
STATUS_LOST = {6}
TASK_STATUS_CANCELLED = {4, 5}


def _safe_float(v) -> float:
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _safe_int(v) -> int:
    try:
        return int(v) if v is not None else 0
    except (TypeError, ValueError):
        return 0


def _safe_str(v) -> str:
    return str(v) if v is not None else ""


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


def _calculate_fy(dt) -> Optional[int]:
    """Fiscal year: April = start of FY."""
    if dt is None:
        return None
    try:
        import pandas as pd
        ts = pd.to_datetime(dt)
        if pd.isna(ts):
            return None
        year = ts.year
        return year if ts.month >= 4 else year - 1
    except Exception:
        return None


def _current_fy() -> int:
    today = date.today()
    return today.year if today.month >= 4 else today.year - 1


def _enrich_row(r: Dict[str, Any]) -> Dict[str, Any]:
    """Aplica normalização e regras de negócio ao nível de linha."""
    import pandas as pd

    row = _serialize(r)

    sid = _safe_int(r.get("lci_stage_status_id"))
    row["lci_stage_status_id"] = sid

    # Stage amount: status 10 usa approval_value
    val = _safe_float(r.get("lci_stage_value"))
    appr_val = _safe_float(r.get("lci_stage_approval_value"))
    row["stage_amount_usd"] = appr_val if sid == 10 else val

    # Effective dates
    start = r.get("lci_stage_performed_start") or r.get("lci_stage_estimated_start")
    end = r.get("lci_stage_performed_end") or r.get("lci_stage_estimated_end")
    row["stage_start_date"] = start.isoformat() if hasattr(start, "isoformat") else (str(start) if start else None)
    row["stage_end_date"] = end.isoformat() if hasattr(end, "isoformat") else (str(end) if end else None)

    # Fiscal year
    try:
        end_ts = pd.to_datetime(end) if end else None
    except Exception:
        end_ts = None
    row["lci_stage_end_fy"] = _calculate_fy(end_ts)

    appr_fy = _safe_int(r.get("lci_stage_approval_fy")) or None
    task_fy = _safe_int(r.get("lci_task_end_fy")) or None
    row["lci_effective_fy"] = appr_fy or row["lci_stage_end_fy"] or task_fy

    return row


def _load_all_enriched() -> List[Dict[str, Any]]:
    if not _REPO_OK:
        return []
    try:
        repo = CiscoLCIRepository()
        rows = repo.find_all(task_eligible="Y", as_df=False) or []
        return [_enrich_row(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"_load_all_enriched: {e}\n{traceback.format_exc()}")
        return []


# ─────────────────────────────────────────
# FY OPTIONS
# ─────────────────────────────────────────

def get_lci_fiscal_years() -> List[int]:
    rows = _load_all_enriched()
    cur = _current_fy()
    fys = set()
    for r in rows:
        fy = r.get("lci_effective_fy")
        if fy and isinstance(fy, int) and fy >= cur - 1:
            fys.add(fy)
    return sorted(fys)


# ─────────────────────────────────────────
# SUMMARY + KPIs
# ─────────────────────────────────────────

def get_lci_summary(fy: Optional[int]) -> Dict[str, Any]:
    rows = _load_all_enriched()

    if fy:
        filtered = [r for r in rows if r.get("lci_effective_fy") == fy]
    else:
        filtered = rows

    # Dedup by stage
    seen_stage: Dict[int, Dict] = {}
    for r in filtered:
        sid_row = _safe_int(r.get("lci_stage_id"))
        if sid_row and sid_row not in seen_stage:
            seen_stage[sid_row] = r
    stage_dedup = list(seen_stage.values())

    total_tasks = len({_safe_int(r.get("lci_task_id")) for r in filtered if r.get("lci_task_id")})
    total_stages = len(seen_stage)
    total_approved = sum(1 for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_APPROVED)
    total_awaiting = sum(1 for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_AWAITING)
    total_ongoing = sum(1 for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_ONGOING)
    total_lost = sum(1 for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_LOST)

    tasks_awaiting_opt_in = len({
        _safe_int(r.get("lci_task_id")) for r in filtered
        if _safe_int(r.get("lci_task_status")) in {1, 3} and not r.get("lci_stage_ws")
    })
    tasks_lost_pending = len({
        _safe_int(r.get("lci_task_id")) for r in filtered
        if _safe_int(r.get("lci_task_status")) in {4, 5, 6} and not r.get("lci_stage_ws")
    })

    fin_approved = sum(_safe_float(r.get("stage_amount_usd")) for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_APPROVED)
    fin_lost = sum(_safe_float(r.get("stage_amount_usd")) for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_LOST)

    # Total Potential: active tasks, sum stage_value grouped by task
    active_rows = [r for r in stage_dedup if _safe_int(r.get("lci_task_status")) not in TASK_STATUS_CANCELLED]
    task_potential: Dict[int, float] = {}
    for r in active_rows:
        tid = _safe_int(r.get("lci_task_id"))
        task_potential[tid] = task_potential.get(tid, 0.0) + _safe_float(r.get("lci_stage_value"))
    fin_potential = sum(task_potential.values())

    fin_conversion = fin_approved / fin_potential if fin_potential > 0 else 0.0

    return {
        "fy": fy,
        "total_tasks": total_tasks,
        "total_stages": total_stages,
        "total_approved_stages": total_approved,
        "total_awaiting_stages": total_awaiting,
        "total_ongoing_stages": total_ongoing,
        "total_lost_stages": total_lost,
        "tasks_awaiting_opt_in": tasks_awaiting_opt_in,
        "tasks_lost_opt_in_pending": tasks_lost_pending,
        "fin_potential": round(fin_potential, 2),
        "fin_approved": round(fin_approved, 2),
        "fin_lost": round(fin_lost, 2),
        "fin_conversion_rate": round(fin_conversion, 4),
    }


# ─────────────────────────────────────────
# CHART 7A: BY STAGE STATUS
# ─────────────────────────────────────────

def get_lci_by_stage_status(fy: Optional[int]) -> List[Dict[str, Any]]:
    rows = _load_all_enriched()
    if fy:
        rows = [r for r in rows if r.get("lci_effective_fy") == fy]

    seen_stage: Dict[int, Dict] = {}
    for r in rows:
        sid = _safe_int(r.get("lci_stage_id"))
        if sid and sid not in seen_stage:
            seen_stage[sid] = r

    agg: Dict[str, Dict] = {}
    for r in seen_stage.values():
        status_name = _safe_str(r.get("lci_stage_status_name")) or "Unknown"
        if status_name not in agg:
            agg[status_name] = {"total_value": 0.0, "count": 0}
        agg[status_name]["total_value"] += _safe_float(r.get("stage_amount_usd"))
        agg[status_name]["count"] += 1

    result = [{"status": k, "total_value": round(v["total_value"], 2), "count": v["count"]} for k, v in agg.items()]
    return sorted(result, key=lambda x: x["total_value"], reverse=True)


def get_lci_termination_status(fy: Optional[int]) -> List[Dict[str, Any]]:
    """For approved stages pie chart."""
    rows = _load_all_enriched()
    if fy:
        rows = [r for r in rows if r.get("lci_effective_fy") == fy]

    approved = [r for r in rows if _safe_int(r.get("lci_stage_status_id")) in STATUS_APPROVED]
    seen: Dict[int, Dict] = {}
    for r in approved:
        sid = _safe_int(r.get("lci_stage_id"))
        if sid and sid not in seen:
            seen[sid] = r

    counts: Dict[str, int] = {}
    for r in seen.values():
        ts = _safe_str(r.get("termination_status")) or "Unknown"
        counts[ts] = counts.get(ts, 0) + 1

    return [{"termination_status": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: x[1], reverse=True)]


# ─────────────────────────────────────────
# CHART 7B: BURN-UP
# ─────────────────────────────────────────

def get_lci_burnup(fy: int) -> Dict[str, Any]:
    """Monthly burn-up: Potential, Approved, Lost accumulated."""
    import calendar

    rows = _load_all_enriched()
    filtered = [r for r in rows if r.get("lci_effective_fy") == fy]

    seen: Dict[int, Dict] = {}
    for r in filtered:
        sid = _safe_int(r.get("lci_stage_id"))
        if sid and sid not in seen:
            seen[sid] = r

    # Generate fiscal months (Apr → Mar)
    fiscal_months = []
    for m in range(4, 13):
        fiscal_months.append(f"{fy}-{m:02d}")
    for m in range(1, 4):
        fiscal_months.append(f"{fy + 1}-{m:02d}")

    # Aggregate by month
    monthly: Dict[str, Dict] = {m: {"approved": 0.0, "lost": 0.0, "pipeline": 0.0} for m in fiscal_months}

    for r in seen.values():
        task_status = _safe_int(r.get("lci_task_status"))
        if task_status in TASK_STATUS_CANCELLED:
            continue

        stage_status = _safe_int(r.get("lci_stage_status_id"))
        end_date = r.get("stage_end_date")
        val = _safe_float(r.get("lci_stage_value"))

        month_key = None
        if end_date:
            try:
                import pandas as pd
                ts = pd.to_datetime(end_date)
                month_key = f"{ts.year}-{ts.month:02d}"
            except Exception:
                pass

        if month_key not in monthly:
            month_key = fiscal_months[-1]  # fallback to last month

        if stage_status in STATUS_APPROVED:
            monthly[month_key]["approved"] += val
        elif stage_status in STATUS_LOST:
            monthly[month_key]["lost"] += val
        else:
            monthly[month_key]["pipeline"] += val

    # Build cumulative series
    result_months = []
    cum_approved = cum_lost = cum_pipeline = 0.0
    for m in fiscal_months:
        d = monthly[m]
        cum_approved += d["approved"]
        cum_lost += d["lost"]
        cum_pipeline += d["pipeline"]
        cum_potential = cum_approved + cum_lost + cum_pipeline
        conversion = cum_approved / cum_potential if cum_potential > 0 else 0.0
        result_months.append({
            "month": m,
            "cum_approved": round(cum_approved, 2),
            "cum_lost": round(cum_lost, 2),
            "cum_potential": round(cum_potential, 2),
            "conversion_rate": round(conversion, 4),
        })

    return {"months": result_months, "fy": fy}


# ─────────────────────────────────────────
# CHART 7C: YEAR-OVER-YEAR
# ─────────────────────────────────────────

def get_lci_yoy() -> List[Dict[str, Any]]:
    """Year-over-Year conversion efficiency."""
    rows = _load_all_enriched()
    cur = _current_fy()

    yoy_rows = [r for r in rows if r.get("lci_effective_fy") and cur - 2 <= r.get("lci_effective_fy") <= cur]

    seen: Dict[int, Dict] = {}
    for r in yoy_rows:
        sid = _safe_int(r.get("lci_stage_id"))
        if sid and sid not in seen:
            seen[sid] = r

    # Approved and Lost by FY
    by_fy: Dict[int, Dict] = {}
    for r in seen.values():
        fy = r.get("lci_effective_fy")
        if not fy:
            continue
        if fy not in by_fy:
            by_fy[fy] = {"approved": 0.0, "lost": 0.0, "potential": 0.0}
        sid_status = _safe_int(r.get("lci_stage_status_id"))
        val = _safe_float(r.get("stage_amount_usd"))
        if sid_status in STATUS_APPROVED:
            by_fy[fy]["approved"] += val
        elif sid_status in STATUS_LOST:
            by_fy[fy]["lost"] += val

    # Potential per FY
    all_dedup: Dict[int, Dict] = {}
    for r in rows:
        sid = _safe_int(r.get("lci_stage_id"))
        if sid and sid not in all_dedup:
            all_dedup[sid] = r

    for r in all_dedup.values():
        fy = r.get("lci_effective_fy")
        if not fy or fy not in by_fy:
            continue
        if _safe_int(r.get("lci_task_status")) in TASK_STATUS_CANCELLED:
            continue
        task_val = _safe_float(r.get("lci_stage_value"))
        by_fy[fy]["potential"] += task_val

    result = []
    for fy, d in sorted(by_fy.items()):
        potential = d["potential"]
        conv_rate = d["approved"] / potential if potential > 0 else 0.0
        lost_rate = d["lost"] / potential if potential > 0 else 0.0
        result.append({
            "fy": fy,
            "fy_label": f"FY {fy}",
            "approved": round(d["approved"], 2),
            "lost": round(d["lost"], 2),
            "potential": round(potential, 2),
            "conversion_rate": round(conv_rate, 4),
            "lost_rate": round(lost_rate, 4),
        })
    return result


# ─────────────────────────────────────────
# DATA TABLES
# ─────────────────────────────────────────

def get_lci_stage_rows(fy: Optional[int], stage_status_filter: str) -> List[Dict[str, Any]]:
    """Returns stage rows filtered by status category."""
    rows = _load_all_enriched()
    if fy:
        rows = [r for r in rows if r.get("lci_effective_fy") == fy]

    status_map = {
        "approved": STATUS_APPROVED,
        "awaiting": STATUS_AWAITING,
        "ongoing": STATUS_ONGOING,
        "lost": STATUS_LOST,
    }

    target_statuses = status_map.get(stage_status_filter.lower(), set())
    filtered = [r for r in rows if _safe_int(r.get("lci_stage_status_id")) in target_statuses]

    # Dedup by stage
    seen: Dict[int, Dict] = {}
    for r in filtered:
        sid = _safe_int(r.get("lci_stage_id"))
        if sid and sid not in seen:
            seen[sid] = r

    # Return selected columns
    result = []
    for r in seen.values():
        result.append({
            "lci_task_id": r.get("lci_task_id"),
            "lci_client_name": r.get("lci_client_name"),
            "lci_solution": r.get("lci_track"),
            "lci_use_case": r.get("lci_use_case"),
            "lci_ws": r.get("lci_ws"),
            "lci_deal_id": r.get("lci_deal_id"),
            "lci_csm_name": r.get("lci_csm_name"),
            "lci_stage_id": r.get("lci_stage_id"),
            "lci_stage_name": r.get("lci_stage_name"),
            "lci_stage_ws": r.get("lci_stage_ws"),
            "lci_stage_value": r.get("lci_stage_value"),
            "lci_stage_approval_value": r.get("lci_stage_approval_value"),
            "lci_stage_status_name": r.get("lci_stage_status_name"),
            "lci_stage_end_fy": r.get("lci_effective_fy"),
            "stage_start_date": r.get("stage_start_date"),
            "stage_end_date": r.get("stage_end_date"),
            "termination_status": r.get("termination_status"),
            "lci_stage_approval_date": r.get("lci_stage_approval_date"),
            "lci_stage_approval_fy": r.get("lci_stage_approval_fy"),
            "stage_amount_usd": r.get("stage_amount_usd"),
        })

    return sorted(result, key=lambda x: (_safe_str(x.get("lci_client_name")), _safe_str(x.get("lci_deal_id"))))
