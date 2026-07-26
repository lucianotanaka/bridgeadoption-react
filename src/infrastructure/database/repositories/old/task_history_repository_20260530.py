from typing import Optional, Any, Tuple
import pandas as pd
import traceback

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class TaskHistoryRepository:
    """
    Repository responsável pela tabela tbTaskRecord.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    def _log_error(
        self,
        function_name: str,
        command: str,
        error: Exception,
    ) -> None:
        """
        Registra erro de forma padronizada.
        """
        self.error_repo.log_error(
            error_function=function_name,
            error_command=command,
            error_description=str(error),
            error_traceback=traceback.format_exc(),
        )

    def insert(
        self,
        taskrecord_task_id: int,
        taskrecord_activity_id: Optional[int],
        taskrecord_remark: Optional[str],
        taskrecord_next_followup: Optional[str],  # YYYY-MM-DD ou None
        taskrecord_updated_by: Optional[str],
    ) -> bool:
        """
        Insere um registro em tbTaskRecord com as seguintes regras:

        a) taskrecord_task_id não pode ser nulo ou zero
        b) taskrecord_activity_id se nulo -> 0
        c) taskrecord_updated_by = 'System BA' se nulo
        d) taskrecord_date = NOW()
        e) taskrecord_next_followup pode ser nulo
        f) Se existir VAGO (taskrecord_task_id = 0) reutiliza menor taskrecord_id

        Retorno:
            True  -> sucesso
            False -> erro
        """
        conn = None
        cursor = None
        error_command = "Validação de entrada"

        try:
            if taskrecord_task_id is None or int(taskrecord_task_id) == 0:
                raise ValueError("taskrecord_task_id não pode ser nulo ou zero.")

            if taskrecord_activity_id is None:
                taskrecord_activity_id = 0

            updated_by_value = taskrecord_updated_by if taskrecord_updated_by else "System BA"
            remark_value = taskrecord_remark.strip() if isinstance(taskrecord_remark, str) else taskrecord_remark

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            error_command = """
                SELECT MIN(taskrecord_id) AS taskrecord_id
                FROM tbTaskRecord
                WHERE taskrecord_task_id = 0
            """

            cursor.execute(error_command)
            result = cursor.fetchone()
            vago_id = result["taskrecord_id"] if result and result["taskrecord_id"] else None

            data = {
                "taskrecord_task_id": int(taskrecord_task_id),
                "taskrecord_activity_id": int(taskrecord_activity_id),
                "taskrecord_remark": remark_value,
                "taskrecord_next_followup": taskrecord_next_followup,
                "taskrecord_updated_by": updated_by_value,
            }

            if vago_id:
                set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
                values = tuple(data.values()) + (int(vago_id),)

                error_command = f"""
                    UPDATE tbTaskRecord
                    SET {set_clause},
                        taskrecord_date = NOW()
                    WHERE taskrecord_id = %s
                """

                cursor.execute(error_command, values)
                conn.commit()
                return True

            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = tuple(data.values())

            error_command = f"""
                INSERT INTO tbTaskRecord (
                    {columns},
                    taskrecord_date
                )
                VALUES (
                    {placeholders},
                    NOW()
                )
            """

            cursor.execute(error_command, values)
            conn.commit()
            return True

        except Exception as e:
            if conn is not None:
                conn.rollback()

            self._log_error(
                function_name="TaskHistoryRepository.insert",
                command=error_command,
                error=e,
            )
            return False

        finally:
            if cursor is not None:
                cursor.close()
            if conn is not None:
                conn.close()

    def get_history(
        self,
        task_id: int,
        activity_id: Optional[int] = None,
        as_df: bool = False,
    ) -> Any:
        """
        Consulta históricos da tbTaskRecord.

        Regras:
        - task_id não pode ser nulo nem 0
        - activity_id nulo será tratado como 0
        - as_df=True retorna DataFrame
        - as_df=False retorna (data, column_names)
        """

        if task_id is None or int(task_id) == 0:
            raise ValueError("task_id não pode ser nulo nem 0.")

        if activity_id is None:
            activity_id = 0

        connection = get_db_connection()
        cursor = None

        query = """
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_task_id = %s
              AND taskrecord_activity_id = %s
              AND taskrecord_remark IS NOT NULL
              AND TRIM(taskrecord_remark) <> ''
              AND taskrecord_remark <> 'Null'
            ORDER BY taskrecord_date DESC
        """

        try:
            if as_df:
                cursor = connection.cursor(dictionary=True)
                cursor.execute(query, (int(task_id), int(activity_id)))
                data = cursor.fetchall()
                return pd.DataFrame(data)

            cursor = connection.cursor()
            cursor.execute(query, (int(task_id), int(activity_id)))
            column_names = [column[0] for column in cursor.description]
            data = cursor.fetchall()
            return data, column_names

        except Exception as e:
            self._log_error(
                function_name="TaskHistoryRepository.get_history",
                command=query,
                error=e,
            )

            if as_df:
                return pd.DataFrame()

            return [], []

        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()
