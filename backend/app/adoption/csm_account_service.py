"""CSM Account Service — espelha report_csm_account.py"""
import sys, os, logging, traceback
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)
_ROOT = "/opt/bridgeadoption"
if _ROOT not in sys.path and os.path.isdir(os.path.join(_ROOT, "src")):
    sys.path.insert(0, _ROOT)

try:
    from src.infrastructure.database.repositories.user_repository import UserRepository
    _OK = True
except ImportError as e:
    logger.warning(f"CSMAccount repo not available: {e}"); _OK = False


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


def get_csm_accounts() -> List[Dict[str, Any]]:
    if not _OK: return []
    try:
        repo = UserRepository()
        df = repo.load_csm_account(as_df=True)
        if df is None or df.empty: return []
        return [_ser(dict(r)) for r in df.to_dict("records")]
    except Exception as e:
        logger.error(f"get_csm_accounts: {e}\n{traceback.format_exc()}"); return []


def get_csm_account_summary() -> Dict[str, Any]:
    rows = get_csm_accounts()
    if not rows: return {"total_accounts": 0, "total_csms": 0, "total_clients": 0, "types": []}

    csms = set()
    clients = set()
    types: Dict[str, int] = {}
    for r in rows:
        if r.get("csm_name"): csms.add(r["csm_name"])
        if r.get("client_name"): clients.add(r["client_name"])
        t = r.get("client_type") or "Unknown"
        types[t] = types.get(t, 0) + 1

    return {
        "total_accounts": len(rows),
        "total_csms": len(csms),
        "total_clients": len(clients),
        "types": [{"type": k, "count": v} for k, v in sorted(types.items(), key=lambda x: -x[1])],
    }
