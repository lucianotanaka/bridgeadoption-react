"""
Cisco EA True Forward Service
Espelha report_cisco_true_forward.py do Streamlit.

Fontes:
  - vwCiscoEAMeteringLatest       → último snapshot de consumo por SKU/subscription
  - vwCustomerCiscoEAConsolidated → dados consolidados por cliente
  - tbTask / vwTask (type 35)     → tarefas "Consumo Excedente: CISCO EA"
  - CCW subscription report       → subscriptions importadas via CCW

Endpoint unificado:
  get_true_forward_report_data() → rows (metering+tasks) + ccw
  Frontend trata todos os filtros, KPIs e gráficos.
"""
import sys
import os
import logging
import traceback
from datetime import date
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_ROOT = "/opt/bridgeadoption"
if _ROOT not in sys.path and os.path.isdir(os.path.join(_ROOT, "src")):
    sys.path.insert(0, _ROOT)

try:
    from src.infrastructure.database.repositories.cisco_ea_repository import CiscoEARepository
    from src.infrastructure.database.repositories.task_repository import TaskRepository
    _OK = True
except ImportError as exc:
    logger.warning("TrueForward repos not available: %s", exc)
    _OK = False

# ─── Constants ────────────────────────────────────────────────────────────────

_TASK_STATUS_OPEN = {1, 2, 3}

_TASK_STATUS_LABELS: Dict[int, str] = {
    1: "Em Aberto",
    2: "Em Progresso",
    3: "Aguardando",
    4: "Cancelada",
    5: "Concluida",
    6: "Encerrada",
    10: "Aprovada",
}

_METERING_COLS = [
    "mcea_client_id",
    "mcea_subscription",
    "mcea_suite_name",
    "mcea_sku",
    "mcea_domain",
    "mcea_virtual_account",
    "mcea_status",
    "mcea_start_date",
    "mcea_end_date",
    "mcea_total_purchased",
    "mcea_generated",
    "mcea_balance",
    "mcea_update",
]


# ─── Serialisation helpers ────────────────────────────────────────────────────

def _ser_val(v: Any) -> Any:
    if v is None:
        return None
    if hasattr(v, "isoformat"):
        return v.isoformat()[:10]
    try:
        import pandas as pd
        if pd.isna(v):
            return None
    except Exception:
        pass
    return v


def _row(d: dict) -> dict:
    return {k: _ser_val(v) for k, v in d.items()}


# ─── Data loading ─────────────────────────────────────────────────────────────

