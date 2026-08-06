"""
LCI Eligible Status Service — mirrors webapp/pages/adoption/report_lci_eligible_status.py
(Streamlit) for the React frontend.

Business rules:
  Status category: Not Started (1,3) / In Progress (2) / Lost (6) / Success (8,9,10)
  Value rule: Success uses lci_stage_approval_value; others use lci_stage_value
  Fiscal year: April -> March
"""
import sys, os, logging, traceback
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
    logger.warning(f"CiscoLCIRepository not available: {e}")
    _REPO_OK = False

EXEC_CATEGORIES = ["Not Started", "In Progress", "Lost", "Success"]
MONTH_NAMES_EN = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
                  7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]


def _current_fy() -> int:
    today = date.today()
    return today.year if today.month >= 4 else today.year - 1


def _map_status_category(sid) -> str:
    try:
        sid = int(sid) if sid is not None else None
    except (TypeError, ValueError):
        sid = None
    if sid in (1, 3) or sid is None:
        return "Not Started"
    if sid == 2:
        return "In Progress"
    if sid == 6:
        return "Lost"
    if sid in (8, 9, 10):
        return "Success"
    return "Not Started"


def _stage_list_with_counts(names, max_items: int = 8) -> str:
    import pandas as pd
    clean = [str(n).strip() for n in names if n is not None and str(n).strip()]
    if not clean:
        return "-"
    counts = pd.Series(clean).value_counts().sort_index()
    items = [f"{s} ({q})" for s, q in counts.items()]
    if len(items) <= max_items:
        return ", ".join(items)
    return ", ".join(items[:max_items]) + f", +{len(items) - max_items} more"


def _prepare_df(stage_df):
    import pandas as pd
    if stage_df is None or stage_df.empty:
        return pd.DataFrame()

    df = stage_df.copy()
    numeric_cols = ["lci_stage_value", "lci_stage_approval_value"]
    text_cols = ["lci_stage_name", "lci_stage_status_name", "lci_stage_ws", "lci_ws",
                 "lci_deal_id", "lci_client_name", "lci_track", "lci_use_case"]
    for c in numeric_cols:
        if c not in df.columns:
            df[c] = 0.0
    for c in text_cols:
        if c not in df.columns:
            df[c] = ""
    for c in ["lci_stage_end", "lci_stage_start"]:
        if c not in df.columns:
            df[c] = pd.NaT
    if "lci_stage_status_id" not in df.columns:
        df["lci_stage_status_id"] = pd.NA
    if "lci_stage_end_fy" not in df.columns:
        df["lci_stage_end_fy"] = pd.NA

    df["lci_stage_end"] = pd.to_datetime(df["lci_stage_end"], errors="coerce")
    df["lci_stage_start"] = pd.to_datetime(df["lci_stage_start"], errors="coerce")
    df["lci_stage_status_id"] = pd.to_numeric(df["lci_stage_status_id"], errors="coerce")
    df["lci_stage_value"] = pd.to_numeric(df["lci_stage_value"], errors="coerce").fillna(0.0)
    df["lci_stage_approval_value"] = pd.to_numeric(df["lci_stage_approval_value"], errors="coerce").fillna(0.0)
    for c in text_cols:
        df[c] = df[c].fillna("").astype(str).str.strip()

    fy_from_date = df["lci_stage_end"].dt.year.where(df["lci_stage_end"].dt.month >= 4, df["lci_stage_end"].dt.year - 1)
    df["lci_stage_end_fy"] = pd.to_numeric(df["lci_stage_end_fy"], errors="coerce")
    df["lci_stage_end_fy"] = df["lci_stage_end_fy"].fillna(fy_from_date)

    df["status_category"] = df["lci_stage_status_id"].apply(_map_status_category)
    df["value_usd"] = df["lci_stage_value"].where(df["status_category"] != "Success", df["lci_stage_approval_value"])

    df["month"] = df["lci_stage_end"].dt.month
    df["month_name"] = df["month"].map(MONTH_NAMES_EN)
    month_rank = {m: i for i, m in enumerate(FY_MONTH_ORDER)}
    df["month_fy_order"] = df["month"].map(month_rank)
    year_part = df["lci_stage_end"].dt.year
    df["month_year_label"] = df["month_name"].fillna("") + "/" + year_part.fillna(0).astype("Int64").astype(str)

    return df


