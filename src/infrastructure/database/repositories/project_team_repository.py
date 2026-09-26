"""
ProjectTeamRepository

Responsável por operações relacionadas à tabela tbProjectTeam.

Objetivos:
-----------
- Centralizar regras de alocação/desalocação de pessoas em projetos
- Evitar SQL espalhado nos importadores
- Reaproveitar linhas vagas quando aplicável
- Manter consistência com o padrão dos demais repositories
"""

from typing import Optional, List, Dict, Any
import traceback

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class ProjectTeamRepository:
    """
    Repository responsável pela tabela tbProjectTeam.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    def get_active_rows_by_project(self, project_id: int) -> List[Dict[str, Any]]:
        query = """
            SELECT *
            FROM tbProjectTeam
            WHERE projteam_project_id = %s
              AND projteam_project_id > 0
              AND projteam_allocation_end IS NULL
            ORDER BY projteam_id
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (project_id,))
            return cursor.fetchall()
        except Exception as e:
            self.error_repo.log_error(
                error_function="ProjectTeamRepository.get_active_rows_by_project",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return []
        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def get_active_row(
        self,
        project_id: int,
        person_id: int,
        department_id: int,
        level_id: int,
        technical_lead: int,
    ) -> Optional[Dict[str, Any]]:
        query = """
            SELECT *
            FROM tbProjectTeam
            WHERE projteam_project_id = %s
              AND projteam_person_id = %s
              AND projteam_department_id = %s
              AND projteam_level_id = %s
              AND projteam_technical_lead = %s
              AND projteam_allocation_end IS NULL
            ORDER BY projteam_id
            LIMIT 1
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                query,
                (project_id, person_id, department_id, level_id, technical_lead),
            )
            return cursor.fetchone()
        except Exception as e:
            self.error_repo.log_error(
                error_function="ProjectTeamRepository.get_active_row",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None
        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def get_active_rows_by_project_and_person(
        self,
        project_id: int,
        person_id: int,
    ) -> List[Dict[str, Any]]:
        query = """
            SELECT *
            FROM tbProjectTeam
            WHERE projteam_project_id = %s
              AND projteam_person_id = %s
              AND projteam_allocation_end IS NULL
            ORDER BY projteam_id
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (project_id, person_id))
            return cursor.fetchall()
        except Exception as e:
            self.error_repo.log_error(
                error_function="ProjectTeamRepository.get_active_rows_by_project_and_person",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return []
        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def close_active_rows_by_project(self, project_id: int, allocation_end) -> int:
        query = """
            UPDATE tbProjectTeam
            SET projteam_allocation_end = %s
            WHERE projteam_project_id = %s
              AND projteam_allocation_end IS NULL
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query, (allocation_end, project_id))
            conn.commit()
            return cursor.rowcount
        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="ProjectTeamRepository.close_active_rows_by_project",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return 0
        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def close_active_rows_by_project_and_person(
        self,
        project_id: int,
        person_id: int,
        allocation_end,
    ) -> int:
        query = """
            UPDATE tbProjectTeam
            SET projteam_allocation_end = %s
            WHERE projteam_project_id = %s
              AND projteam_person_id = %s
              AND projteam_allocation_end IS NULL
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query, (allocation_end, project_id, person_id))
            conn.commit()
            return cursor.rowcount
        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="ProjectTeamRepository.close_active_rows_by_project_and_person",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return 0
        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def _get_vacant_row_id(self, cursor) -> int:
        query = """
            SELECT MIN(projteam_id) AS projteam_id
            FROM tbProjectTeam
            WHERE projteam_project_id = 0
        """
        cursor.execute(query)
        row = cursor.fetchone()

        if not row:
            return 0

        if isinstance(row, dict):
            return int(row.get("projteam_id", 0) or 0)

        return int(row[0] or 0)

    def allocate_person(
        self,
        project_id: int,
        person_id: int,
        department_id: int,
        level_id: int,
        allocation_start,
        allocation_end=None,
        technical_lead: int = 0,
    ) -> int:
        """
        Garante uma alocação ativa única por combinação:
        projeto + pessoa + departamento + nível + technical_lead.

        Se a mesma combinação já estiver ativa, não duplica.
        Se houver alocação ativa da mesma pessoa com função diferente,
        encerra primeiro e então cria/reutiliza uma nova linha.
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)

            existing_same_query = """
                SELECT projteam_id
                FROM tbProjectTeam
                WHERE projteam_project_id = %s
                  AND projteam_person_id = %s
                  AND projteam_department_id = %s
                  AND projteam_level_id = %s
                  AND projteam_technical_lead = %s
                  AND projteam_allocation_end IS NULL
                ORDER BY projteam_id
                LIMIT 1
            """
            cursor.execute(
                existing_same_query,
                (project_id, person_id, department_id, level_id, technical_lead),
            )
            same_row = cursor.fetchone()
            if same_row:
                return int(same_row["projteam_id"])

            close_previous_query = """
                UPDATE tbProjectTeam
                SET projteam_allocation_end = %s
                WHERE projteam_project_id = %s
                  AND projteam_person_id = %s
                  AND projteam_allocation_end IS NULL
            """
            close_end = allocation_end if allocation_end is not None else allocation_start
            cursor.execute(close_previous_query, (close_end, project_id, person_id))

            vacant_id = self._get_vacant_row_id(cursor)

            if vacant_id > 0:
                update_query = """
                    UPDATE tbProjectTeam
                    SET projteam_project_id = %s,
                        projteam_person_id = %s,
                        projteam_department_id = %s,
                        projteam_level_id = %s,
                        projteam_technical_lead = %s,
                        projteam_allocation_start = %s,
                        projteam_allocation_end = %s
                    WHERE projteam_id = %s
                """
                cursor.execute(
                    update_query,
                    (
                        project_id,
                        person_id,
                        department_id,
                        level_id,
                        technical_lead,
                        allocation_start,
                        allocation_end,
                        vacant_id,
                    ),
                )
                conn.commit()
                return vacant_id

            insert_query = """
                INSERT INTO tbProjectTeam (
                    projteam_project_id,
                    projteam_person_id,
                    projteam_department_id,
                    projteam_level_id,
                    projteam_technical_lead,
                    projteam_allocation_start,
                    projteam_allocation_end
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                insert_query,
                (
                    project_id,
                    person_id,
                    department_id,
                    level_id,
                    technical_lead,
                    allocation_start,
                    allocation_end,
                ),
            )
            conn.commit()
            return int(cursor.lastrowid)

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="ProjectTeamRepository.allocate_person",
                error_command="allocate tbProjectTeam row",
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return 0

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()
