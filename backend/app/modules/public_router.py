"""
Public Router — Public CSM Account + Importer
"""
import logging
from typing import Annotated, Any, Dict, List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.modules.public_service import (
    get_public_csm_account, get_import_history, schedule_import, IMPORT_TYPES,
)
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)]) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    return payload


public_router = APIRouter(prefix="/api/public", tags=["public"])


@public_router.get("/csm-account", response_model=List[Dict[str, Any]])
def public_csm_account(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns CSM Account data (AccountTeamRepository.find_all_csm_df)."""
    return get_public_csm_account()


importer_router = APIRouter(prefix="/api/importer", tags=["importer"])


@importer_router.get("/types", response_model=List[str])
def import_types(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns available import types."""
    return IMPORT_TYPES


@importer_router.get("/history", response_model=List[Dict[str, Any]])
def import_history(current_user: Annotated[dict, Depends(get_current_user)], limit: int = Query(50)):
    """Returns recent import history from tbImportControl."""
    return get_import_history(limit)


class ScheduleImportRequest(BaseModel):
    import_type: str
    scheduled_at: Optional[str] = None


@importer_router.post("/schedule", response_model=Dict[str, Any])
def schedule_import_endpoint(
    body: ScheduleImportRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Schedules a new import by inserting into tbImportControl."""
    user_name = current_user.get("user_name", current_user.get("sub", "react_app"))
    return schedule_import(
        import_type=body.import_type,
        scheduled_at=body.scheduled_at,
        user_name=str(user_name),
    )
