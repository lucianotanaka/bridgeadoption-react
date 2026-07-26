from typing import Optional, Dict
import json
import traceback
from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.error_repository import ErrorRepository



class UserPreferencesRepository:

    def __init__(self):
        self.error_repo = ErrorRepository()

    def load_user_grid_prefs(
        self,
        user_id: int,
        page_name: str,
        grid_name: str
    ) -> Optional[Dict]:

        """
        Carrega preferências de layout de grid para um usuário/página/grid específicos.

        Retorna:
          - dict com:
            {
              "columns_order": [lista de nomes de colunas],
              "hidden_columns": [lista de nomes de colunas ocultas],
            }
          - ou None se não houver registro ou em caso de erro.
        """
        
        query = """
            SELECT columns_order, hidden_columns
            FROM tbUserGridPreferences
            WHERE user_id = %s
              AND page_name = %s
              AND grid_name = %s
        """

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (user_id, page_name, grid_name))
            row = cursor.fetchone()

            if not row:
                return None

            return {
                "columns_order": json.loads(row["columns_order"]) if row["columns_order"] else [],
                "hidden_columns": json.loads(row["hidden_columns"]) if row["hidden_columns"] else [],
            }

        except Exception as e:
            self.error_repo.log_error(
                error_function="UserPreferencesRepository.load_user_grid_prefs",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            cursor.close()
            conn.close()


    def save_user_grid_prefs(
        self,
        user_id: int,
        page_name: str,
        grid_name: str,
        columns_order: list[str],
        hidden_columns: list[str]
    ) -> bool:
        """
        Salva (ou atualiza) preferências de grid do usuário.

        Retorna:
            True  -> sucesso
            False -> erro
        """

        sql = """
            INSERT INTO tbUserGridPreferences (
                user_id, page_name, grid_name, columns_order, hidden_columns
            ) VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                columns_order = VALUES(columns_order),
                hidden_columns = VALUES(hidden_columns),
                updated_at = CURRENT_TIMESTAMP
        """

        params = (
            user_id,
            page_name,
            grid_name,
            json.dumps(columns_order),
            json.dumps(hidden_columns),
        )

        connection = None
        cursor = None
        error_repo = ErrorRepository()

        try:
            connection = get_db_connection()
            cursor = connection.cursor()

            cursor.execute(sql, params)
            connection.commit()

            return True

        except Exception as e:
            if connection:
                connection.rollback()

            error_repo.log_error(
                error_function="save_user_grid_prefs",
                error_command=sql,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )

            return False

        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()
