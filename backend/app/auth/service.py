"""
Authentication service — mirrors UserRepository.login() and AuthRepository
from Z:/bridgeadoption/src/infrastructure/database/repositories/
"""
import hashlib
import logging
import traceback
from typing import Any, Dict, List, Optional, Tuple

import bcrypt

from app.core.database import get_db_connection

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────
# USER LOGIN
# ─────────────────────────────────────────

def login_user(email: str, password: str) -> Tuple[int, str, str, int]:
    """
    Validates credentials against tbUser.
    Supports bcrypt hashes and SHA256 legacy hashes (with auto-migration).

    Returns:
        (user_id, user_name, user_language, user_change_passwd)
        user_id = 0 means invalid credentials.
    """
    query = """
        SELECT
            user_id,
            user_name,
            user_email,
            user_language,
            user_change_passwd,
            user_password
        FROM tbUser
        WHERE user_email = %s
    """

    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor()
        cursor.execute(query, (email,))
        result = cursor.fetchone()

        if not result:
            return 0, "", "en-US", 0

        user_id, user_name, user_email, user_language, user_change_passwd, stored_password = result

        if not stored_password:
            return 0, "", "en-US", 0

        # bcrypt hash
        if stored_password.startswith("$2"):
            if not bcrypt.checkpw(password.encode(), stored_password.encode()):
                return 0, "", "en-US", 0

        # SHA256 legacy hash (64 hex chars) — auto-migrate to bcrypt
        elif len(stored_password) == 64:
            sha256_input = hashlib.sha256(password.encode()).hexdigest()
            if sha256_input != stored_password:
                return 0, "", "en-US", 0
            # Migrate to bcrypt
            new_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            _update_password_hash(user_id, new_hash)

        else:
            return 0, "", "en-US", 0

        language = user_language or "en-US"
        change_passwd = int(user_change_passwd) if user_change_passwd is not None else 0

        return user_id, user_name or "", language, change_passwd

    except Exception as e:
        logger.error(f"login_user error: {e}\n{traceback.format_exc()}")
        return 0, "", "en-US", 0

    finally:
        if cursor:
            cursor.close()
        conn.close()


def _update_password_hash(user_id: int, new_hash: str) -> None:
    """Migrates legacy SHA256 password hash to bcrypt."""
    conn = get_db_connection()
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE tbUser SET user_password = %s WHERE user_id = %s",
            (new_hash, user_id),
        )
        conn.commit()
    except Exception as e:
        logger.warning(f"Password migration failed for user {user_id}: {e}")
    finally:
        if cursor:
            cursor.close()
        conn.close()


# ─────────────────────────────────────────
# ROLES
# ─────────────────────────────────────────

def get_user_roles(user_id: int) -> List[str]:
    """
    Returns list of role names (UPPERCASE) for a user.
    Mirrors AuthRepository.get_user_roles()
    """
    query = """
        SELECT r.role_name
        FROM tbAuthUserRole ur
        JOIN tbAuthRole r ON r.role_id = ur.role_id
        WHERE ur.user_id = %s
          AND r.is_active = 1
    """

    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor()
        cursor.execute(query, (user_id,))
        rows = cursor.fetchall()
        return [str(row[0]).upper() for row in rows]
    except Exception as e:
        logger.error(f"get_user_roles error: {e}")
        return []
    finally:
        if cursor:
            cursor.close()
        conn.close()


# ─────────────────────────────────────────
# PERMISSIONS
# ─────────────────────────────────────────

