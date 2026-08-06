"""
Task Reports Service — espelha task_filter_report.py, task_report_task_list.py,
task_report_task_detail.py do Streamlit.

Fluxo:
  1) GET  /tasks/reports/owners            -> lista de owners (vwFilterTaskOwner)
  2) POST /tasks/reports/filter-options    -> opções dinâmicas (task_type/client/status)
                                               cascateadas a partir dos owners selecionados
  3) POST /tasks/reports/tasks             -> tasks completas (vwTask) filtradas
                                               (usado tanto para "Task List" quanto para
                                               alimentar o seletor de "Task Details")
"""
import logging
import traceback
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    from src.infrastructure.database.repositories.task_repository import TaskRepository
    from src.infrastructure.database.repositories.task_activity_repository import TaskActivityRepository
    from src.domain.status_reclassification import reclassify_status
    _REPOS_OK = True
except ImportError as e:
    logger.warning(f"Task report repos não disponíveis: {e}")
    _REPOS_OK = False


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


def _serialize_df(df) -> List[Dict[str, Any]]:
    if df is None:
        return []
    try:
        import pandas as pd
        if isinstance(df, pd.DataFrame) and df.empty:
            return []
        return [_serialize(dict(r)) for r in df.to_dict("records")]
    except Exception:
        return []


def _sorted_unique(series) -> List[str]:
    vals = series.dropna().astype(str).drop_duplicates()
    return sorted([v for v in vals.tolist() if v.strip() and v.lower() != "none"])


def _safe_pct(value: Any) -> int:
    """Converte um valor de completude (0..1) em percentual inteiro (0..100),
    tratando None/NaN/valores inválidos com segurança (retorna 0)."""
    try:
        import pandas as pd
        if value is None:
            return 0
        if pd.isna(value):
            return 0
        return int(round(float(value) * 100))
    except Exception:
        return 0


def _safe_int(value: Any, default: int = 0) -> int:
    """Converte um valor para int, tratando None/NaN/valores inválidos com segurança."""
    try:
        import pandas as pd
        if value is None:
            return default
        if pd.isna(value):
            return default
        return int(value)
    except Exception:
        return default


# ─────────────────────────────────────────
# REPORT OWNERS  (vwFilterTaskOwner)
# ─────────────────────────────────────────

def get_report_owners() -> List[Dict[str, Any]]:
    """Retorna lista de owners disponíveis para o filtro de relatórios."""
    if not _REPOS_OK:
        return []
    try:
        repo = TaskRepository()
        df = repo.get_task_owner_filter_options(as_df=True)
        if df is None or df.empty:
            return []
        df = df.sort_values("task_owner_name").reset_index(drop=True)
        return _serialize_df(df)
    except Exception as e:
        logger.error(f"get_report_owners: {e}\n{traceback.format_exc()}")
        return []


# ─────────────────────────────────────────
# REPORT FILTER OPTIONS  (cascading, based on selected owners)
# Espelha task_filter_report.py: get_dynamic_options()
# ─────────────────────────────────────────

