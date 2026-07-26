"""
CiscoWebOrderRepository

Responsável por operações relacionadas à tabela tbCiscoWebOrder.
Objetivos:
- Centralizar acesso à tbCiscoWebOrder
- Permitir busca por weborder_number (ID ou Lista)
- Permitir busca por weborder_customer_id (ID ou Lista)
- Permitir INSERT e UPDATE dinâmicos
- Registrar erros via ErrorRepository
"""

from typing import Optional, List, Dict, Union, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class CiscoWebOrderRepository:
    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # SELECT weborder_id por weborder_number (Único ou Lista)
    # ==========================================================
    def find_ids_by_number(
        self, numbers: Union[str, List[str]], as_df: bool = False
    ) -> Union[List[int], pd.DataFrame]:
        """
        Busca IDs baseado no número da ordem (weborder_number).
        Aceita uma string única ou uma lista de strings.
        """
        if not numbers:
            return [] if not as_df else pd.DataFrame()

        if isinstance(numbers, str):
            where_clause = "weborder_number = %s"
            params = (numbers,)
        else:
            placeholders = ", ".join(["%s"] * len(numbers))
            where_clause = f"weborder_number IN ({placeholders})"
            params = tuple(numbers)

        query = f"SELECT weborder_id FROM tbCiscoWebOrder WHERE {where_clause}"

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [row[0] for row in cursor.fetchall()]

        except Exception as e:
            self._log_error("find_ids_by_number", query, e)
            return [] if not as_df else pd.DataFrame()
        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT weborder_id por customer_id (Único ou Lista)
    # ==========================================================
    def find_ids_by_customer(
        self, customer_ids: Union[int, List[int]], as_df: bool = False
    ) -> Union[List[int], pd.DataFrame]:
        """
        Busca IDs baseado no ID do cliente (weborder_customer_id).
        Aceita um int único ou uma lista de ints.
        """
        if not customer_ids:
            return [] if not as_df else pd.DataFrame()

        if isinstance(customer_ids, (int, str)):
            where_clause = "weborder_customer_id = %s"
            params = (customer_ids,)
        else:
            placeholders = ", ".join(["%s"] * len(customer_ids))
            where_clause = f"weborder_customer_id IN ({placeholders})"
            params = tuple(customer_ids)

        query = f"SELECT weborder_id FROM tbCiscoWebOrder WHERE {where_clause}"

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [row[0] for row in cursor.fetchall()]

        except Exception as e:
            self._log_error("find_ids_by_customer", query, e)
            return [] if not as_df else pd.DataFrame()
        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT weborder_id por (weborder_number, weborder_customer_id)
    # ==========================================================
    def find_id_by_code_and_customer(
        self, code: str, customer_id: int
    ) -> Optional[int]:
        """
        Busca um único weborder_id pelo par (weborder_number, weborder_customer_id).
        Retorna None se não encontrar ou em caso de erro.
        """
        if not code or not customer_id:
            return None

        query = """
            SELECT weborder_id
            FROM tbCiscoWebOrder
            WHERE weborder_number = %s
              AND weborder_customer_id = %s
            LIMIT 1
        """

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, (code, customer_id))
            row = cursor.fetchone()
            return int(row[0]) if row else None
        except Exception as e:
            self._log_error("find_id_by_code_and_customer", query, e)
            return None
        finally:
            if "cursor" in locals():
                cursor.close()
            if "conn" in locals():
                conn.close()

    # ==========================================================
    # INSERT dinâmico
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere um novo registro na tbCiscoWebOrder.
        """
        if not data:
            raise ValueError("Dados para INSERT não podem ser vazios.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"INSERT INTO tbCiscoWebOrder ({columns}) VALUES ({placeholders})"
        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            new_id = cursor.lastrowid
            conn.commit()
            return int(new_id)
        except Exception as e:
            conn.rollback()
            self._log_error("insert", query, e)
            raise
        finally:
            conn.close()

    # ==========================================================
    # UPDATE dinâmico baseado em dicionários
    # ==========================================================
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros baseado em dicionários de dados e condições.
        """
        if not data or not where:
            raise ValueError("Data e WHERE são obrigatórios para UPDATE.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(data.values()) + tuple(where.values())

        query = f"UPDATE tbCiscoWebOrder SET {set_clause} WHERE {where_clause}"
        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            row_count = cursor.rowcount
            conn.commit()
            return row_count
        except Exception as e:
            conn.rollback()
            self._log_error("update", query, e)
            raise
        finally:
            conn.close()

    # ==========================================================
    # Auxiliar de Log
    # ==========================================================
    def _log_error(self, function_name: str, query: str, exception: Exception):
        self.error_repo.log_error(
            error_function=f"CiscoWebOrderRepository.{function_name}",
            error_command=query,
            error_description=str(exception),
            error_traceback=traceback.format_exc(),
        )
