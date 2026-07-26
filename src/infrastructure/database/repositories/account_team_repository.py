import traceback
from typing import Dict, Any
import pandas as pd
from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class AccountTeamRepository:
    """
    Repository responsável pela view vwAccountTeamCSM.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()


    def find_all_csm_df(self) -> pd.DataFrame:
        conn = get_db_connection()
        try:
            query = "SELECT * FROM vwAccountTeamCSM"
            return pd.read_sql(query, conn)
        finally:
            conn.close()

    def find_csm_by_df(self, where: Dict[str, Any]) -> pd.DataFrame:
        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT *
            FROM vwAccountTeamCSM
            WHERE {where_clause}
        """

        conn = get_db_connection()
        try:
            return pd.read_sql(query, conn, params=values)
        finally:
            conn.close()


    def find_all_df(self) -> pd.DataFrame:
        conn = get_db_connection()
        try:
            query = "SELECT * FROM vwAccountTeam ORDER BY accountteam_company_name"
            return pd.read_sql(query, conn)
        finally:
            conn.close()


    def find_by_df(self, where: Dict[str, Any]) -> pd.DataFrame:
        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT *
            FROM vwAccountTeam
            WHERE {where_clause}
        """

        conn = get_db_connection()
        try:
            return pd.read_sql(query, conn, params=values)
        finally:
            conn.close()
    
    
    def update(edit_values: dict) -> bool:
        """
        Atualiza tbAccountTeam baseado no accountteam_id.

        Retorna:
            True  -> se linha foi alterada
            False -> se nenhuma linha foi afetada ou ocorreu erro
        """

        error_repo = ErrorRepository()

        if "accountteam_id" not in edit_values:
            return False

        accountteam_id = edit_values["accountteam_id"]

        # Remove o ID para não tentar atualizá-lo
        update_data = {
            k: v for k, v in edit_values.items()
            if k != "accountteam_id"
        }

        if not update_data:
            return False

        set_clause = ", ".join([f"{col} = %s" for col in update_data.keys()])
        params = list(update_data.values())
        params.append(accountteam_id)

        query = f"""
            UPDATE tbAccountTeam
            SET {set_clause}
            WHERE accountteam_id = %s
        """

        connection = get_db_connection()

        try:
            cursor = connection.cursor()
            cursor.execute(query, tuple(params))
            connection.commit()

            return cursor.rowcount > 0

        except Exception as e:
            connection.rollback()

            error_repo.log_error(
                error_function="update_account_team",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )

            return False

        finally:
            cursor.close()
            connection.close()


    def insert(self, accountteam_data: Dict) -> int:
        """
        Insere um novo registro em tbAccountTeam.

        Retorna:
            new_id -> se inserido com sucesso
            0      -> se erro ou dados inválidos
        """

        if not accountteam_data:
            return 0

        columns = ", ".join(accountteam_data.keys())
        placeholders = ", ".join(["%s"] * len(accountteam_data))
        values = tuple(accountteam_data.values())

        query = f"""
            INSERT INTO tbAccountTeam ({columns})
            VALUES ({placeholders})
        """

        connection = get_db_connection()

        try:
            cursor = connection.cursor()
            cursor.execute(query, values)

            new_id = cursor.lastrowid
            connection.commit()

            return new_id

        except Exception as e:
            connection.rollback()

            self.error_repo.log_error(
                error_function="AccountTeamRepository.insert",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )

            return 0

        finally:
            cursor.close()
            connection.close()