def get_report_filter_options(
    owner_ids: List[int],
    task_type_names: Optional[List[str]] = None,
    client_names: Optional[List[str]] = None,
    status_names: Optional[List[str]] = None,
) -> Dict[str, List[str]]:
    """
    Retorna opções dinâmicas de task_type / client / status, calculadas a partir
    do DataFrame base filtrado pelos owners selecionados, e cascateando os
    demais filtros já escolhidos (exceto a própria coluna que está sendo
    recalculada).
    """
    if not _REPOS_OK or not owner_ids:
        return {"task_types": [], "clients": [], "statuses": []}
    try:
        import pandas as pd
        repo = TaskRepository()
        df = repo.get_filtered_tasks(where={"task_owner_id": owner_ids}, as_df=True)
        if df is None or df.empty:
            return {"task_types": [], "clients": [], "statuses": []}

        df = reclassify_status(df, "task")

        def _apply(df_in, col, values):
            if not values or col not in df_in.columns:
                return df_in
            return df_in[df_in[col].astype(str).isin([str(v) for v in values])]

        # task_types: cascade client + status
        df_tt = _apply(df, "task_customer_name", client_names)
        df_tt = _apply(df_tt, "task_status_reclassified", status_names)
        task_types = _sorted_unique(df_tt["task_type_name"]) if "task_type_name" in df_tt.columns else []

        # clients: cascade task_type + status
        df_cl = _apply(df, "task_type_name", task_type_names)
        df_cl = _apply(df_cl, "task_status_reclassified", status_names)
        clients = _sorted_unique(df_cl["task_customer_name"]) if "task_customer_name" in df_cl.columns else []

        # statuses: cascade task_type + client
        df_st = _apply(df, "task_type_name", task_type_names)
        df_st = _apply(df_st, "task_customer_name", client_names)
        statuses = _sorted_unique(df_st["task_status_reclassified"]) if "task_status_reclassified" in df_st.columns else []

        return {"task_types": task_types, "clients": clients, "statuses": statuses}
    except Exception as e:
        logger.error(f"get_report_filter_options: {e}\n{traceback.format_exc()}")
        return {"task_types": [], "clients": [], "statuses": []}


# ─────────────────────────────────────────
# REPORT TASKS  (filtered vwFilterTask -> vwTask, full rows)
# Espelha task_filter_report.py: filter_tasks_dynamic() + task_report_task_list.py
# ─────────────────────────────────────────

