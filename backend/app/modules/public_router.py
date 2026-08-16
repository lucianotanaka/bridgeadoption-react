"""
Public Router — Public CSM Account + Importer endpoints

Routers:
  public_router   — prefix /api/public  → CSM Account, history, import-types
  importer_router — prefix /api/public/importer → upload, schedule, slots, files, log, failed-rows
"""
import logging
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.security import decode_access_token
from app.modules.public_service import (
    get_public_csm_account,
    get_import_history,
    get_import_types,
    list_available_files,
    get_occupied_slots,
    save_uploaded_file,
    schedule_import,
    get_log_content,
    get_failed_rows,
    MAX_UPLOAD_BYTES,
)

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ScheduleImportRequest(BaseModel):
    source: str
    file_name: str
    scheduled_at: str       # ISO datetime string: "2026-08-15T10:00:00"
    started_by: Optional[str] = None


# ─── Public router (prefix: /api/public) ─────────────────────────────────────

public_router = APIRouter(prefix="/api/public", tags=["public"])


@public_router.get("/csm-account", response_model=List[Dict[str, Any]])
def public_csm_account(
    current_user: Annotated[dict, Depends(get_current_user)],
    customer_id: Optional[int] = Query(None),
):
    """Returns CSM Account data from AccountTeamRepository.find_all_csm_df()."""
    return get_public_csm_account(customer_id=customer_id)


@public_router.get("/importer/history", response_model=List[Dict[str, Any]])
def import_history(
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=500),
    started_by: Optional[str] = Query(None),
):
    """Returns recent import history from tbImportControl."""
    return get_import_history(limit=limit, started_by=started_by)


@public_router.get("/importer/import-types", response_model=List[Dict[str, str]])
def import_types(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns available import type options (label + source)."""
    return get_import_types()


# ─── Importer router (prefix: /api/public/importer) ─────────────────────────

importer_router = APIRouter(prefix="/api/public/importer", tags=["importer"])


@importer_router.get("/files", response_model=List[str])
def importer_files(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns .xlsx filenames in storage/input not yet scheduled."""
    return list_available_files()


@importer_router.get("/occupied-slots", response_model=List[str])
def importer_occupied_slots(
    current_user: Annotated[dict, Depends(get_current_user)],
    days_ahead: int = Query(7, ge=1, le=30),
):
    """Returns ISO datetime strings for occupied PENDING/RUNNING slots."""
    return get_occupied_slots(days_ahead=days_ahead)


@importer_router.post("/upload", response_model=Dict[str, Any])
async def importer_upload(
    current_user: Annotated[dict, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    """Accepts a .xlsx file upload and saves it to storage/input. Max 50 MB."""
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .xlsx são aceitos.")
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande. Máximo: {MAX_UPLOAD_BYTES // (1024 * 1024):.0f} MB.",
        )
    result = save_uploaded_file(filename=file.filename, content=content)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Erro ao salvar arquivo."))
    return result


@importer_router.post("/schedule", response_model=Dict[str, Any])
def schedule_import_endpoint(
    body: ScheduleImportRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Schedules a new import by inserting PENDING into tbImportControl."""
    if not body.source or not body.file_name or not body.scheduled_at:
        raise HTTPException(status_code=400, detail="source, file_name e scheduled_at são obrigatórios.")
    started_by = body.started_by or current_user.get("user_name") or current_user.get("sub")
    result = schedule_import(
        source=body.source,
        file_name=body.file_name,
        scheduled_at=body.scheduled_at,
        started_by=started_by,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Falha ao agendar importação."))
    return result


@importer_router.get("/{importctrl_id}/log", response_model=Dict[str, Any])
def importer_log(
    importctrl_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns log file content for a given importctrl_id."""
    return get_log_content(importctrl_id=importctrl_id)


@importer_router.get("/{importctrl_id}/failed-rows", response_model=Dict[str, Any])
def importer_failed_rows(
    importctrl_id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Returns failed rows data for a given importctrl_id."""
    return get_failed_rows(importctrl_id=importctrl_id)