def _load_and_merge() -> List[Dict[str, Any]]:
    """
    Loads vwCiscoEAMeteringLatest, merges customer names and tasks type-35.
    Computes all derived fields so the frontend can do filter + aggregate.
    """
    if not _OK:
        return []

    import pandas as pd

    try:
        ea_repo = CiscoEARepository()
        task_repo = TaskRepository()

        # ── 1. Metering (includes mcea_client for customer name) ─────────────
        try:
            from src.infrastructure.database.connection import get_sqlalchemy_engine
            engine = get_sqlalchemy_engine()
            df = pd.read_sql(
                """
                SELECT
                    mcea_client_id,
                    mcea_client,
                    mcea_subscription,
                    mcea_suite_name,
                    mcea_sku,
                    mcea_domain,
                    mcea_virtual_account,
                    mcea_status,
                    mcea_start_date,
                    mcea_end_date,
                    mcea_purchased,
                    mcea_total_purchased,
                    mcea_generated,
                    mcea_balance,
                    mcea_update
                FROM vwCiscoEAMeteringLatest
                """,
                engine,
            )
        except Exception as eq:
            logger.warning("_load_and_merge SQLAlchemy failed: %s, using repo", eq)
            df_m = ea_repo.load_measure_cisco_ea(as_df=True)
            if df_m is None or df_m.empty:
                return []
            cols_ok = [c for c in _METERING_COLS if c in df_m.columns]
            df = df_m[cols_ok].copy()

        if df is None or df.empty:
            return []

        # ── 2. Customer name from mcea_client or consolidated view ────────────
        if "mcea_client" in df.columns:
            df["customer_name"] = df["mcea_client"].where(
                df["mcea_client"].notna() & (df["mcea_client"].astype(str).str.strip() != ""),
                None,
            )
        else:
            df["customer_name"] = None

        if df["customer_name"].isna().any():
            try:
                df_c = ea_repo.load_customer_cisco_ea_consolidated(as_df=True)
                if df_c is not None and not df_c.empty and "customer_id" in df_c.columns:
                    df_cust = df_c[["customer_id", "customer_name"]].drop_duplicates("customer_id")
                    df_cust["customer_id"] = pd.to_numeric(df_cust["customer_id"], errors="coerce")
                    df["mcea_client_id"]   = pd.to_numeric(df["mcea_client_id"],   errors="coerce")
                    missing = df["customer_name"].isna()
                    df_miss = df[missing][["mcea_client_id"]].merge(
                        df_cust, left_on="mcea_client_id", right_on="customer_id", how="left"
                    )
                    df.loc[missing, "customer_name"] = df_miss["customer_name"].values
            except Exception as ce:
                logger.warning("_load_and_merge customers fallback: %s", ce)

        df["customer_name"] = df["customer_name"].where(
            df["customer_name"].notna(),
            df["mcea_client_id"].astype(str),
        )
        df.drop(columns=["mcea_client"], errors="ignore", inplace=True)

        # Ensure standard metering cols are present
        for col in _METERING_COLS:
            if col not in df.columns:
                df[col] = None

        # ── 3. Tasks type 35 ─────────────────────────────────────────────────
        df_tasks = pd.DataFrame()
        try:
            task_ids = task_repo.find_ids_by({"task_tasktype_id": 35})
            if task_ids:
                df_tasks_raw = task_repo.get_task(task_id=task_ids, as_df=True)
                if df_tasks_raw is not None and not df_tasks_raw.empty:
                    needed = [
                        "task_id", "task_customer_id", "task_ws", "task_status",
                        "task_track", "task_subtrack", "task_reference",
                        "task_start", "task_end", "task_created_date",
                    ]
                    avail = [c for c in needed if c in df_tasks_raw.columns]
                    df_tasks = df_tasks_raw[avail].copy()
                    df_tasks = df_tasks.rename(columns={
                        "task_id":           "t_task_id",
                        "task_customer_id":  "t_customer_id",
                        "task_ws":           "t_subscription",
                        "task_status":       "t_status",
                        "task_track":        "t_track",
                        "task_subtrack":     "t_subtrack",
                        "task_reference":    "t_reference",
                        "task_start":        "t_start",
                        "task_end":          "t_end",
                        "task_created_date": "t_created_date",
                    })
        except Exception as te:
            logger.warning("_load_and_merge tasks: %s", te)

        # Merge tasks (keep most recent per client+subscription)
        if (
            not df_tasks.empty
            and "t_customer_id" in df_tasks.columns
            and "t_subscription" in df_tasks.columns
        ):
            dedup = (
                df_tasks
                .sort_values("t_task_id", ascending=False)
                .drop_duplicates(subset=["t_customer_id", "t_subscription"])
            )
            df = df.merge(
                dedup,
                left_on=["mcea_client_id", "mcea_subscription"],
                right_on=["t_customer_id", "t_subscription"],
                how="left",
            )
            df.drop(columns=["t_customer_id", "t_subscription"], errors="ignore", inplace=True)
        else:
            for col in ["t_task_id", "t_status", "t_track", "t_subtrack",
                        "t_reference", "t_start", "t_end", "t_created_date"]:
                df[col] = None

        # Guarantee all task columns exist
        for col in ["t_task_id", "t_status", "t_track", "t_subtrack",
                    "t_reference", "t_start", "t_end", "t_created_date"]:
            if col not in df.columns:
                df[col] = None

        # ── 4. Derived fields ─────────────────────────────────────────────────
        today = pd.Timestamp(date.today())

        df["mcea_start_date"] = pd.to_datetime(df["mcea_start_date"], errors="coerce")
        df["mcea_end_date"]   = pd.to_datetime(df["mcea_end_date"],   errors="coerce")
        df["mcea_update"]     = pd.to_datetime(df.get("mcea_update"), errors="coerce")

        df["days_to_contract_end"] = (df["mcea_end_date"] - today).dt.days.where(
            df["mcea_end_date"].notna(), None
        )

        df["total_purchased"] = pd.to_numeric(df.get("mcea_total_purchased", 0), errors="coerce").fillna(0)
        df["total_consumed"]  = pd.to_numeric(df.get("mcea_generated",       0), errors="coerce").fillna(0)
        df["balance"]         = pd.to_numeric(df.get("mcea_balance",         0), errors="coerce").fillna(0)

        df["overconsumption"] = df["balance"].apply(lambda x: abs(float(x)) if float(x) < 0 else 0.0)
        df["consumption_pct"] = df.apply(
            lambda r: round((float(r["total_consumed"]) / float(r["total_purchased"])) * 100, 1)
            if float(r["total_purchased"]) > 0 else 0.0,
            axis=1,
        )

        df["is_overconsumption"] = (df["balance"] < 0)
        df["has_task"]           = df["t_task_id"].notna()
        df["task_is_open"]       = df["t_status"].apply(
            lambda x: (int(float(x)) in _TASK_STATUS_OPEN) if (x is not None and pd.notna(x)) else False
        )
        df["t_status_label"] = df["t_status"].apply(
            lambda x: _TASK_STATUS_LABELS.get(int(float(x)), f"Status {int(float(x))}")
            if (x is not None and pd.notna(x)) else "-"
        )

        # Serialise date columns to ISO strings
        for col in ["mcea_start_date", "mcea_end_date", "mcea_update",
                    "t_start", "t_end", "t_created_date"]:
            if col in df.columns:
                ser = pd.to_datetime(df[col], errors="coerce")
                df[col] = ser.dt.strftime("%Y-%m-%d").where(ser.notna(), None)

        # NaN → None
        df = df.where(pd.notna(df), None)
        return df.to_dict(orient="records")

    except Exception as exc:
        logger.error("_load_and_merge error: %s\n%s", exc, traceback.format_exc())
        return []