def get_report_tasks(
    owner_ids: List[int],
    task_type_names: Optional[List[str]] = None,
    client_names: Optional[List[str]] = None,
    status_names: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Aplica todos os filtros do relatório e retorna as tasks completas (vwTask),
    ordenadas por cliente. Requer ao menos um owner selecionado (mesma regra
    do Streamlit: o relatório só carrega dados após escolher owner(s)).
    """
    if not _REPOS_OK or not owner_ids:
        return []
    try:
        repo = TaskRepository()

        filter_df = repo.get_filtered_tasks(where={"task_owner_id": owner_ids}, as_df=True)
        if filter_df is None or filter_df.empty:
            return []

        filter_df = reclassify_status(filter_df, "task")
        df = filter_df.copy()

        if task_type_names:
            df = df[df["task_type_name"].astype(str).isin(task_type_names)]
        if client_names:
            df = df[df["task_customer_name"].astype(str).isin(client_names)]
        if status_names and "task_status_reclassified" in df.columns:
            df = df[df["task_status_reclassified"].astype(str).isin(status_names)]

        if df.empty:
            return []

        selected_ids = df["task_id"].dropna().astype(int).tolist()
        task_df = repo.get_task(task_id=selected_ids, as_df=True)
        if task_df is None or task_df.empty:
            return []

        task_df = reclassify_status(task_df, "task")

        # Multiplica completed por 100 e arredonda, como no Streamlit (task_report_task_list.py)
        if "task_completed" in task_df.columns:
            import pandas as pd
            task_df["task_completed_pct"] = (
                (task_df["task_completed"].astype(float) * 100)
                .clip(upper=100)
                .round(0)
            )

        if "task_customer_name" in task_df.columns:
            task_df = task_df.sort_values(by="task_customer_name", ascending=True, na_position="last")

        return _serialize_df(task_df)
    except Exception as e:
        logger.error(f"get_report_tasks: {e}\n{traceback.format_exc()}")
        return []


# ─────────────────────────────────────────
# REPORT TASK DETAIL  (task + activities + schedule)
# Espelha task_report_task_detail.py
# ─────────────────────────────────────────

def get_report_task_detail(task_id: int) -> Dict[str, Any]:
    """
    Retorna o detalhe completo de uma task para o relatório "Task Details":
      - task: dados da task (vwTask)
      - activities: lista de atividades (ordenadas por seq)
      - schedule: linha "Task" (linha 0) + atividades, no formato do cronograma
      - activity_status_summary: contagem por status (para o gráfico de pizza)
    """
    if not _REPOS_OK or not task_id:
        return {}
    try:
        import pandas as pd

        task_repo = TaskRepository()
        activity_repo = TaskActivityRepository()

        task_df = task_repo.get_task(task_id=task_id, as_df=True)
        if task_df is None or task_df.empty:
            return {}
        task_df = reclassify_status(task_df, "task")

        activity_df = activity_repo.get_activity(task_id=task_id, activity_id=None, as_df=True)
        has_activities = activity_df is not None and not activity_df.empty

        if has_activities:
            activity_df = reclassify_status(activity_df, "activity")
            activity_df = activity_df.sort_values(by="activity_seq").reset_index(drop=True)

        task_row = task_df.iloc[0].to_dict()

        # ── Activity status summary (para o gráfico pie) ──
        if has_activities:
            summary = (
                activity_df.groupby("activity_status_name")["activity_id"]
                .count()
                .reset_index()
            )
            summary.columns = ["activity_status_name", "activity_count"]
            total = summary["activity_count"].sum()
            summary["percentage"] = summary["activity_count"] / total if total else 0
            activity_status_summary = summary.to_dict("records")
        else:
            activity_status_summary = [
                {"activity_status_name": "No activities", "activity_count": 1, "percentage": 1.0}
            ]

        # ── Schedule (linha 0 = Task, demais = atividades) ──
        schedule_rows: List[Dict[str, Any]] = []
        schedule_rows.append({
            "seq": 0,
            "name": task_row.get("task_type_name"),
            "start_expected": task_row.get("task_start"),
            "end_expected": task_row.get("task_end"),
            "start_performed": task_row.get("task_start_performed"),
            "end_performed": task_row.get("task_end_performed"),
            "effort_expected": None,
            "effort_performed": None,
            "completed_pct": _safe_pct(task_row.get("task_completed")),
            "status_name": task_row.get("task_status_name"),
            "is_task_row": True,
        })

        if has_activities:
            for _, r in activity_df.iterrows():
                schedule_rows.append({
                    "seq": _safe_int(r.get("activity_seq")) + 1,
                    "name": r.get("activity_name"),
                    "start_expected": r.get("activity_start"),
                    "end_expected": r.get("activity_end"),
                    "start_performed": r.get("activity_start_performed"),
                    "end_performed": r.get("activity_end_performed"),
                    "effort_expected": r.get("activity_effort"),
                    "effort_performed": r.get("activity_effort_performed"),
                    "completed_pct": _safe_pct(r.get("activity_completed")),
                    "status_name": r.get("activity_status_name"),
                    "is_task_row": False,
                })

        # ── Activity detail list (scope, etc.) ──
        activities_out: List[Dict[str, Any]] = []
        if has_activities:
            act_serialized = _serialize_df(activity_df)
            for a in act_serialized:
                a["activity_wbs"] = _safe_int(a.get("activity_seq")) + 1
            activities_out = act_serialized

        def _clean_row(row: Dict[str, Any]) -> Dict[str, Any]:
            cleaned = {}
            for k, v in row.items():
                if v is None:
                    cleaned[k] = None
                elif hasattr(v, "isoformat"):
                    cleaned[k] = v.isoformat()
                else:
                    try:
                        if pd.isna(v):
                            cleaned[k] = None
                            continue
                    except Exception:
                        pass
                    cleaned[k] = v
            return cleaned

        schedule_out = [_clean_row(r) for r in schedule_rows]
        summary_out = [_clean_row(r) for r in activity_status_summary]

        task_detail = _serialize_df(task_df)
        task_out = task_detail[0] if task_detail else {}

        return {
            "task": task_out,
            "activities": activities_out,
            "schedule": schedule_out,
            "activity_status_summary": summary_out,
        }
    except Exception as e:
        logger.error(f"get_report_task_detail: {e}\n{traceback.format_exc()}")
        return {}
