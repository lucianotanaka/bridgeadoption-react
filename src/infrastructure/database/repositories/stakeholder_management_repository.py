"""
StakeholderManagementRepository

Responsável por operações relacionadas à tabela tbStakeholderManagement
e consultas com join em tbPerson para o Client Overview.
"""

from typing import Optional, Union, List, Dict, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class StakeholderManagementRepository:
    def __init__(self):
        self.error_repo = ErrorRepository()

    def list_by_company(
        self,
        company_id: int,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        query = """
            SELECT
                s.*,
                p.person_name,
                p.person_email,
                p.person_telephone,
                p.person_cellphone,
                p.person_job_title,
                p.person_type,
                p.person_enabled
            FROM tbStakeholderManagement s
            LEFT JOIN tbPerson p
                ON p.person_id = s.stakeholder_person_id
            WHERE s.stakeholder_company_id = %s
            ORDER BY
                s.stakeholder_enabled DESC,
                COALESCE(p.person_name, s.stakeholder_id) ASC
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
                error_function="StakeholderManagementRepository.list_by_company",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    def find_by_id(self, stakeholder_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT *
            FROM tbStakeholderManagement
            WHERE stakeholder_id = %s
            LIMIT 1
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (stakeholder_id,))
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                error_function="StakeholderManagementRepository.find_by_id",
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
            INSERT INTO tbStakeholderManagement ({columns})
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
                error_function="StakeholderManagementRepository.insert",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            raise

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def update_by_id(self, stakeholder_id: int, data: Dict[str, Any]) -> int:
        if not stakeholder_id:
            raise ValueError("stakeholder_id é obrigatório.")

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        values = tuple(data.values()) + (stakeholder_id,)

        query = f"""
            UPDATE tbStakeholderManagement
            SET {set_clause}
            WHERE stakeholder_id = %s
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
                error_function="StakeholderManagementRepository.update_by_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return 0

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()