def _load_prepared_df():
    import pandas as pd
    if not _REPO_OK:
        return pd.DataFrame()
    try:
        repo = CiscoLCIRepository()
        stage_df = repo.get_lci_eligible_stages_status(fy=None, as_df=True)
        return _prepare_df(stage_df)
    except Exception as e:
        logger.error(f"_load_prepared_df: {e}\n{traceback.format_exc()}")
        return pd.DataFrame()


def get_lci_eligible_status_fiscal_years() -> List[int]:
    df = _load_prepared_df()
    if df.empty:
        return []
    vals = df["lci_stage_end_fy"].dropna().astype(int).unique().tolist()
    return sorted(vals)


def _build_month_category_base(fy_values: List[int]):
    import pandas as pd
    rows = []
    for fy in fy_values:
        for idx, month in enumerate(FY_MONTH_ORDER):
            for cat in EXEC_CATEGORIES:
                cal_year = fy if month >= 4 else fy + 1
                rows.append({
                    "lci_stage_end_fy": fy, "month_fy_order": idx, "month": month,
                    "month_year_label": f"{MONTH_NAMES_EN[month]}/{cal_year}",
                    "status_category": cat,
                })
    return pd.DataFrame(rows)


def get_lci_eligible_status_exec_chart(fy: int) -> Dict[str, Any]:
    """Executive monthly chart: 4 categories x months, with count/value/stage summary."""
    import pandas as pd

    df = _load_prepared_df()
    df = df[df["lci_stage_end_fy"] == fy] if not df.empty else df

    base_df = _build_month_category_base([fy])

    if df.empty:
        base_df["count_stages"] = 0
        base_df["sum_value_usd"] = 0.0
        base_df["total_count_month"] = 0
        base_df["pct_of_month"] = 0.0
        base_df["stages_summary"] = "-"
        series = base_df
    else:
        agg = df.groupby(
            ["lci_stage_end_fy", "month_fy_order", "month", "month_year_label", "status_category"],
            as_index=False,
        ).agg(
            count_stages=("lci_stage_name", "size"),
            sum_value_usd=("value_usd", "sum"),
            stages_list=("lci_stage_name", lambda x: list(x)),
        )
        agg["stages_summary"] = agg["stages_list"].apply(_stage_list_with_counts)
        agg = agg.drop(columns=["stages_list"])

        series = base_df.merge(
            agg, on=["lci_stage_end_fy", "month_fy_order", "month", "month_year_label", "status_category"], how="left"
        )
        series["count_stages"] = series["count_stages"].fillna(0).astype(int)
        series["sum_value_usd"] = series["sum_value_usd"].fillna(0.0)
        series["stages_summary"] = series["stages_summary"].fillna("-")

        total_month = series.groupby(
            ["lci_stage_end_fy", "month_fy_order", "month", "month_year_label"], as_index=False
        )["count_stages"].sum().rename(columns={"count_stages": "total_count_month"})
        series = series.merge(total_month, on=["lci_stage_end_fy", "month_fy_order", "month", "month_year_label"], how="left")
        series["total_count_month"] = series["total_count_month"].fillna(0).astype(int)
        series["pct_of_month"] = series.apply(
            lambda r: 0.0 if r["total_count_month"] == 0 else r["count_stages"] / r["total_count_month"], axis=1
        )

    series = series.sort_values(["month_fy_order", "status_category"]).reset_index(drop=True)

    categories_out = {}
    for cat in EXEC_CATEGORIES:
        cat_df = series[series["status_category"] == cat].sort_values("month_fy_order")
        categories_out[cat] = [
            {
                "month_year_label": row["month_year_label"],
                "month_fy_order": int(row["month_fy_order"]),
                "count": int(row["count_stages"]),
                "value_usd": round(float(row["sum_value_usd"]), 2),
                "pct_of_month": round(float(row["pct_of_month"]), 4),
                "stages_summary": row["stages_summary"],
            }
            for _, row in cat_df.iterrows()
        ]

    months_order = [f"{MONTH_NAMES_EN[m]}/{fy if m >= 4 else fy + 1}" for m in FY_MONTH_ORDER]

    return {"fy": fy, "months_order": months_order, "categories": categories_out}


# ─────────────────────────────────────────
# ANALYTICAL BREAKDOWN BY CATEGORY (stage composition, stacked by month)
# ─────────────────────────────────────────

