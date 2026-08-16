"""
Public Service — Public CSM Account + Importer (Import Scheduler)

Espelha a lógica do Streamlit importer.py para o módulo público.
"""
import logging
import os
import sys
import traceback
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_ROOT = "/opt/bridgeadoption"
if _ROOT not in sys.path and os.path.isdir(os.path.join(_ROOT, "src")):
    sys.path.insert(0, _ROOT)

try:
    from src.infrastructure.database.connection import get_db_connection
    from src.infrastructure.database.repositories.account_team_repository import AccountTeamRepository
    _REPOS_OK = True
except ImportError as e:
    logger.warning(f"Public service repos nao disponiveis: {e}")
    _REPOS_OK = False

# ─── Storage paths ──────────────────────────────────────────────────────────────
STORAGE_INPUT_DIR = Path("/home/bridgeadoption/storage/input")
STORAGE_LOGS_DIR = Path("/home/bridgeadoption/storage/logs")
STORAGE_OUTPUT_DIR = Path("/home/bridgeadoption/storage/output")
MAX_UPLOAD_BYTES = 50 * 1024 * 1024

# ─── Import type catalog ────────────────────────────────────────────────────────
IMPORT_TYPES: List[Dict[str, str]] = [
    {"label": "Subscription CCW",                                  "source": "CiscoSubscriptionCCW"},
    {"label": "Cisco LCI - Task (6702)",                           "source": "CiscoLCITask"},
    {"label": "Cisco LCI - Activity (5890)",                       "source": "CiscoLCIActivity"},
    {"label": "Cisco SmartAccount Usage Fetcher (Apollo)",         "source": "CiscoSmartAccountUsageFetcher"},
    {"label": "Cisco Enterprise Agreement Usage Fetcher (Apollo)", "source": "CiscoEnterpriseAgreementUsageFetcher"},
]


# ─── Serializer helpers ─────────────────────────────────────────────────────────

def _ser(v: Any) -> Any:
    if v is None:
        return None
    if hasattr(v, "isoformat"):
        return v.isoformat()
    try:
        import pandas as pd
        if pd.isna(v):
            return None
    except Exception:
        pass
    return v


def _df(rows: List[tuple], cols: List[str]) -> List[Dict[str, Any]]:
    return [{col: _ser(val) for col, val in zip(cols, row)} for row in rows]


# ─── Public CSM Account ─────────────────────────────────────────────────────────

def get_public_csm_account(customer_id: Optional[int] = None) -> List[Dict[str, Any]]:
    if not _REPOS_OK:
        return []
    try:
        repo = AccountTeamRepository()
        df = repo.find_all_csm_df()
        if df is None or df.empty:
            return []
        if customer_id is not None and "customer_id" in df.columns:
            df = df[df["customer_id"] == customer_id]
        return [{k: _ser(v) for k, v in r.items()} for r in df.to_dict("records")]
    except Exception as e:
        logger.error(f"get_public_csm_account: {e}")
        return []


# ─── Import History ─────────────────────────────────────────────────────────────

