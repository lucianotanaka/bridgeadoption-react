"""
Cisco LCI Service — espelha report_cisco_lci.py do Streamlit.
Usa CiscoLCIRepository de /opt/bridgeadoption/src/.

Performance:
  - _load_all_enriched() e _load_cisco_lci_all() usam TTL cache de 5 minutos.
    Chamadas repetidas dentro do TTL retornam dados em memória (sem DB).
  - _load_all_enriched() usa pandas vetorizado ao invés de loop por linha.
  - get_lci_report_data(fy) carrega os dados UMA VEZ e retorna todos os
    agregados necessários para o Report Page, substituindo ~8 chamadas paralelas.
"""
import sys
import os
import logging
import math
import threading
import traceback
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

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

# ─────────────────────────────────────────
# TTL CACHE — 5 minutos para dados LCI
# LCI data muda raramente — cache elimina queries duplicadas entre endpoints
# ─────────────────────────────────────────
try:
    from cachetools import TTLCache
    _CACHE_OK = True
except ImportError:
    _CACHE_OK = False

_LCI_CACHE_TTL = 300  # 5 minutos
_lci_all_cache: Any = TTLCache(maxsize=4, ttl=_LCI_CACHE_TTL) if _CACHE_OK else {}
_lci_task_cache: Any = TTLCache(maxsize=16, ttl=_LCI_CACHE_TTL) if _CACHE_OK else {}
_lci_cache_lock = threading.RLock()

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


def _fy_bounds(fy: int) -> Tuple[date, date]:
    return date(fy, 4, 1), date(fy + 1, 3, 31)


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
    """
    Carrega e enriquece todos os registros LCI com task_eligible='Y'.
    Resultado cacheado por 5 minutos — chamadas repetidas retornam cache em memória.
    Usa pandas vetorizado ao invés de loop por linha (_enrich_row).
    """
    cache_key = "lci_all_enriched"
    with _lci_cache_lock:
        if cache_key in _lci_all_cache:
            return _lci_all_cache[cache_key]

    if not _REPO_OK:
        return []

    try:
        import pandas as pd
        repo = CiscoLCIRepository()

        # Tentar modo DataFrame para vetorização
        try:
            df = repo.find_all(task_eligible=None, as_df=True)
            if df is None or df.empty:
                result: List[Dict[str, Any]] = []
                with _lci_cache_lock:
                    _lci_all_cache[cache_key] = result
                return result

            # Datas efetivas — vetorizado (evita loop por linha)
            start_col = "lci_stage_performed_start" if "lci_stage_performed_start" in df.columns else None
            est_start  = "lci_stage_estimated_start" if "lci_stage_estimated_start" in df.columns else None
            end_col    = "lci_stage_performed_end" if "lci_stage_performed_end" in df.columns else None
            est_end    = "lci_stage_estimated_end" if "lci_stage_estimated_end" in df.columns else None

            if start_col and est_start:
                df["stage_start_date"] = pd.to_datetime(
                    df[start_col].fillna(df[est_start]), errors="coerce"
                ).dt.strftime("%Y-%m-%d").where(df[start_col].notna() | df[est_start].notna(), None)
            else:
                df["stage_start_date"] = None

            if end_col and est_end:
                df["stage_end_date"] = pd.to_datetime(
                    df[end_col].fillna(df[est_end]), errors="coerce"
                ).dt.strftime("%Y-%m-%d").where(df[end_col].notna() | df[est_end].notna(), None)
            else:
                df["stage_end_date"] = None

            # stage_amount_usd — vetorizado
            if "lci_stage_status_id" in df.columns and "lci_stage_approval_value" in df.columns and "lci_stage_value" in df.columns:
                df["stage_amount_usd"] = df.apply(
                    lambda r: _safe_float(r.get("lci_stage_approval_value"))
                    if _safe_int(r.get("lci_stage_status_id")) == 10
                    else _safe_float(r.get("lci_stage_value")),
                    axis=1,
                )
            elif "lci_stage_value" in df.columns:
                df["stage_amount_usd"] = df["lci_stage_value"].fillna(0.0).astype(float)
            else:
                df["stage_amount_usd"] = 0.0

            # Fiscal year — vetorizado
            end_ts = pd.to_datetime(df["stage_end_date"], errors="coerce")
            df["lci_stage_end_fy"] = end_ts.apply(_calculate_fy)

            appr_fy_col = "lci_stage_approval_fy" if "lci_stage_approval_fy" in df.columns else None
            task_fy_col = "lci_task_end_fy" if "lci_task_end_fy" in df.columns else None

            def _eff_fy(r: Any) -> Any:
                appr = _safe_int(r.get("lci_stage_approval_fy")) if appr_fy_col else None
                task_fy = _safe_int(r.get("lci_task_end_fy")) if task_fy_col else None
                return appr or r.get("lci_stage_end_fy") or task_fy

            df["lci_effective_fy"] = df.apply(_eff_fy, axis=1)

            # Serializar datas restantes para string ISO
            for col in df.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
                df[col] = df[col].dt.strftime("%Y-%m-%d").where(df[col].notna(), None)

            # NaN → None
            df = df.where(pd.notna(df), None)

            enriched = df.to_dict("records")

        except Exception as df_err:
            logger.warning(f"_load_all_enriched vectorized fallback: {df_err}")
            rows = repo.find_all(task_eligible=None, as_df=False) or []
            enriched = [_enrich_row(dict(r)) for r in rows]

        with _lci_cache_lock:
            _lci_all_cache[cache_key] = enriched

        return enriched

    except Exception as e:
        logger.error(f"_load_all_enriched: {e}\n{traceback.format_exc()}")
        return []


