"""
ProjectTypeRepository

Responsável por operações relacionadas à tabela tbProjectType.
"""

from typing import List, Dict, Any
import traceback

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class ProjectTypeRepository:
    """
    Repository responsável pela tabela tbProjectType.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    def get_types_by_project(self, project_id: int) -> List[Dict[str, Any]]:
        query = """
            SELECT *
            FROM tbProjectType
            WHERE projecttp_project_id = %s
            ORDER BY projecttp_id
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (project_id,))
            return cursor.fetchall()
        except Exception as e:
            self.error_repo.log_error(
                error_function="ProjectTypeRepository.get_types_by_project",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return []
        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def ensure_type(self, project_id: int, project_type: str) -> int:
        """
        Garante a existência de um tipo para o projeto sem duplicar.
        Reaproveita registros vagos (projecttp_project_id = 0), se houver.
        """

        clean_type = str(project_type or "").strip()
        if not project_id or not clean_type:
            return 0

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)

            existing_query = """
                SELECT projecttp_id
                FROM tbProjectType
                WHERE projecttp_project_id = %s
                  AND projecttp_type = %s
                ORDER BY projecttp_id
                LIMIT 1
            """
            cursor.execute(existing_query, (project_id, clean_type))
            row = cursor.fetchone()
            if row:
                return int(row["projecttp_id"])

            vacant_query = """
                SELECT MIN(projecttp_id) AS projecttp_id
                FROM tbProjectType
                WHERE projecttp_project_id = 0
            """
            cursor.execute(vacant_query)
            vacant = cursor.fetchone()
            vacant_id = int((vacant or {}).get("projecttp_id", 0) or 0)

            if vacant_id > 0:
                update_query = """
                    UPDATE tbProjectType
                    SET projecttp_project_id = %s,
                        projecttp_type = %s
                    WHERE projecttp_id = %s
                """
                cursor.execute(update_query, (project_id, clean_type, vacant_id))
                conn.commit()
                return vacant_id

            insert_query = """
                INSERT INTO tbProjectType (
                    projecttp_project_id,
                    projecttp_type
                ) VALUES (%s, %s)
            """
            cursor.execute(insert_query, (project_id, clean_type))
            conn.commit()
            return int(cursor.lastrowid)

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="ProjectTypeRepository.ensure_type",
                error_command="ensure tbProjectType row",
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return 0

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()