def get_import_history(limit: int = 50, started_by: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retorna histórico recente de importações da tbImportControl."""
    if not _REPOS_OK:
        return []
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cols = [
            "importctrl_id", "importctrl_source", "importctrl_file",
            "importctrl_status", "importctrl_message",
            "importctrl_started", "importctrl_ended", "importctrl_started_by",
        ]
        col_str = ", ".join(cols)
        if started_by:
            cur.execute(
                f"SELECT {col_str} FROM tbImportControl "
                f"WHERE importctrl_started_by = %s ORDER BY importctrl_started DESC LIMIT %s",
                (started_by, limit),
            )
        else:
            cur.execute(
                f"SELECT {col_str} FROM tbImportControl ORDER BY importctrl_started DESC LIMIT %s",
                (limit,),
            )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return _df(rows, cols)
    except Exception as e:
        logger.error(f"get_import_history: {e}\n{traceback.format_exc()}")
        return []


# ─── Schedule Import ────────────────────────────────────────────────────────────

def _is_file_already_scheduled(source: str, file_name: str) -> bool:
    """Verifica se arquivo já está PENDING ou RUNNING em tbImportControl."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM tbImportControl "
            "WHERE importctrl_source = %s AND importctrl_file = %s "
            "AND importctrl_status IN ('PENDING', 'RUNNING') LIMIT 1",
            (source, file_name),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        return row is not None
    except Exception:
        return False


def schedule_import(
    source: str,
    file_name: str,
    scheduled_at: str,
    started_by: Optional[str] = None,
) -> Dict[str, Any]:
    """Cria um registro PENDING em tbImportControl para ser processado pelo cron."""
    if not _REPOS_OK:
        return {"success": False, "error": "Repositórios indisponíveis"}
    try:
        import datetime as dt
        scheduled_at_dt = (
            dt.datetime.fromisoformat(scheduled_at)
            if isinstance(scheduled_at, str)
            else scheduled_at
        )
        if _is_file_already_scheduled(source, file_name):
            return {
                "success": False,
                "error": "Já existe uma importação agendada ou em execução para este arquivo.",
            }
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tbImportControl (
                importctrl_source, importctrl_file, importctrl_status,
                importctrl_message, importctrl_started, importctrl_ended,
                importctrl_started_by
            ) VALUES (%s, %s, %s, %s, %s, NULL, %s)
            """,
            (
                source, file_name, "PENDING",
                f"Agendado para {scheduled_at_dt.strftime('%Y-%m-%d %H:%M:%S')}",
                scheduled_at_dt, started_by,
            ),
        )
        conn.commit()
        new_id = cur.lastrowid
        cur.close()
        conn.close()
        return {"success": True, "importctrl_id": new_id, "error": None}
    except Exception as e:
        logger.error(f"schedule_import: {e}\n{traceback.format_exc()}")
        return {"success": False, "error": str(e)}


# ─── Available Files ────────────────────────────────────────────────────────────

def get_already_used_files() -> List[str]:
    """Retorna nomes de arquivos já usados em algum agendamento em tbImportControl."""
    if not _REPOS_OK:
        return []
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT importctrl_file FROM tbImportControl")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [str(r[0]) for r in rows if r[0]]
    except Exception as e:
        logger.error(f"get_already_used_files: {e}")
        return []


def list_available_files() -> List[str]:
    """
    Lista arquivos .xlsx em storage/input que ainda não foram usados em nenhum agendamento.
    Retorna lista de nomes de arquivos (sem path).
    """
    try:
        STORAGE_INPUT_DIR.mkdir(parents=True, exist_ok=True)
        physical = sorted(p.name for p in STORAGE_INPUT_DIR.glob("*.xlsx"))
    except Exception as e:
        logger.error(f"list_available_files - glob: {e}")
        return []

    used = set(get_already_used_files())
    return [f for f in physical if f not in used]


# ─── Occupied Slots ─────────────────────────────────────────────────────────────

def get_occupied_slots(days_ahead: int = 7) -> List[str]:
    """
    Retorna lista de ISO datetime strings dos slots ocupados (PENDING/RUNNING)
    nos próximos days_ahead dias, normalizados para múltiplos de 30 min.
    """
    if not _REPOS_OK:
        return []
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT importctrl_started FROM tbImportControl
            WHERE importctrl_status IN ('PENDING', 'RUNNING')
              AND importctrl_started >= CURRENT_DATE()
              AND importctrl_started < DATE_ADD(CURRENT_DATE(), INTERVAL %s DAY)
            """,
            (days_ahead,),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        import datetime as dt
        occupied = set()
        for (dt_slot,) in rows:
            if dt_slot is None:
                continue
            minute_norm = 0 if dt_slot.minute < 30 else 30
            normalized = dt_slot.replace(minute=minute_norm, second=0, microsecond=0)
            occupied.add(normalized.isoformat())
        return sorted(occupied)
    except Exception as e:
        logger.error(f"get_occupied_slots: {e}")
        return []


# ─── File Upload ─────────────────────────────────────────────────────────────────

def save_uploaded_file(filename: str, content: bytes) -> Dict[str, Any]:
    """
    Salva arquivo enviado em storage/input.
    Evita sobrescrever arquivos existentes com sufixo incremental (nome(1).xlsx).
    Retorna {success, saved_name, error}.
    """
    try:
        STORAGE_INPUT_DIR.mkdir(parents=True, exist_ok=True)
        base = Path(filename).stem
        suffix = Path(filename).suffix.lower()
        candidate = STORAGE_INPUT_DIR / f"{base}{suffix}"
        counter = 1
        while candidate.exists():
            candidate = STORAGE_INPUT_DIR / f"{base}({counter}){suffix}"
            counter += 1
        with open(candidate, "wb") as f:
            f.write(content)
        try:
            os.chmod(candidate, 0o600)
        except Exception:
            pass
        return {"success": True, "saved_name": candidate.name, "error": None}
    except Exception as e:
        logger.error(f"save_uploaded_file: {e}")
        return {"success": False, "saved_name": None, "error": str(e)}


# ─── Import Details (Log + Failed Rows) ─────────────────────────────────────────

def _get_import_row(importctrl_id: int) -> Optional[Dict[str, Any]]:
    """Busca um registro específico da tbImportControl por ID."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cols = [
            "importctrl_id", "importctrl_source", "importctrl_file",
            "importctrl_status", "importctrl_message",
            "importctrl_started", "importctrl_ended", "importctrl_started_by",
        ]
        cur.execute(
            f"SELECT {', '.join(cols)} FROM tbImportControl WHERE importctrl_id = %s LIMIT 1",
            (importctrl_id,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return None
        return {col: _ser(val) for col, val in zip(cols, row)}
    except Exception as e:
        logger.error(f"_get_import_row: {e}")
        return None


def get_log_content(importctrl_id: int) -> Dict[str, Any]:
    """
    Lê o conteúdo do arquivo .log associado a um importctrl_id.
    Padrão de nome: {origin_stem}.log em storage/logs/.
    Retorna {found, content, log_path, error}.
    """
    rec = _get_import_row(importctrl_id)
    if not rec or not rec.get("importctrl_file"):
        return {"found": False, "content": "", "log_path": None, "error": "Importação não encontrada"}

    origin_stem = Path(rec["importctrl_file"]).stem
    log_path = STORAGE_LOGS_DIR / f"{origin_stem}.log"

    if not log_path.exists():
        return {"found": False, "content": "", "log_path": str(log_path), "error": None}

    try:
        content = log_path.read_text(encoding="utf-8", errors="ignore")
        return {"found": True, "content": content, "log_path": str(log_path), "error": None}
    except Exception as e:
        return {"found": False, "content": "", "log_path": str(log_path), "error": str(e)}


def get_failed_rows(importctrl_id: int) -> Dict[str, Any]:
    """
    Lê o arquivo _failed_rows.xlsx associado a um importctrl_id.
    Padrão: {origin_stem}_failed_rows.xlsx em storage/output/.
    Retorna {found, rows, columns, failed_path, error}.
    """
    rec = _get_import_row(importctrl_id)
    if not rec or not rec.get("importctrl_file"):
        return {"found": False, "rows": [], "columns": [], "failed_path": None, "error": "Importação não encontrada"}

    origin_stem = Path(rec["importctrl_file"]).stem
    # Tenta .xlsx e .xls
    candidates = [
        STORAGE_OUTPUT_DIR / f"{origin_stem}_failed_rows.xlsx",
        STORAGE_OUTPUT_DIR / f"{origin_stem}_failed_rows.xls",
    ]
    failed_path = next((p for p in candidates if p.exists()), None)

    if not failed_path:
        return {
            "found": False,
            "rows": [],
            "columns": [],
            "failed_path": None,
            "error": None,
        }

    try:
        import pandas as pd
        df = pd.read_excel(failed_path)
        if df.empty:
            return {
                "found": True,
                "rows": [],
                "columns": list(df.columns),
                "failed_path": str(failed_path),
                "error": None,
            }
        records = df.where(df.notna(), None).to_dict("records")
        return {
            "found": True,
            "rows": [{k: _ser(v) for k, v in r.items()} for r in records],
            "columns": list(df.columns),
            "failed_path": str(failed_path),
            "error": None,
        }
    except Exception as e:
        logger.error(f"get_failed_rows: {e}")
        return {
            "found": False,
            "rows": [],
            "columns": [],
            "failed_path": str(failed_path),
            "error": str(e),
        }


# ─── Import Types ────────────────────────────────────────────────────────────────

def get_import_types() -> List[Dict[str, str]]:
    """Retorna os tipos de importação disponíveis (label + source)."""
    return IMPORT_TYPES
