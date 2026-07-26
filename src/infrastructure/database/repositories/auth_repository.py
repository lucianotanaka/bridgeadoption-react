"""
    Como usar na autenticação
    1) No login:
    auth_repo = AuthRepository()

    permissions = auth_repo.load_user_permissions(user_id)

    st.session_state.permissions = permissions

    2) Função helper global
    def can(resource: str, action: str = "view") -> bool:
        return action in st.session_state.get("permissions", {}).get(resource, [])

    Arquitetura final
    user_repository.py     → autenticação (senha)
    auth_repository.py     → autorização (RBAC)
"""
import traceback
from typing import List, Dict, Optional

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class AuthRepository:

    def __init__(self):
        self.error_repo = ErrorRepository()

    # =========================================================
    # ROLE MANAGEMENT
    # =========================================================

    def list_roles(self) -> List[Dict]:
        query = """
            SELECT role_id, role_name, role_description, is_active
            FROM tbAuthRole
            ORDER BY role_name
        """
        return self._fetch_all(query)

    # =========================================================
    # USER ROLE MANAGEMENT
    # =========================================================

    def get_user_roles(self, user_id: int) -> List[Dict]:
        """
        Retorna os vínculos usuário-role ativos, trazendo também o user_role_id
        (chave primária de tbAuthUserRole), que passa a ser usado em tbAuthPermission.
        """
        query = """
            SELECT 
                ur.user_role_id,
                r.role_id,
                r.role_name
            FROM tbAuthUserRole ur
            JOIN tbAuthRole r ON r.role_id = ur.role_id
            WHERE ur.user_id = %s
              AND r.is_active = 1
        """
        return self._fetch_all(query, (user_id,))

    def assign_role_to_user(self, user_id: int, role_id: int) -> bool:
        query = """
            INSERT INTO tbAuthUserRole (user_id, role_id)
            VALUES (%s, %s)
        """
        return self._execute_commit(query, (user_id, role_id))

    def remove_role_from_user(self, user_id: int, role_id: int) -> bool:
        query = """
            DELETE FROM tbAuthUserRole
            WHERE user_id = %s AND role_id = %s
        """
        return self._execute_commit(query, (user_id, role_id))

    # =========================================================
    # PERMISSION MANAGEMENT
    # =========================================================

    def get_role_permissions(self, user_role_id: int) -> List[Dict]:
        query = """
            SELECT p.permission_id,
                   p.user_role_id,
                   r.resource_id,
                   r.resource_key,
                   a.action_id,
                   a.action_key
            FROM tbAuthPermission p
            JOIN tbAuthResource r ON r.resource_id = p.resource_id
            JOIN tbAuthAction a ON a.action_id = p.action_id
            WHERE p.user_role_id = %s
            ORDER BY r.resource_key, a.action_key
        """
        return self._fetch_all(query, (user_role_id,))

    def add_permission_to_role(self, user_role_id: int, resource_id: int, action_id: int) -> bool:
        query = """
            INSERT INTO tbAuthPermission (user_role_id, resource_id, action_id)
            SELECT %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM tbAuthPermission
                WHERE user_role_id = %s
                AND resource_id = %s
                AND action_id = %s
            )
        """
        return self._execute_commit(query, (
            user_role_id, resource_id, action_id,
            user_role_id, resource_id, action_id
        ))

    def remove_permission_from_role(self, permission_id: int) -> bool:
        query = """
            UPDATE tbAuthPermission
            SET action_id = 1
            WHERE permission_id = %s
        """
        return self._execute_commit(query, (permission_id,))

    def update_permission(self, permission_id: int, action_id: int) -> bool:
        query = """
            UPDATE tbAuthPermission
            SET action_id = %s
            WHERE permission_id = %s
        """
        return self._execute_commit(query, (action_id, permission_id))

    # =========================================================
    # ACTION / RESOURCE LIST
    # =========================================================

    def list_actions(self) -> List[Dict]:
        query = """
            SELECT action_id, action_key, action_name, is_active
            FROM tbAuthAction
            ORDER BY action_key
        """
        return self._fetch_all(query)

    def list_resources(
        self,
        only_is_active: bool = True,
    ) -> List[Dict]:
        query = """
            SELECT 
                resource_id,
                resource_key,
                resource_name,
                resource_icon,
                is_active,
                show_in_menu
            FROM tbAuthResource
        """

        if only_is_active:
            query += " WHERE is_active = 1"

        query += " ORDER BY resource_key"

        return self._fetch_all(query)

    # =========================================================
    # INTERNAL HELPERS
    # =========================================================

    def _fetch_all(self, query: str, params: tuple = ()) -> List[Dict]:
        conn = get_db_connection()
        cursor = None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall()
        except Exception as e:
            self._log_error(query, str(e))
            return []
        finally:
            if cursor is not None:
                cursor.close()
            conn.close()

    def _execute_commit(self, query: str, params: tuple) -> bool:
        conn = get_db_connection()
        cursor = None

        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            self._log_error(query, str(e))
            return False
        finally:
            if cursor is not None:
                cursor.close()
            conn.close()

    def _log_error(self, query: str, error_message: str):
        self.error_repo.log_error(
            "AuthRepository",
            query,
            error_message,
            traceback.format_exc()
        )

    # =========================================================
    # LOAD USER PERMISSIONS
    # =========================================================

    def load_user_permissions(self, user_id: int) -> Dict:
        """
        Retorna permissões estruturadas no formato:

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

            permissions = {}

            for (
                role_name,
                resource_name,
                resource_key,
                resource_icon,
                action_key,
                is_active,
                show_in_menu,
            ) in rows:

                role_name = str(role_name).upper()
                safe_resource_name = str(resource_name or resource_key).strip()

                if role_name not in permissions:
                    permissions[role_name] = {}

                permissions[role_name][safe_resource_name] = {
                    "resource_key": resource_key,
                    "resource_icon": resource_icon,
                    "action": action_key,
                    "is_active": is_active,
                    "show_in_menu": show_in_menu,
                }

            return permissions

        except Exception as e:
            self._log_error(query, str(e))
            return {}

        finally:
            if cursor is not None:
                cursor.close()
            conn.close()
