"""
Public Service — Public CSM Account + Importer (Import Scheduler)
"""
import sys, os, logging, traceback
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)
_ROOT = "/opt/bridgeadoption"
if _ROOT not in sys.path and os.path.isdir(os.path.join(_ROOT, "src")):
    sys.path.insert(0, _ROOT)


def _ser(row: Dict) -> Dict:
    result = {}
    for k, v in row.items():
        if v is None: result[k] = None
        elif hasattr(v, "isoformat"): result[k] = v.isoformat()
        else:
            try:
                import pandas as pd
                if pd.isna(v): result[k] = None; continue
            except Exception: pass
            result[k] = v
    return result


def _df(df) -> List[Dict]:
    if df is None: return []
    try:
        import pandas as pd
        if isinstance(df, pd.DataFrame) and df.empty: return []
        return [_ser(dict(r)) for r in df.to_dict("records")]
    except Exception: return []


# ─── Public: CSM Account ──────────────────────────────────

def get_public_csm_account() -> List[Dict[str, Any]]:
    """
    Returns CSM Account data from AccountTeamRepository.find_all_csm_df().
    Espelha public/csm_account.py
    Columns: csm_name (CSM), client_name (CLIENT), am_name (AM), CiscoEA (EA), client_type (TYPE)
    """
    try:
        from src.infrastructure.database.repositories.account_team_repository import AccountTeamRepository
        repo = AccountTeamRepository()
        df = repo.find_all_csm_df()
        if df is None or df.empty:
            return []
        # Rename to match Streamlit display
        rename_map = {
            "csm_name": "CSM",
            "client_name": "CLIENT",
            "am_name": "AM",
            "CiscoEA": "EA",
            "client_type": "TYPE",
        }
        existing = {k: v for k, v in rename_map.items() if k in df.columns}
        df = df.rename(columns=existing)
        return _df(df)
    except Exception as e:
        logger.error(f"get_public_csm_account: {e}\n{traceback.format_exc()}"); return []


# ─── Importer: Import Control ─────────────────────────────

IMPORT_TYPES = [
    "Subscription CCW",
    "Import Company",
    "Cisco LCI - Task (6702)",
    "Cisco LCI - Activity (5890)",
    "Cisco SmartAccount Usage Fetcher (Apollo)",
    "Cisco Entreprise Agreement Usage Fetcher (Apollo)",
]

SOURCE_MAP = {
    "Subscription CCW": "CiscoSubscriptionCCW",
    "Import Company": "ImportCompany",
    "Cisco LCI - Task (6702)": "CiscoLCITask",
    "Cisco LCI - Activity (5890)": "CiscoLCIActivity",
    "Cisco SmartAccount Usage Fetcher (Apollo)": "CiscoSmartAccountUsageFetcher",
    "Cisco Entreprise Agreement Usage Fetcher (Apollo)": "CiscoEnterpriseAgreementUsageFetcher",
}


def get_import_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Returns recent import history from tbImportControl."""
    try:
        from src.infrastructure.database.connection import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT importctrl_id, importctrl_source, importctrl_file,
                   importctrl_status, importctrl_message,
                   importctrl_started, importctrl_ended, importctrl_started_by
            FROM tbImportControl
            ORDER BY importctrl_id DESC
            LIMIT %s
        """, (limit,))
        rows = cursor.fetchall() or []
        cursor.close()
        conn.close()
        return [_ser(dict(r)) for r in rows]
    except Exception as e:
        logger.error(f"get_import_history: {e}\n{traceback.format_exc()}"); return []


def schedule_import(
    import_type: str,
    scheduled_at: Optional[str] = None,
    user_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Inserts a new PENDING record in tbImportControl.
    Espelha importer.py — "Agendar importação" button logic.
    """
    source = SOURCE_MAP.get(import_type)
    if not source:
        return {"success": False, "error": f"Unknown import type: {import_type}"}

    try:
        from src.infrastructure.database.connection import get_db_connection
        scheduled_dt = scheduled_at or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        file_name = f"{source}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO tbImportControl
                (importctrl_source, importctrl_file, importctrl_status, importctrl_started, importctrl_started_by)
            VALUES (%s, %s, 'PENDING', %s, %s)
        """, (source, file_name, scheduled_dt, user_name or "react_app"))
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return {"success": True, "importctrl_id": new_id, "source": source, "scheduled_at": scheduled_dt}
    except Exception as e:
        logger.error(f"schedule_import: {e}\n{traceback.format_exc()}")
        return {"success": False, "error": str(e)}
