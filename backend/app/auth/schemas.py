"""
Pydantic schemas for authentication endpoints.
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel


# ─────────────────────────────────────────
# REQUEST
# ─────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class ChangeLanguageRequest(BaseModel):
    language: str  # "pt-BR" | "en-US" | "es-ES"


class ChangePasswordRequest(BaseModel):
    new_password: str


# ─────────────────────────────────────────
# RESPONSE
# ─────────────────────────────────────────

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    roles: list[str]
    permissions: Dict[str, Any]
    language: str
    theme: str = "dark"
    require_password_change: bool = False


class UserMeResponse(BaseModel):
    user_id: int
    user_name: str
    roles: list[str]
    permissions: Dict[str, Any]
    language: str


class MessageResponse(BaseModel):
    message: str
