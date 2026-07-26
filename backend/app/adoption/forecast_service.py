"""
Adoption Forecast Service — business logic layer.
Espelha report_forecast.py do Streamlit.
Usa AdoptionForecastRepository de /opt/bridgeadoption/src/.
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
    from src.infrastructure.database.repositories.adoption_forecast_repository import AdoptionForecastRepository
    _REPO_OK = True
except ImportError as e:
    logger.warning(f"AdoptionForecastRepository não disponível: {e}")
    _REPO_OK = False

# Category IDs (mirrors report_forecast.py)
IDS_BACKLOG = {2, 3, 7, 8}
IDS_ACHIEVED = {9, 10}
IDS_CONCLUIDO = {9, 10}


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


def _fmt_k(number: float) -> str:
    if number >= 1_000_000:
        return f"{number / 1_000_000:.1f}M"
    if number >= 1_000:
        return f"{number / 1_000:.1f}k".replace(".0k", "k")
    if number == int(number):
        return str(int(number))
    return f"{number:.2f}"


def _fmt_duration(total_days: float) -> str:
    if total_days is None:
        return "N/A"
    d = int(round(total_days))
    if d < 30:
        return f"{d} d"
    if d < 365:
        m, r = divmod(d, 30)
        return f"{m} m, {r} d"
    y = d // 365
    rem = d % 365
    m, r = divmod(rem, 30)
    return f"{y} y, {m} m, {r} d"


# ─────────────────────────────────────────
# FISCAL YEARS
# ─────────────────────────────────────────

def get_forecast_fiscal_years() -> List[int]:
    if not _REPO_OK:
        return []
    try:
        repo = AdoptionForecastRepository()
        rows = repo.load_fy_forecast(as_df=False) or []
        return [_safe_int(r.get("activity_end_fy")) for r in rows if r.get("activity_end_fy")]
    except Exception as e:
        logger.error(f"get_forecast_fiscal_years: {e}")
        return []


# ─────────────────────────────────────────
# RAW FORECAST DATA
# ─────────────────────────────────────────

def get_raw_forecast(fy: int) -> List[Dict[str, Any]]:
    if not _REPO_OK:
        return []
    try:
        repo = AdoptionForecastRepository()
        rows = repo.get_forecast_by_fy(fy=fy, as_df=False) or []
        result = []
        for r in rows:
            row = _serialize(dict(r))
            sid = _safe_int(r.get("activity_status_id"))
            if sid in IDS_BACKLOG:
                row["Category"] = "BACKLOG"
                row["Value_for_Chart"] = _safe_float(r.get("activity_value"))
                row["FY_for_Chart"] = _safe_int(r.get("activity_end_fy"))
            elif sid in IDS_ACHIEVED:
                row["Category"] = "ACHIEVED"
                row["Value_for_Chart"] = _safe_float(r.get("activity_approved_value"))
                row["FY_for_Chart"] = _safe_int(r.get("activity_approval_fy"))
            else:
                row["Category"] = "OTHER"
                row["Value_for_Chart"] = 0.0
                row["FY_for_Chart"] = 0
            result.append(row)
        return result
    except Exception as e:
        logger.error(f"get_raw_forecast: {e}\n{traceback.format_exc()}")
        return []


# ─────────────────────────────────────────
# CHART 1: BACKLOG vs ACHIEVED TOTALS
# ─────────────────────────────────────────

def get_forecast_summary(fy: int) -> List[Dict[str, Any]]:
    """Donut chart data: BACKLOG vs ACHIEVED totals."""
    rows = get_raw_forecast(fy)
    totals: Dict[str, float] = {"BACKLOG": 0.0, "ACHIEVED": 0.0}

    for r in rows:
        cat = r.get("Category", "OTHER")
        val = _safe_float(r.get("Value_for_Chart"))
        fy_chart = _safe_int(r.get("FY_for_Chart"))
        if cat == "BACKLOG" and fy_chart >= fy:
            totals["BACKLOG"] += val
        elif cat == "ACHIEVED" and fy_chart == fy:
            totals["ACHIEVED"] += val

    total = sum(totals.values())
    result = []
    for cat, val in totals.items():
        result.append({
            "category": cat,
            "value": round(val, 2),
            "value_fmt": _fmt_k(val),
            "percentage": round(val / total, 4) if total > 0 else 0.0,
        })
    return result


# ─────────────────────────────────────────
# CHART 2: BY TASK TYPE
# ─────────────────────────────────────────

def get_forecast_by_task_type(fy: int) -> List[Dict[str, Any]]:
    rows = get_raw_forecast(fy)
    aggregated: Dict[tuple, float] = {}
    for r in rows:
        cat = r.get("Category", "OTHER")
        if cat not in ("BACKLOG", "ACHIEVED"):
            continue
        fy_chart = _safe_int(r.get("FY_for_Chart"))
        if cat == "BACKLOG" and fy_chart < fy:
            continue
        if cat == "ACHIEVED" and fy_chart != fy:
            continue
        key = (str(r.get("task_tasktype_name") or "N/A"), cat)
        aggregated[key] = aggregated.get(key, 0.0) + _safe_float(r.get("Value_for_Chart"))

    # Calculate percentages per task type
    totals_by_type: Dict[str, float] = {}
    for (ttype, _), val in aggregated.items():
        totals_by_type[ttype] = totals_by_type.get(ttype, 0.0) + val

    result = []
    for (ttype, cat), val in aggregated.items():
        total = totals_by_type.get(ttype, 1.0)
        result.append({
            "task_type": ttype,
            "category": cat,
            "value": round(val, 2),
            "pct": round(val / total, 4) if total > 0 else 0.0,
        })
    return sorted(result, key=lambda x: (x["task_type"], x["category"]))


# ─────────────────────────────────────────
# CHART 3: BY OWNER
# ─────────────────────────────────────────

def get_forecast_by_owner(fy: int, user_id: int, is_manager: bool) -> List[Dict[str, Any]]:
    rows = get_raw_forecast(fy)
    aggregated: Dict[tuple, float] = {}
    for r in rows:
        cat = r.get("Category", "OTHER")
        if cat not in ("BACKLOG", "ACHIEVED"):
            continue
        fy_chart = _safe_int(r.get("FY_for_Chart"))
        if cat == "BACKLOG" and fy_chart < fy:
            continue
        if cat == "ACHIEVED" and fy_chart != fy:
            continue
        owner_id = _safe_int(r.get("task_owner_id"))
        if not is_manager and owner_id != 0 and owner_id != user_id:
            continue
        owner_name = str(r.get("task_owner_name") or "N/A")
        key = (owner_name, cat)
        aggregated[key] = aggregated.get(key, 0.0) + _safe_float(r.get("Value_for_Chart"))

    result = []
    for (owner, cat), val in aggregated.items():
        result.append({"owner": owner, "category": cat, "value": round(val, 2), "value_fmt": _fmt_k(val)})
    return sorted(result, key=lambda x: (x["owner"], x["category"]))


# ─────────────────────────────────────────
# CHART 4: BY CLIENT + TOP 5 ACHIEVED
# ─────────────────────────────────────────

def get_forecast_by_client(fy: int) -> Dict[str, Any]:
    rows = get_raw_forecast(fy)
    by_client: Dict[tuple, float] = {}
    achieved_by_client: Dict[str, float] = {}

    for r in rows:
        cat = r.get("Category", "OTHER")
        if cat not in ("BACKLOG", "ACHIEVED"):
            continue
        fy_chart = _safe_int(r.get("FY_for_Chart"))
        if cat == "BACKLOG" and fy_chart < fy:
            continue
        if cat == "ACHIEVED" and fy_chart != fy:
            continue
        client = str(r.get("task_client_name") or "N/A")
        val = _safe_float(r.get("Value_for_Chart"))
        by_client[(client, cat)] = by_client.get((client, cat), 0.0) + val
        if cat == "ACHIEVED":
            achieved_by_client[client] = achieved_by_client.get(client, 0.0) + val

    all_clients = []
    for (client, cat), val in by_client.items():
        all_clients.append({"client": client, "category": cat, "value": round(val, 2)})

    top5 = sorted(
        [{"client": k, "value": round(v, 2), "value_fmt": _fmt_k(v)} for k, v in achieved_by_client.items()],
        key=lambda x: x["value"],
        reverse=True
    )[:5]

    return {"all": sorted(all_clients, key=lambda x: (x["client"], x["category"])), "top5_achieved": top5}


# ─────────────────────────────────────────
# INCENTIVE DATA (Charts 5-8)
# ─────────────────────────────────────────

def get_incentive_data() -> List[Dict[str, Any]]:
    if not _REPO_OK:
        return []
    try:
        repo = AdoptionForecastRepository()
        rows = repo.load_task_incentive(as_df=False) or []
        return [_serialize(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_incentive_data: {e}")
        return []


def get_incentive_by_fy() -> List[Dict[str, Any]]:
    rows = get_incentive_data()
    counts: Dict[int, int] = {}
    for r in rows:
        fy = _safe_int(r.get("task_end_fy"))
        if fy:
            counts[fy] = counts.get(fy, 0) + 1
    return [{"fy": k, "count": v} for k, v in sorted(counts.items())]


def get_incentive_by_fy_and_type() -> List[Dict[str, Any]]:
    rows = get_incentive_data()
    counts: Dict[tuple, int] = {}
    for r in rows:
        fy = _safe_int(r.get("task_end_fy"))
        ttype = str(r.get("task_tasktype_name") or "N/A")
        if fy:
            key = (fy, ttype)
            counts[key] = counts.get(key, 0) + 1
    return [{"fy": k[0], "task_type": k[1], "count": v} for k, v in sorted(counts.items())]


def get_incentive_by_status() -> Dict[str, Any]:
    rows = get_incentive_data()
    all_status: Dict[str, int] = {}
    by_fy: Dict[tuple, int] = {}
    for r in rows:
        status = str(r.get("task_status_name") or "N/A")
        fy = _safe_int(r.get("task_end_fy"))
        all_status[status] = all_status.get(status, 0) + 1
        if fy:
            by_fy[(fy, status)] = by_fy.get((fy, status), 0) + 1

    total = sum(all_status.values()) or 1
    all_pct = [{"status": k, "count": v, "pct": round(v / total, 4)} for k, v in all_status.items()]

    fy_totals: Dict[int, int] = {}
    for (fy, _), cnt in by_fy.items():
        fy_totals[fy] = fy_totals.get(fy, 0) + cnt

    by_fy_list = []
    for (fy, status), cnt in by_fy.items():
        t = fy_totals.get(fy, 1)
        by_fy_list.append({"fy": fy, "status": status, "count": cnt, "pct": round(cnt / t, 4)})

    return {"all": all_pct, "by_fy": sorted(by_fy_list, key=lambda x: (x["fy"], x["status"]))}


def get_incentive_by_csm(user_id: int, is_manager: bool) -> List[Dict[str, Any]]:
    rows = get_incentive_data()
    counts: Dict[tuple, int] = {}
    for r in rows:
        owner_id = _safe_int(r.get("task_owner_id"))
        if not is_manager and owner_id != 0 and owner_id != user_id:
            continue
        owner = str(r.get("task_owner_name") or "N/A")
        status = str(r.get("task_status_name") or "N/A")
        key = (owner, status)
        counts[key] = counts.get(key, 0) + 1
    return [{"owner": k[0], "status": k[1], "count": v} for k, v in sorted(counts.items())]


def get_incentive_effort_by_client() -> List[Dict[str, Any]]:
    rows = get_incentive_data()
    completed = [r for r in rows if _safe_int(r.get("task_status_id")) in IDS_CONCLUIDO]
    client_days: Dict[str, List[float]] = {}
    for r in completed:
        client = str(r.get("task_client_name") or "N/A")
        days = _safe_float(r.get("task_days"))
        client_days.setdefault(client, []).append(days)
    result = []
    for client, day_list in client_days.items():
        avg = sum(day_list) / len(day_list) if day_list else 0
        mn = min(day_list) if day_list else 0
        mx = max(day_list) if day_list else 0
        result.append({
            "client": client,
            "avg_days": round(avg, 1),
            "avg_fmt": f"{int(round(avg))}  |  {_fmt_duration(avg)}",
            "min_fmt": f"{int(round(mn))}  |  {_fmt_duration(mn)}",
            "max_fmt": f"{int(round(mx))}  |  {_fmt_duration(mx)}",
        })
    return sorted(result, key=lambda x: x["avg_days"], reverse=True)


def get_incentive_effort_by_use_case() -> List[Dict[str, Any]]:
    rows = get_incentive_data()
    completed = [r for r in rows if _safe_int(r.get("task_status_id")) in IDS_CONCLUIDO]
    uc_days: Dict[str, List[float]] = {}
    for r in completed:
        uc = str(r.get("task_use_case") or "N/A")
        days = _safe_float(r.get("task_days"))
        uc_days.setdefault(uc, []).append(days)
    result = []
    for uc, day_list in uc_days.items():
        avg = sum(day_list) / len(day_list) if day_list else 0
        mn = min(day_list) if day_list else 0
        mx = max(day_list) if day_list else 0
        result.append({
            "use_case": uc,
            "avg_days": round(avg, 1),
            "avg_fmt": f"{int(round(avg))}  |  {_fmt_duration(avg)}",
            "min_fmt": f"{int(round(mn))}  |  {_fmt_duration(mn)}",
            "max_fmt": f"{int(round(mx))}  |  {_fmt_duration(mx)}",
        })
    return sorted(result, key=lambda x: x["avg_days"], reverse=True)
