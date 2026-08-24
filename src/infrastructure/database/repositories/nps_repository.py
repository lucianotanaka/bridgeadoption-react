"""
NPSRepository

Responsável por operações relacionadas à tabela tbNPS.
"""

from typing import Optional, Union, List, Dict, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class NPSRepository:
    def __init__(self):
        self.error_repo = ErrorRepository()

    def list_by_company(
        self,
        company_id: int,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        query = """
            SELECT *
            FROM tbNPS
            WHERE nps_company_id = %s
            ORDER BY nps_response_date DESC, nps_id DESC
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(company_id,))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (company_id,))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="NPSRepository.list_by_company",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    def get_latest_by_company(self, company_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT *
            FROM tbNPS
            WHERE nps_company_id = %s
              AND nps_response_date IS NOT NULL
            ORDER BY nps_response_date DESC, nps_id DESC
            LIMIT 1
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (company_id,))
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                error_function="NPSRepository.get_latest_by_company",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def insert(self, data: Dict[str, Any]) -> int:
        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbNPS ({columns})
            VALUES ({placeholders})
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="NPSRepository.insert",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            raise

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def update_by_id(self, nps_id: int, data: Dict[str, Any]) -> int:
        if not nps_id:
            raise ValueError("nps_id é obrigatório.")

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        values = tuple(data.values()) + (nps_id,)

        query = f"""
            UPDATE tbNPS
            SET {set_clause}
            WHERE nps_id = %s
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="NPSRepository.update_by_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return 0

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()