def _build_month_stage_base(fy: int, stage_names: List[str]):
    import pandas as pd
    rows = []
    for idx, month in enumerate(FY_MONTH_ORDER):
        cal_year = fy if month >= 4 else fy + 1
        month_label = f"{MONTH_NAMES_EN[month]}/{cal_year}"
        for stage_name in stage_names:
            rows.append({"month_fy_order": idx, "month": month, "month_year_label": month_label, "lci_stage_name": stage_name})
    return pd.DataFrame(rows)


def get_lci_eligible_status_category_breakdown(fy: int, category: str) -> Dict[str, Any]:
    """Stage composition (stacked) for a single executive category, month by month."""
    import pandas as pd

    df = _load_prepared_df()
    if df.empty:
        return {"fy": fy, "category": category, "months_order": [], "stages": {}}

    fy_df = df[df["lci_stage_end_fy"] == fy]
    cat_df = fy_df[fy_df["status_category"] == category]

    months_order = [f"{MONTH_NAMES_EN[m]}/{fy if m >= 4 else fy + 1}" for m in FY_MONTH_ORDER]

    if cat_df.empty:
        return {"fy": fy, "category": category, "months_order": months_order, "stages": {}}

    stage_names = sorted(cat_df["lci_stage_name"].dropna().astype(str).unique().tolist())
    base_df = _build_month_stage_base(fy=fy, stage_names=stage_names)

    breakdown = cat_df.groupby(
        ["month_fy_order", "month_year_label", "lci_stage_name"], as_index=False
    )["value_usd"].sum().rename(columns={"value_usd": "sum_value_usd"})

    category_month_total = cat_df.groupby(
        ["month_fy_order", "month_year_label"], as_index=False
    )["value_usd"].sum().rename(columns={"value_usd": "category_month_total_usd"})

    month_total = fy_df.groupby(
        ["month_fy_order", "month_year_label"], as_index=False
    )["value_usd"].sum().rename(columns={"value_usd": "month_total_usd"})

    breakdown = breakdown.merge(category_month_total, on=["month_fy_order", "month_year_label"], how="left")
    breakdown = breakdown.merge(month_total, on=["month_fy_order", "month_year_label"], how="left")

    breakdown["pct_in_category_month"] = breakdown.apply(
        lambda r: 0.0 if r["category_month_total_usd"] == 0 else r["sum_value_usd"] / r["category_month_total_usd"], axis=1
    )
    breakdown["pct_in_total_month"] = breakdown.apply(
        lambda r: 0.0 if r["month_total_usd"] == 0 else r["sum_value_usd"] / r["month_total_usd"], axis=1
    )

    merged = base_df.merge(breakdown, on=["month_fy_order", "month_year_label", "lci_stage_name"], how="left")
    merged["sum_value_usd"] = merged["sum_value_usd"].fillna(0.0)
    merged["pct_in_category_month"] = merged["pct_in_category_month"].fillna(0.0)
    merged["pct_in_total_month"] = merged["pct_in_total_month"].fillna(0.0)
    merged = merged.sort_values(["month_fy_order", "lci_stage_name"]).reset_index(drop=True)

    stages_out = {}
    for stage_name in stage_names:
        stage_rows = merged[merged["lci_stage_name"] == stage_name].sort_values("month_fy_order")
        stages_out[stage_name] = [
            {
                "month_year_label": row["month_year_label"],
                "month_fy_order": int(row["month_fy_order"]),
                "value_usd": round(float(row["sum_value_usd"]), 2),
                "pct_in_category_month": round(float(row["pct_in_category_month"]), 4),
                "pct_in_total_month": round(float(row["pct_in_total_month"]), 4),
            }
            for _, row in stage_rows.iterrows()
        ]

    return {"fy": fy, "category": category, "months_order": months_order, "stages": stages_out}


# ─────────────────────────────────────────
# TABLE 1 — EXECUTIVE PORTFOLIO SUMMARY
# ─────────────────────────────────────────