def load_user_permissions(user_id: int) -> Dict[str, Any]:
    """
    Returns permissions in the same structure used by the Streamlit app:

    {
        "ROLE_NAME": {
            "Resource Name": {
                "resource_key": str,
                "resource_icon": str,
                "action": str,
                "is_active": int,
                "show_in_menu": int
            }
        }
    }

    Mirrors AuthRepository.load_user_permissions()
    """
    query = """
        SELECT
            ro.role_name,
            re.resource_name,
            re.resource_key,
            re.resource_icon,
            ac.action_key,
            re.is_active,
            re.show_in_menu
        FROM tbAuthUserRole ur
        JOIN tbAuthRole ro
            ON ro.role_id = ur.role_id
        JOIN tbAuthPermission pe
            ON pe.user_role_id = ur.user_role_id
        JOIN tbAuthResource re
            ON re.resource_id = pe.resource_id
        JOIN tbAuthAction ac
            ON ac.action_id = pe.action_id
        WHERE ur.user_id = %s
          AND pe.action_id > 1
          AND ro.is_active = 1
        ORDER BY ro.role_name, re.resource_name
    """

    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor()
        cursor.execute(query, (user_id,))
        rows = cursor.fetchall()

        permissions: Dict[str, Any] = {}

        for (
            role_name,
            resource_name,
            resource_key,
            resource_icon,
            action_key,
            is_active,
            show_in_menu,
        ) in rows:
            role_upper = str(role_name).upper()
            safe_name = str(resource_name or resource_key).strip()

            if role_upper not in permissions:
                permissions[role_upper] = {}

            permissions[role_upper][safe_name] = {
                "resource_key": resource_key,
                "resource_icon": resource_icon,
                "action": action_key,
                "is_active": int(is_active) if is_active is not None else 1,
                "show_in_menu": int(show_in_menu) if show_in_menu is not None else 0,
            }

        return permissions

    except Exception as e:
        logger.error(f"load_user_permissions error: {e}\n{traceback.format_exc()}")
        return {}

    finally:
        if cursor:
            cursor.close()
        conn.close()


# ─────────────────────────────────────────
# PERMISSIONS FOR ADMIN
# ─────────────────────────────────────────

def load_admin_permissions() -> Dict[str, Any]:
    """
    For ADMIN users: returns ALL active resources grouped by domain.
    Mirrors app.py group_role_resources_for_admin()
    """
    query = """
        SELECT
            resource_id,
            resource_key,
            resource_name,
            resource_icon,
            is_active,
            show_in_menu
        FROM tbAuthResource
        WHERE is_active = 1
        ORDER BY resource_key
    """

    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        rows = cursor.fetchall()

        grouped: Dict[str, Any] = {}

        for resource in rows:
            resource_key = resource.get("resource_key", "")
            if not resource_key or "." not in resource_key:
                continue

            role_part, _ = resource_key.split(".", 1)
            role_name = role_part.upper()

            if role_name not in grouped:
                grouped[role_name] = {}

            safe_name = str(resource.get("resource_name") or resource_key).strip()

            grouped[role_name][safe_name] = {
                "resource_key": resource_key,
                "resource_icon": resource.get("resource_icon"),
                "action": "full",
                "is_active": int(resource.get("is_active", 1)),
                "show_in_menu": int(resource.get("show_in_menu", 1)),
            }

        return grouped

    except Exception as e:
        logger.error(f"load_admin_permissions error: {e}")
        return {}

    finally:
        if cursor:
            cursor.close()
        conn.close()


# ─────────────────────────────────────────
# UPDATE LANGUAGE
# ─────────────────────────────────────────

# Language mapping: short codes → full codes stored in DB
_LANG_MAP = {
    "pt": "pt-BR", "pt-BR": "pt-BR",
    "en": "en-US", "en-US": "en-US",
    "es": "es-ES", "es-ES": "es-ES",
}

def get_user_theme(user_id: int) -> str:
    """Returns user's saved theme preference ('dark' or 'light'). Defaults to 'dark'."""
    conn = get_db_connection()
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT user_theme FROM tbUser WHERE user_id = %s", (user_id,))
        row = cursor.fetchone()
        if row and row[0] in ("dark", "light"):
            return str(row[0])
        return "dark"
    except Exception:
        return "dark"
    finally:
        if cursor: cursor.close()
        conn.close()


def update_user_theme(user_id: int, theme: str) -> bool:
    """Saves user's theme preference ('dark' or 'light') to tbUser."""
    if theme not in ("dark", "light"):
        return False
    conn = get_db_connection()
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE tbUser SET user_theme = %s WHERE user_id = %s", (theme, user_id))
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"update_user_theme error: {e}")
        return False
    finally:
        if cursor: cursor.close()
        conn.close()


def update_user_language(user_id: int, language: str) -> bool:
    """Updates the preferred language for a user. Accepts both pt/en/es and pt-BR/en-US/es-ES."""
    normalized = _LANG_MAP.get(language)
    if not normalized:
        return False
    language = normalized

    conn = get_db_connection()
    cursor = None

    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE tbUser SET user_language = %s WHERE user_id = %s",
            (language, user_id),
        )
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"update_user_language error: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        conn.close()