def _load_ccw() -> List[Dict[str, Any]]:
    """
    Loads CCW subscription report (load_cisco_ea_subscription_report).
    Adds _days_to_end derived field and converts ea_consumed_suite_value_percent
    from decimal to percentage.
    """
    if not _OK:
        return []

    import pandas as pd

    try:
        ea_repo = CiscoEARepository()
        df = ea_repo.load_cisco_ea_subscription_report(as_df=True)
        if df is None or df.empty:
            return []

        # Decimal → percentage
        if "ea_consumed_suite_value_percent" in df.columns:
            df["ea_consumed_suite_value_percent"] = (
                pd.to_numeric(df["ea_consumed_suite_value_percent"], errors="coerce")
                .fillna(0) * 100
            )

        # TF overage numeric
        if "tf_overage" in df.columns:
            df["tf_overage"] = pd.to_numeric(df["tf_overage"], errors="coerce").fillna(0)

        # Parse date columns
        date_cols = [
            "end_date", "next_true_forward", "start_date",
            "pending_tf_effective_date", "ea_pending_tf_effective_date",
            "ea_exceptional_growth_anniversary",
        ]
        for col in date_cols:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")

        # Days to end
        if "end_date" in df.columns:
            today = pd.Timestamp(date.today())
            df["_days_to_end"] = (df["end_date"] - today).dt.days.where(df["end_date"].notna(), None)

        # Serialise all datetime columns
        for col in df.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
            df[col] = df[col].dt.strftime("%Y-%m-%d").where(df[col].notna(), None)

        df = df.where(pd.notna(df), None)
        return df.to_dict(orient="records")

    except Exception as exc:
        logger.error("_load_ccw error: %s\n%s", exc, traceback.format_exc())
        return []


# ─── Public endpoint ──────────────────────────────────────────────────────────

def get_true_forward_report_data() -> Dict[str, Any]:
    """
    Unified endpoint for CiscoEATrueForwardPage.
    Returns:
      rows → merged metering + task rows with derived fields
      ccw  → CCW subscription rows
    Frontend handles all filtering, KPI computation and chart aggregation.
    """
    rows = _load_and_merge()
    ccw  = _load_ccw()
    return {"rows": rows, "ccw": ccw}
