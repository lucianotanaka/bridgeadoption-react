"""
Authentication router — endpoints:
  POST /api/auth/login
  GET  /api/auth/me
  POST /api/auth/logout
  PUT  /api/auth/language
"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.schemas import (
    ChangeLanguageRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    UserMeResponse,
)
from app.auth.service import (
    get_user_roles,
    load_admin_permissions,
    load_user_permissions,
    login_user,
    update_user_language,
    get_user_theme,
    update_user_theme,
)
from app.core.security import create_access_token, decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer_scheme = HTTPBearer()


# ─────────────────────────────────────────
# DEPENDENCY: get current user from JWT
# ─────────────────────────────────────────

def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    """
    Dependency that decodes the Bearer JWT and returns the payload.
    Raises 401 if token is missing, invalid or expired.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


# ─────────────────────────────────────────
# POST /api/auth/login
# ─────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    """
    Authenticates user with email + password.
    Returns JWT token + roles + permissions (same structure as Streamlit session_state).
    """
    user_id, user_name, language, require_change = login_user(body.email, body.password)

    if user_id == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Load roles
    roles = get_user_roles(user_id)

    # Load permissions — ADMIN gets all resources, others get their own
    if "ADMIN" in roles:
        permissions = load_admin_permissions()
    else:
        permissions = load_user_permissions(user_id)

    # Create JWT — embed user_id and user_name in payload
    access_token = create_access_token(
        data={
            "sub": str(user_id),
            "user_name": user_name,
            "roles": roles,
            "language": language,
        }
    )

    # Load user theme preference
    theme = get_user_theme(user_id)

    return LoginResponse(
        access_token=access_token,
        user_id=user_id,
        user_name=user_name,
        roles=roles,
        permissions=permissions,
        language=language,
        theme=theme,
        require_password_change=bool(require_change),
    )


# ─────────────────────────────────────────
# GET /api/auth/me
# ─────────────────────────────────────────

@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: Annotated[dict, Depends(get_current_user)]):
    """
    Returns current user info from JWT payload + fresh permissions from DB.
    """
    user_id = int(current_user.get("sub", 0))
    user_name = current_user.get("user_name", "")
    roles = current_user.get("roles", [])
    language = current_user.get("language", "en-US")

    if user_id == 0:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    if "ADMIN" in roles:
        permissions = load_admin_permissions()
    else:
        permissions = load_user_permissions(user_id)

    return UserMeResponse(
        user_id=user_id,
        user_name=user_name,
        roles=roles,
        permissions=permissions,
        language=language,
    )


# ─────────────────────────────────────────
# POST /api/auth/logout
# ─────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
def logout(current_user: Annotated[dict, Depends(get_current_user)]):
    """
    Stateless logout — client must discard the token.
    Returns a confirmation message.
    """
    return MessageResponse(message="Logged out successfully")


# ─────────────────────────────────────────
# PUT /api/auth/language
# ─────────────────────────────────────────

@router.put("/language", response_model=MessageResponse)
def change_language(
    body: ChangeLanguageRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Updates the user's preferred language in the database.
    Accepts both short codes (pt, en, es) and full codes (pt-BR, en-US, es-ES).
    """
    user_id = int(current_user.get("sub", 0))
    success = update_user_language(user_id, body.language)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid language: {body.language}. Allowed: pt, en, es (or pt-BR, en-US, es-ES)",
        )

    return MessageResponse(message=f"Language updated to {body.language}")


# ─────────────────────────────────────────
# PUT /api/auth/theme
# ─────────────────────────────────────────

from pydantic import BaseModel as _BM

class ChangeThemeRequest(_BM):
    theme: str  # "dark" or "light"

@router.put("/theme", response_model=MessageResponse)
def change_theme(
    body: ChangeThemeRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Saves user's theme preference to tbUser.user_theme."""
    user_id = int(current_user.get("sub", 0))
    success = update_user_theme(user_id, body.theme)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid theme: {body.theme}. Allowed: dark, light",
        )
    return MessageResponse(message=f"Theme updated to {body.theme}")