def _load_cisco_lci_all_cached(fy: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Carrega load_cisco_lci_all com cache TTL de 5 minutos por fy.
    """
    cache_key = f"lci_task:{fy}"
    with _lci_cache_lock:
        if cache_key in _lci_task_cache:
            return _lci_task_cache[cache_key]

    if not _REPO_OK:
        return []

    try:
        repo = CiscoLCIRepository()
        rows = repo.load_cisco_lci_all(fy=fy, as_df=False) or []
        data = [dict(r) for r in rows]
        with _lci_cache_lock:
            _lci_task_cache[cache_key] = data
        return data
    except Exception as e:
        logger.error(f"_load_cisco_lci_all_cached fy={fy}: {e}")
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

    # Total Opt In: active tasks that have opted in, sum task_value (not stage_value)
    # Use load_cisco_lci_all to get task_value per task
    fin_potential = 0.0
    try:
        if _REPO_OK:
            repo = CiscoLCIRepository()
            task_rows = repo.load_cisco_lci_all(fy=fy, as_df=False) or []
            CANCELLED = {4, 5}
            opted_in_task_ids = {_safe_int(r.get("lci_task_id")) for r in filtered if not _safe_int(r.get("lci_task_status")) in CANCELLED}
            seen_tasks: set = set()
            for r in task_rows:
                tid = _safe_int(r.get("task_id"))
                if tid in opted_in_task_ids and tid not in seen_tasks:
                    if _safe_int(r.get("task_status_id")) not in CANCELLED:
                        fin_potential += _safe_float(r.get("task_value"))
                        seen_tasks.add(tid)
    except Exception as e:
        logger.warning(f"get_lci_summary fin_potential fallback: {e}")
        # Fallback to stage_value sum
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

        # Use stage_amount_usd (same as cards: approval_value for status 10, stage_value otherwise)
        amount = _safe_float(r.get("stage_amount_usd"))
        if stage_status in STATUS_APPROVED:
            monthly[month_key]["approved"] += amount
        elif stage_status in STATUS_LOST:
            monthly[month_key]["lost"] += amount
        else:
            monthly[month_key]["pipeline"] += amount

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
        # Use stage_amount_usd (same as cards)
        amount = _safe_float(r.get("stage_amount_usd"))
        if sid_status in STATUS_APPROVED:
            by_fy[fy]["approved"] += amount
        elif sid_status in STATUS_LOST:
            by_fy[fy]["lost"] += amount

    # Potential per FY: use the same seen stages (scoped to relevant FYs)
    # potential = approved + lost + pipeline (all non-cancelled stages in that FY)
    for r in seen.values():
        fy = r.get("lci_effective_fy")
        if not fy or fy not in by_fy:
            continue
        if _safe_int(r.get("lci_task_status")) in TASK_STATUS_CANCELLED:
            continue
        by_fy[fy]["potential"] += _safe_float(r.get("stage_amount_usd"))

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

def _build_potential_rows(all_rows: List[Dict]) -> List[Dict]:
    """
    Applies the 'Total Potential' grouping rule:
    - Excludes cancelled (4) and closed (5) tasks.
    - Groups by (task_cr_party_id, task_deal_id, task_track).
    - Groups where all statuses are OPEN(1)/ON_HOLD(3) → keep only the lowest-value task.
    - Groups with any other active status → keep all active tasks.
    Returns the selected rows.
    """
    CANCELLED = {4, 5}
    STATUS_PENDING = {1, 3}
    active = [r for r in all_rows if _safe_int(r.get("task_status_id")) not in CANCELLED]
    groups: Dict[tuple, List[Dict]] = {}
    for r in active:
        key = (
            _safe_str(r.get("task_cr_party_id")),
            _safe_str(r.get("task_deal_id")),
            _safe_str(r.get("task_track")),
        )
        groups.setdefault(key, []).append(r)
    selected: List[Dict] = []
    for group_rows in groups.values():
        statuses = {_safe_int(r.get("task_status_id")) for r in group_rows}
        if statuses <= STATUS_PENDING:
            best = min(group_rows, key=lambda r: (_safe_float(r.get("task_value")), _safe_int(r.get("task_id"))))
            selected.append(best)
        else:
            selected.extend(group_rows)
    return selected


def get_lci_lost_justification(fy: Optional[int]) -> List[Dict[str, Any]]:
    """Returns count & value breakdown by task_status_justification for cancelled/closed tasks (status 4 or 5)."""
    if not _REPO_OK:
        return []
    try:
        repo = CiscoLCIRepository()
        rows = repo.load_cisco_lci_all(fy=fy, as_df=False) or []
        CANCELLED = {4, 5}
        cancelled_rows = [r for r in rows if _safe_int(r.get("task_status_id")) in CANCELLED]
        agg: Dict[str, Dict] = {}
        for r in cancelled_rows:
            justification = _safe_str(r.get("task_status_justification")).strip() or "Not Specified"
            if justification not in agg:
                agg[justification] = {"count": 0, "value": 0.0}
            agg[justification]["count"] += 1
            agg[justification]["value"] += _safe_float(r.get("task_value"))
        result = [
            {"justification": k, "count": v["count"], "value": round(v["value"], 2)}
            for k, v in sorted(agg.items(), key=lambda x: x[1]["count"], reverse=True)
        ]
        return result
    except Exception as e:
        logger.error(f"get_lci_lost_justification: {e}\n{traceback.format_exc()}")
        return []


def get_lci_total_eligibles(fy: Optional[int]) -> Dict[str, Any]:
    """Returns totals + executive overview data for the given FY."""
    if not _REPO_OK:
        return {"fy": fy, "total_eligibles": 0.0, "total_potential": 0.0}
    try:
        repo = CiscoLCIRepository()
        rows = repo.load_cisco_lci_all(fy=fy, as_df=False) or []

        # ── Stage (Opt In) data — from find_all (eligible=Y) scoped to same FY ──
        opt_in_all = _load_all_enriched()
        if fy:
            opt_in_all = [r for r in opt_in_all if r.get("lci_effective_fy") == fy]
        # Dedup by stage
        seen_stage: Dict[int, Dict] = {}
        for r in opt_in_all:
            sid = _safe_int(r.get("lci_stage_id"))
            if sid and sid not in seen_stage:
                seen_stage[sid] = r
        # Build per-task opt-in: tasks with any stage (= opted in)
        opted_in_task_ids = {_safe_int(r.get("lci_task_id")) for r in seen_stage.values()}

        # ── TOTAL ELIGIBLES ─────────────────────────────────────────────────
        total_eligibles = sum(_safe_float(r.get("task_value")) for r in rows)
        n_eligibles = len(rows)

        # ── TOTAL POTENTIAL ──────────────────────────────────────────────────
        potential_rows = _build_potential_rows(rows)
        total_potential = sum(_safe_float(r.get("task_value")) for r in potential_rows)
        n_potential = len(potential_rows)

        # ── TOTAL OPT IN (task level) ────────────────────────────────────────
        # Sum of task_value for active eligible tasks that have at least one stage (opted in)
        CANCELLED = {4, 5}
        opt_in_rows = [r for r in rows if _safe_int(r.get("task_id")) in opted_in_task_ids and _safe_int(r.get("task_status_id")) not in CANCELLED]
        total_opt_in = sum(_safe_float(r.get("task_value")) for r in opt_in_rows)
        n_opt_in = len(opt_in_rows)

        # ── BY SOLUTION — Eligible vs Potential ─────────────────────────────
        elig_by_track: Dict[str, Dict] = {}
        for r in rows:
            t = _safe_str(r.get("task_track")) or "Unknown"
            elig_by_track.setdefault(t, {"count": 0, "value": 0.0})
            elig_by_track[t]["count"] += 1
            elig_by_track[t]["value"] += _safe_float(r.get("task_value"))

        pot_by_track: Dict[str, Dict] = {}
        for r in potential_rows:
            t = _safe_str(r.get("task_track")) or "Unknown"
            pot_by_track.setdefault(t, {"count": 0, "value": 0.0})
            pot_by_track[t]["count"] += 1
            pot_by_track[t]["value"] += _safe_float(r.get("task_value"))

        opt_in_by_track: Dict[str, Dict] = {}
        for r in opt_in_rows:
            t = _safe_str(r.get("task_track")) or "Unknown"
            opt_in_by_track.setdefault(t, {"count": 0, "value": 0.0})
            opt_in_by_track[t]["count"] += 1
            opt_in_by_track[t]["value"] += _safe_float(r.get("task_value"))

        all_tracks = sorted(set(list(elig_by_track.keys()) + list(pot_by_track.keys()) + list(opt_in_by_track.keys())))
        by_solution = []
        for t in all_tracks:
            by_solution.append({
                "solution": t,
                "eligible_count": elig_by_track.get(t, {}).get("count", 0),
                "eligible_value": round(elig_by_track.get(t, {}).get("value", 0.0), 2),
                "potential_count": pot_by_track.get(t, {}).get("count", 0),
                "potential_value": round(pot_by_track.get(t, {}).get("value", 0.0), 2),
                "opt_in_count": opt_in_by_track.get(t, {}).get("count", 0),
                "opt_in_value": round(opt_in_by_track.get(t, {}).get("value", 0.0), 2),
            })

        return {
            "fy": fy,
            "total_eligibles": round(total_eligibles, 2),
            "n_eligibles": n_eligibles,
            "total_potential": round(total_potential, 2),
            "n_potential": n_potential,
            "total_opt_in": round(total_opt_in, 2),
            "n_opt_in": n_opt_in,
            "by_solution": by_solution,
        }
    except Exception as e:
        logger.error(f"get_lci_total_eligibles: {e}\n{traceback.format_exc()}")
        return {"fy": fy, "total_eligibles": 0.0, "total_potential": 0.0, "total_opt_in": 0.0, "n_eligibles": 0, "n_potential": 0, "n_opt_in": 0, "by_solution": []}


def get_lci_wallet_burndown(date_from: Optional[str], date_to: Optional[str], fy: Optional[int] = None) -> Dict[str, Any]:
    """
    Portfolio Burndown (esgotamento da carteira):
    Accumulated month-by-month timeline of Opt In, Converted (Approved) and Pipeline.

    - date_from / date_to: "YYYY-MM" inclusive range filter on the timeline
    - fy: when provided, KPI totals (fy_summary) are computed with the same logic as
      get_lci_summary(fy) so they match the Cisco LCI Report Financial Overview cards exactly.
    - Opt In: sum of task_value per task grouped by month of stage_start_date
    - Converted: sum of stage_amount_usd grouped by month of lci_stage_approval_date
    - Pipeline: Opt In cumulative − Converted cumulative
    """
    rows = _load_all_enriched()

    # Filter out cancelled tasks
    active = [r for r in rows if _safe_int(r.get("lci_task_status")) not in TASK_STATUS_CANCELLED]

    import pandas as pd

    # Build task_value lookup: we need task_value per task
    # Use load_cisco_lci_all to get task_value (same source as Financial Overview)
    task_value_map: Dict[int, float] = {}
    task_start_month_map: Dict[int, str] = {}  # earliest stage_start_date per task

    if _REPO_OK:
        try:
            repo = CiscoLCIRepository()
            task_rows = repo.load_cisco_lci_all(as_df=False) or []
            for r in task_rows:
                tid = _safe_int(r.get("task_id"))
                if tid:
                    task_value_map[tid] = _safe_float(r.get("task_value"))
        except Exception as e:
            logger.warning(f"get_lci_wallet_burndown: load_cisco_lci_all fallback: {e}")

    # For each task, find earliest stage_start_date (= when they opted in)
    # and also track approved stages for Converted
    task_first_start: Dict[int, str] = {}  # task_id -> earliest stage_start_date month
    seen_task_ids: set = set()

    for r in active:
        tid = _safe_int(r.get("lci_task_id"))
        if not tid:
            continue
        start_date = r.get("stage_start_date")
        if start_date:
            try:
                ts = pd.to_datetime(start_date)
                mk = f"{ts.year}-{ts.month:02d}"
                if tid not in task_first_start or mk < task_first_start[tid]:
                    task_first_start[tid] = mk
            except Exception:
                pass

    # Determine date range from data
    all_dates = list(task_first_start.values())
    for r in active:
        approval = r.get("lci_stage_approval_date")
        if approval:
            try:
                ts = pd.to_datetime(approval)
                all_dates.append(f"{ts.year}-{ts.month:02d}")
            except Exception:
                pass

    if not all_dates:
        return {"months": [], "date_from": date_from, "date_to": date_to}

    data_min = min(all_dates)
    data_max = max(all_dates)
    range_from = date_from if date_from else data_min
    range_to = date_to if date_to else data_max

    # Generate all months in range
    try:
        start_ts = pd.to_datetime(range_from + "-01")
        end_ts = pd.to_datetime(range_to + "-01")
        month_range = pd.date_range(start=start_ts, end=end_ts, freq="MS")
        months = [f"{m.year}-{m.month:02d}" for m in month_range]
    except Exception:
        return {"months": [], "date_from": date_from, "date_to": date_to}

    if not months:
        return {"months": [], "date_from": date_from, "date_to": date_to}

    # Aggregate Opt In by month (task_value per task, by earliest stage_start_date)
    opt_in_by_month: Dict[str, float] = {m: 0.0 for m in months}
    for tid, mk in task_first_start.items():
        if mk in opt_in_by_month:
            tv = task_value_map.get(tid, 0.0)
            opt_in_by_month[mk] += tv

    # Aggregate Converted by month of approval date (stage_amount_usd for approved stages)
    converted_by_month: Dict[str, float] = {m: 0.0 for m in months}
    seen_stage: set = set()
    for r in active:
        sid = _safe_int(r.get("lci_stage_id"))
        if not sid or sid in seen_stage:
            continue
        seen_stage.add(sid)
        stage_status = _safe_int(r.get("lci_stage_status_id"))
        if stage_status in STATUS_APPROVED:
            approval_date = r.get("lci_stage_approval_date")
            if approval_date:
                try:
                    ts = pd.to_datetime(approval_date)
                    mk = f"{ts.year}-{ts.month:02d}"
                    if mk in converted_by_month:
                        converted_by_month[mk] += _safe_float(r.get("stage_amount_usd"))
                except Exception:
                    pass

    # Build cumulative series
    result_months = []
    cum_opt_in = 0.0
    cum_converted = 0.0
    for m in months:
        cum_opt_in += opt_in_by_month.get(m, 0.0)
        cum_converted += converted_by_month.get(m, 0.0)
        pipeline = max(0.0, cum_opt_in - cum_converted)
        result_months.append({
            "month": m,
            "opt_in": round(cum_opt_in, 2),
            "converted": round(cum_converted, 2),
            "pipeline": round(pipeline, 2),
            "monthly_opt_in": round(opt_in_by_month.get(m, 0.0), 2),
            "monthly_converted": round(converted_by_month.get(m, 0.0), 2),
        })

    # Compute FY-scoped KPI summary (same as Cisco LCI Report Financial Overview)
    fy_summary = None
    if fy is not None:
        try:
            summary = get_lci_summary(fy)
            # Total Opt In from totalEligibles (task_value based)
            opt_in_total = 0.0
            if _REPO_OK:
                try:
                    repo = CiscoLCIRepository()
                    task_rows = repo.load_cisco_lci_all(fy=fy, as_df=False) or []
                    fy_rows = [r for r in rows if _safe_int(r.get("lci_task_status")) not in TASK_STATUS_CANCELLED]
                    fy_stage_rows = [r for r in fy_rows if r.get("lci_effective_fy") == fy]
                    opted_in_task_ids = {_safe_int(r.get("lci_task_id")) for r in fy_stage_rows}
                    CANCELLED = {4, 5}
                    seen_tids: set = set()
                    for r in task_rows:
                        tid = _safe_int(r.get("task_id"))
                        if tid in opted_in_task_ids and tid not in seen_tids:
                            if _safe_int(r.get("task_status_id")) not in CANCELLED:
                                opt_in_total += _safe_float(r.get("task_value"))
                                seen_tids.add(tid)
                except Exception:
                    opt_in_total = summary.get("fin_potential", 0.0)
            else:
                opt_in_total = summary.get("fin_potential", 0.0)

            fy_summary = {
                "fy": fy,
                "opt_in": round(opt_in_total, 2),
                "approved": summary.get("fin_approved", 0.0),
                "lost": summary.get("fin_lost", 0.0),
                "conversion_rate": round(summary.get("fin_approved", 0.0) / opt_in_total, 4) if opt_in_total > 0 else 0.0,
                "pipeline": round(opt_in_total - summary.get("fin_approved", 0.0), 2),
            }
        except Exception as e:
            logger.warning(f"get_lci_wallet_burndown fy_summary: {e}")

    return {
        "months": result_months,
        "date_from": range_from,
        "date_to": range_to,
        "data_min": data_min,
        "data_max": data_max,
        "fy_summary": fy_summary,
    }


def get_client_lci_report(company_id: int, client_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Client-scoped Adoption Cisco LCI report.

    Source rules:
    - tasks: tbTask equivalent feed via tasks API data already available in task repositories
    - approved values: stage/activity approved values from LCI repository rows
    - FY follows NTT calendar Apr -> Mar

    Safety:
    - does not alter existing Tasks or Cisco LCI report logic
    - applies a fallback filter only for Client Overview report
    """
    rows = _load_all_enriched()

    normalized_client_name = _safe_str(client_name).strip().lower()

    def _row_matches_client(row: Dict[str, Any]) -> bool:
        if _safe_int(row.get("lci_customer_id")) == company_id or _safe_int(row.get("lci_company_id")) == company_id:
            return True
        if not normalized_client_name:
            return False

        candidate_names = [
            row.get("lci_client_name"),
            row.get("lci_customer_name"),
            row.get("company_name"),
            row.get("customer_name"),
            row.get("task_customer_name"),
            row.get("task_company_name"),
        ]
        for value in candidate_names:
            if _safe_str(value).strip().lower() == normalized_client_name:
                return True
        return False

    client_rows = [r for r in rows if _row_matches_client(r)]

    seen_stage: Dict[int, Dict[str, Any]] = {}
    for r in client_rows:
        sid = _safe_int(r.get("lci_stage_id"))
        if sid and sid not in seen_stage:
            seen_stage[sid] = r

    fy_totals: Dict[int, float] = {}

    for r in seen_stage.values():
        status_id = _safe_int(r.get("lci_stage_status_id"))
        approval_value = _safe_float(r.get("lci_stage_approval_value") or r.get("activity_approved_value"))
        approval_fy = _safe_int(r.get("lci_stage_approval_fy") or r.get("activity_approval_fy"))
        approval_date = r.get("lci_stage_approval_date") or r.get("activity_approval_date")

        if not approval_fy and approval_date:
            try:
                import pandas as pd
                approval_fy = _calculate_fy(pd.to_datetime(approval_date)) or 0
            except Exception:
                approval_fy = 0

        if status_id in STATUS_APPROVED and approval_value > 0 and approval_fy:
            fy_totals[approval_fy] = fy_totals.get(approval_fy, 0.0) + approval_value

    chart = [
        {"fy": fy, "label": f"FY {fy}", "approved_value_usd": round(value, 2)}
        for fy, value in sorted(fy_totals.items())
    ]

    available_fys = sorted(set(fy_totals.keys()))
    default_fy = available_fys[-1] if available_fys else _current_fy()

    repo_task_rows: List[Dict[str, Any]] = []
    if _REPO_OK:
        try:
            repo = CiscoLCIRepository()
            repo_task_rows = repo.load_cisco_lci_all(fy=default_fy, as_df=False) or []
        except Exception as e:
            logger.warning(f"get_client_lci_report load_cisco_lci_all fallback: {e}")

    task_type_by_id: Dict[int, str] = {}
    task_owner_by_id: Dict[int, str] = {}
    for r in client_rows:
        task_id = _safe_int(r.get("lci_task_id"))
        if not task_id:
            continue
        if r.get("lci_type"):
            task_type_by_id[task_id] = r.get("lci_type")
        if r.get("lci_csm_name"):
            task_owner_by_id[task_id] = r.get("lci_csm_name")

    def _task_matches_client(row: Dict[str, Any]) -> bool:
        if _safe_int(row.get("task_customer_id")) == company_id:
            return True
        if not normalized_client_name:
            return False
        candidate_names = [
            row.get("task_customer_name"),
            row.get("customer_name"),
            row.get("company_name"),
        ]
        for value in candidate_names:
            if _safe_str(value).strip().lower() == normalized_client_name:
                return True
        return False

    task_rows = []
    seen_tasks: set[int] = set()
    for r in sorted(repo_task_rows, key=lambda x: (_safe_str(x.get("task_end_date")), _safe_int(x.get("task_id")))):
        if not _task_matches_client(r):
            continue

        task_id = _safe_int(r.get("task_id"))
        if not task_id or task_id in seen_tasks:
            continue
        seen_tasks.add(task_id)

        task_type_name = (
            r.get("task_type_name")
            or task_type_by_id.get(task_id)
            or r.get("lci_type")
        )

        task_rows.append({
            "task_id": task_id,
            "task_type_name": task_type_name,
            "task_ws": r.get("task_ws"),
            "task_value": _safe_float(r.get("task_value")),
            "task_status_id": _safe_int(r.get("task_status_id")) or None,
            "owner_name": r.get("task_owner_name") or task_owner_by_id.get(task_id),
            "status_name": r.get("task_status_name"),
            "start_date": r.get("task_start_date"),
            "end_date": r.get("task_end_date"),
            "fy": _safe_int(r.get("task_end_data_fy")) or default_fy,
        })

    if not task_rows:
        fy_start, fy_end = _fy_bounds(default_fy)
        for r in sorted(client_rows, key=lambda x: (_safe_str(x.get("lci_task_end_date")), _safe_int(x.get("lci_task_id")))):
            task_id = _safe_int(r.get("lci_task_id"))
            if not task_id or task_id in seen_tasks:
                continue
            seen_tasks.add(task_id)
            task_end = r.get("lci_task_end_date") or r.get("task_end_date") or r.get("stage_end_date")
            task_fy = _safe_int(r.get("lci_task_end_fy"))
            if not task_fy and task_end:
                try:
                    import pandas as pd
                    task_fy = _calculate_fy(pd.to_datetime(task_end)) or 0
                except Exception:
                    task_fy = 0
            if task_end:
                try:
                    import pandas as pd
                    end_date = pd.to_datetime(task_end).date()
                    if not (fy_start <= end_date <= fy_end):
                        continue
                except Exception:
                    continue
            task_rows.append({
                "task_id": task_id,
                "task_type_name": r.get("lci_type"),
                "task_ws": r.get("lci_ws") or r.get("task_ws"),
                "task_value": _safe_float(r.get("task_value")),
                "task_status_id": _safe_int(r.get("lci_task_status") or r.get("task_status_id")) or None,
                "owner_name": r.get("lci_csm_name"),
                "status_name": r.get("lci_task_status_name") or r.get("task_status_name"),
                "start_date": r.get("lci_task_start_date") or r.get("task_start_date"),
                "end_date": task_end,
                "fy": task_fy or None,
            })

    available_fys = sorted(set(fy_totals.keys()) | {row["fy"] for row in task_rows if row["fy"]})
    default_fy = available_fys[-1] if available_fys else _current_fy()
    fy_task_rows = [row for row in task_rows if row.get("fy") == default_fy]

    approved_stage_count = 0
    approved_total = 0.0
    for r in seen_stage.values():
        status_id = _safe_int(r.get("lci_stage_status_id"))
        approval_value = _safe_float(r.get("lci_stage_approval_value") or r.get("activity_approved_value"))
        approval_fy = _safe_int(r.get("lci_stage_approval_fy") or r.get("activity_approval_fy"))
        approval_date = r.get("lci_stage_approval_date") or r.get("activity_approval_date")

        if not approval_fy and approval_date:
            try:
                import pandas as pd
                approval_fy = _calculate_fy(pd.to_datetime(approval_date)) or 0
            except Exception:
                approval_fy = 0

        if status_id in STATUS_APPROVED and approval_value > 0 and approval_fy == default_fy:
            approved_stage_count += 1
            approved_total += approval_value

    return {
        "company_id": company_id,
        "current_fy": default_fy,
        "task_count": len(task_rows),
        "approved_stage_count": approved_stage_count,
        "approved_total_usd": round(approved_total, 2),
        "chart": chart,
        "tasks": fy_task_rows,
    }


def get_lci_stage_rows(fy: Optional[int], stage_status_filter: str) -> List[Dict[str, Any]]:
    """Returns stage rows filtered by status category.

    Important:
    - keep FY filtering aligned with summary/report cards
    - approved stages are scoped by approval FY when available
    - non-approved stages remain scoped by effective FY
    """
    rows = _load_all_enriched()

    status_map = {
        "approved": STATUS_APPROVED,
        "awaiting": STATUS_AWAITING,
        "ongoing": STATUS_ONGOING,
        "lost": STATUS_LOST,
    }

    filter_key = stage_status_filter.lower()

    # "all" tab — return every stage regardless of status
    if filter_key == "all":
        if fy:
            filtered = [
                r for r in rows
                if r.get("lci_effective_fy") == fy
                or _safe_int(r.get("lci_stage_approval_fy")) == fy
            ]
        else:
            filtered = rows
    else:
        target_statuses = status_map.get(filter_key, set())
        if fy:
            if filter_key == "approved":
                filtered = [
                    r for r in rows
                    if _safe_int(r.get("lci_stage_status_id")) in target_statuses
                    and (
                        _safe_int(r.get("lci_stage_approval_fy")) == fy
                        or (
                            not _safe_int(r.get("lci_stage_approval_fy"))
                            and r.get("lci_effective_fy") == fy
                        )
                    )
                ]
            else:
                filtered = [
                    r for r in rows
                    if _safe_int(r.get("lci_stage_status_id")) in target_statuses
                    and r.get("lci_effective_fy") == fy
                ]
        else:
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


# ─────────────────────────────────────────
# ENDPOINT UNIFICADO — Report Page
# Substitui 8 chamadas paralelas por 1 request
# ─────────────────────────────────────────

def get_lci_report_data(fy: Optional[int]) -> Dict[str, Any]:
    """
    Carrega dados UMA ÚNICA VEZ e retorna tudo que CiscoLCIReportPage precisa:
      summary, total_eligibles, by_stage_status, termination_status,
      burnup, yoy, lost_justification

    Substitui as chamadas paralelas:
      GET /summary + /total-eligibles + /by-stage-status + /termination-status
          + /burnup + /yoy + /lost-justification
    """
    try:
        all_rows = _load_all_enriched()
        task_rows = _load_cisco_lci_all_cached(fy)

        fy_rows = [r for r in all_rows if r.get("lci_effective_fy") == fy] if fy else all_rows

        # ── Dedup stages ────────────────────────────────────────────────────
        seen_stage: Dict[int, Dict] = {}
        for r in fy_rows:
            sid = _safe_int(r.get("lci_stage_id"))
            if sid and sid not in seen_stage:
                seen_stage[sid] = r
        stage_dedup = list(seen_stage.values())

        # ── Summary ─────────────────────────────────────────────────────────
        total_tasks = len({_safe_int(r.get("lci_task_id")) for r in fy_rows if r.get("lci_task_id")})
        total_stages = len(seen_stage)
        total_approved = sum(1 for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_APPROVED)
        total_awaiting = sum(1 for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_AWAITING)
        total_ongoing  = sum(1 for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_ONGOING)
        total_lost     = sum(1 for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_LOST)

        tasks_awaiting_opt_in = len({
            _safe_int(r.get("lci_task_id")) for r in fy_rows
            if _safe_int(r.get("lci_task_status")) in {1, 3} and not r.get("lci_stage_ws")
        })
        tasks_lost_pending = len({
            _safe_int(r.get("lci_task_id")) for r in fy_rows
            if _safe_int(r.get("lci_task_status")) in {4, 5, 6} and not r.get("lci_stage_ws")
        })

        fin_approved = sum(_safe_float(r.get("stage_amount_usd")) for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_APPROVED)
        fin_lost_val = sum(_safe_float(r.get("stage_amount_usd")) for r in stage_dedup if _safe_int(r.get("lci_stage_status_id")) in STATUS_LOST)

        CANCELLED = {4, 5}
        opted_in_task_ids = {_safe_int(r.get("lci_task_id")) for r in fy_rows if _safe_int(r.get("lci_task_status")) not in CANCELLED}
        seen_opt_in: set = set()
        fin_potential = 0.0
        for r in task_rows:
            tid = _safe_int(r.get("task_id"))
            if tid in opted_in_task_ids and tid not in seen_opt_in and _safe_int(r.get("task_status_id")) not in CANCELLED:
                fin_potential += _safe_float(r.get("task_value"))
                seen_opt_in.add(tid)

        fin_conversion = fin_approved / fin_potential if fin_potential > 0 else 0.0

        summary = {
            "fy": fy, "total_tasks": total_tasks, "total_stages": total_stages,
            "total_approved_stages": total_approved, "total_awaiting_stages": total_awaiting,
            "total_ongoing_stages": total_ongoing, "total_lost_stages": total_lost,
            "tasks_awaiting_opt_in": tasks_awaiting_opt_in,
            "tasks_lost_opt_in_pending": tasks_lost_pending,
            "fin_potential": round(fin_potential, 2),
            "fin_approved": round(fin_approved, 2),
            "fin_lost": round(fin_lost_val, 2),
            "fin_conversion_rate": round(fin_conversion, 4),
        }

        # ── Total Eligibles ──────────────────────────────────────────────────
        opt_in_all_rows = [r for r in all_rows if not fy or r.get("lci_effective_fy") == fy]
        seen_stage_elig: Dict[int, Dict] = {}
        for r in opt_in_all_rows:
            sid = _safe_int(r.get("lci_stage_id"))
            if sid and sid not in seen_stage_elig:
                seen_stage_elig[sid] = r
        opted_in_ids = {_safe_int(r.get("lci_task_id")) for r in seen_stage_elig.values()}

        total_eligibles = sum(_safe_float(r.get("task_value")) for r in task_rows)
        n_eligibles = len(task_rows)
        potential_rows = _build_potential_rows(task_rows)
        total_potential = sum(_safe_float(r.get("task_value")) for r in potential_rows)
        n_potential = len(potential_rows)
        opt_in_rows = [r for r in task_rows if _safe_int(r.get("task_id")) in opted_in_ids and _safe_int(r.get("task_status_id")) not in CANCELLED]
        total_opt_in = sum(_safe_float(r.get("task_value")) for r in opt_in_rows)
        n_opt_in = len(opt_in_rows)

        elig_by_track: Dict[str, Dict] = {}
        pot_by_track:  Dict[str, Dict] = {}
        opt_by_track:  Dict[str, Dict] = {}
        for r in task_rows:
            t = _safe_str(r.get("task_track")) or "Unknown"
            elig_by_track.setdefault(t, {"count": 0, "value": 0.0})
            elig_by_track[t]["count"] += 1
            elig_by_track[t]["value"] += _safe_float(r.get("task_value"))
        for r in potential_rows:
            t = _safe_str(r.get("task_track")) or "Unknown"
            pot_by_track.setdefault(t, {"count": 0, "value": 0.0})
            pot_by_track[t]["count"] += 1
            pot_by_track[t]["value"] += _safe_float(r.get("task_value"))
        for r in opt_in_rows:
            t = _safe_str(r.get("task_track")) or "Unknown"
            opt_by_track.setdefault(t, {"count": 0, "value": 0.0})
            opt_by_track[t]["count"] += 1
            opt_by_track[t]["value"] += _safe_float(r.get("task_value"))

        all_tracks = sorted(set(list(elig_by_track.keys()) + list(pot_by_track.keys()) + list(opt_by_track.keys())))
        by_solution = [{
            "solution": t,
            "eligible_count":  elig_by_track.get(t, {}).get("count", 0),
            "eligible_value":  round(elig_by_track.get(t, {}).get("value", 0.0), 2),
            "potential_count": pot_by_track.get(t, {}).get("count", 0),
            "potential_value": round(pot_by_track.get(t, {}).get("value", 0.0), 2),
            "opt_in_count":    opt_by_track.get(t, {}).get("count", 0),
            "opt_in_value":    round(opt_by_track.get(t, {}).get("value", 0.0), 2),
        } for t in all_tracks]

        total_eligibles_data = {
            "fy": fy, "total_eligibles": round(total_eligibles, 2), "n_eligibles": n_eligibles,
            "total_potential": round(total_potential, 2), "n_potential": n_potential,
            "total_opt_in": round(total_opt_in, 2), "n_opt_in": n_opt_in,
            "by_solution": by_solution,
        }

        # ── By Stage Status ──────────────────────────────────────────────────
        agg_status: Dict[str, Dict] = {}
        for r in stage_dedup:
            sname = _safe_str(r.get("lci_stage_status_name")) or "Unknown"
            agg_status.setdefault(sname, {"total_value": 0.0, "count": 0})
            agg_status[sname]["total_value"] += _safe_float(r.get("stage_amount_usd"))
            agg_status[sname]["count"] += 1
        by_stage_status = sorted(
            [{"status": k, "total_value": round(v["total_value"], 2), "count": v["count"]} for k, v in agg_status.items()],
            key=lambda x: x["total_value"], reverse=True
        )

        # ── Termination Status ───────────────────────────────────────────────
        approved_stages = {sid: r for sid, r in seen_stage.items() if _safe_int(r.get("lci_stage_status_id")) in STATUS_APPROVED}
        term_counts: Dict[str, int] = {}
        for r in approved_stages.values():
            ts = _safe_str(r.get("termination_status")) or "Unknown"
            term_counts[ts] = term_counts.get(ts, 0) + 1
        termination_status = [{"termination_status": k, "count": v} for k, v in sorted(term_counts.items(), key=lambda x: x[1], reverse=True)]

        # ── Burnup ───────────────────────────────────────────────────────────
        burnup = get_lci_burnup(fy) if fy else {"months": [], "fy": fy}

        # ── YoY ──────────────────────────────────────────────────────────────
        yoy = get_lci_yoy()

        # ── Lost Justification ───────────────────────────────────────────────
        cancelled_rows = [r for r in task_rows if _safe_int(r.get("task_status_id")) in CANCELLED]
        agg_just: Dict[str, Dict] = {}
        for r in cancelled_rows:
            j = _safe_str(r.get("task_status_justification")).strip() or "Not Specified"
            agg_just.setdefault(j, {"count": 0, "value": 0.0})
            agg_just[j]["count"] += 1
            agg_just[j]["value"] += _safe_float(r.get("task_value"))
        lost_justification = sorted(
            [{"justification": k, "count": v["count"], "value": round(v["value"], 2)} for k, v in agg_just.items()],
            key=lambda x: x["count"], reverse=True
        )

        return {
            "summary": summary,
            "total_eligibles": total_eligibles_data,
            "by_stage_status": by_stage_status,
            "termination_status": termination_status,
            "burnup": burnup,
            "yoy": yoy,
            "lost_justification": lost_justification,
        }

    except Exception as e:
        logger.error(f"get_lci_report_data fy={fy}: {e}\n{traceback.format_exc()}")
        return {
            "summary": None, "total_eligibles": None, "by_stage_status": [],
            "termination_status": [], "burnup": {"months": [], "fy": fy},
            "yoy": [], "lost_justification": [],
        }