def get_lci_eligible_status_portfolio_summary(fy: Optional[int] = None) -> List[Dict[str, Any]]:
    df = _load_prepared_df()
    if df.empty:
        return []

    if fy is not None:
        df = df[df["lci_stage_end_fy"] == fy]
    if df.empty:
        return []

    df = df.copy()
    df["_not_start"] = (df["status_category"] == "Not Started").astype(int)
    df["_in_progress"] = (df["status_category"] == "In Progress").astype(int)
    df["_lost"] = (df["status_category"] == "Lost").astype(int)
    df["_success"] = (df["status_category"] == "Success").astype(int)
    df["_open_value_usd"] = df["lci_stage_value"].where(df["status_category"].isin(["Not Started", "In Progress"]), 0.0)
    df["_success_value_usd"] = df["lci_stage_approval_value"].where(df["status_category"] == "Success", 0.0)

    stage_key_col = "lci_stage_ws" if "lci_stage_ws" in df.columns else "lci_stage_name"

    summary = df.groupby(["lci_client_name", "lci_track", "lci_use_case"], dropna=False).agg(
        total_stages=(stage_key_col, "count"),
        not_start=("_not_start", "sum"),
        in_progress=("_in_progress", "sum"),
        lost=("_lost", "sum"),
        success=("_success", "sum"),
        total_stage_value_usd=("lci_stage_value", "sum"),
        approval_value_usd=("lci_stage_approval_value", "sum"),
        open_value_usd=("_open_value_usd", "sum"),
        success_value_usd=("_success_value_usd", "sum"),
    ).reset_index().rename(columns={"lci_client_name": "client", "lci_track": "solution_track", "lci_use_case": "use_case"})

    summary = summary.sort_values(by=["total_stage_value_usd", "client", "solution_track"], ascending=[False, True, True])

    result = []
    for _, row in summary.iterrows():
        result.append({
            "client": row["client"],
            "solution_track": row["solution_track"],
            "use_case": row["use_case"],
            "total_stages": int(row["total_stages"]),
            "not_start": int(row["not_start"]),
            "in_progress": int(row["in_progress"]),
            "lost": int(row["lost"]),
            "success": int(row["success"]),
            "total_stage_value_usd": round(float(row["total_stage_value_usd"]), 2),
            "approval_value_usd": round(float(row["approval_value_usd"]), 2),
            "open_value_usd": round(float(row["open_value_usd"]), 2),
            "success_value_usd": round(float(row["success_value_usd"]), 2),
        })
    return result


# ─────────────────────────────────────────
# TABLE 2 — STAGE EXECUTION DETAIL
# ─────────────────────────────────────────

def get_lci_eligible_status_execution_detail(fy: Optional[int] = None) -> List[Dict[str, Any]]:
    import pandas as pd

    df = _load_prepared_df()
    if df.empty:
        return []

    if fy is not None:
        df = df[df["lci_stage_end_fy"] == fy]
    if df.empty:
        return []

    df = df.copy()
    month_date = df["lci_stage_end"].where(df["lci_stage_end"].notna(), df["lci_stage_start"])
    df["_month"] = month_date.dt.strftime("%b/%Y").fillna("")

    detail = df[[
        "lci_client_name", "lci_deal_id", "lci_ws", "lci_stage_ws", "lci_stage_name",
        "lci_track", "lci_use_case", "lci_stage_status_name", "status_category",
        "lci_stage_value", "lci_stage_approval_value", "lci_stage_start", "lci_stage_end",
    ]].copy()

    detail["_month"] = df["_month"]
    detail["_sort_date"] = month_date.fillna(pd.Timestamp.max)

    detail = detail.sort_values(
        by=["_sort_date", "lci_client_name", "lci_deal_id", "lci_ws", "lci_stage_ws"]
    ).reset_index(drop=True)

    result = []
    for _, row in detail.iterrows():
        result.append({
            "client": row["lci_client_name"],
            "deal_id": row["lci_deal_id"],
            "lci_ws": row["lci_ws"],
            "stage_ws": row["lci_stage_ws"],
            "stage_name": row["lci_stage_name"],
            "track": row["lci_track"],
            "use_case": row["lci_use_case"],
            "month": row["_month"],
            "status": row["lci_stage_status_name"],
            "executive_category": row["status_category"],
            "stage_value_usd": round(float(row["lci_stage_value"]), 2),
            "approval_value_usd": round(float(row["lci_stage_approval_value"]), 2),
            "stage_start": row["lci_stage_start"].strftime("%Y-%m-%d") if pd.notna(row["lci_stage_start"]) else None,
            "stage_end": row["lci_stage_end"].strftime("%Y-%m-%d") if pd.notna(row["lci_stage_end"]) else None,
        })
    return result
