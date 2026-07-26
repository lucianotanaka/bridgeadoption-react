from typing import Any, Dict, List, Optional, Union
import traceback

import pandas as pd

from src.infrastructure.database.connection import get_db_connection, get_sqlalchemy_engine
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class CiscoSARepository:
    """
    Repository responsável pela tabela tbCiscoSmartAccountMetering.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # MAX(mcsa_end_date)
    # ==========================================================
    def get_max_end_date(self) -> Optional[str]:
        query = """
            SELECT MAX(mcsa_end_date) AS max_date
            FROM tbCiscoSmartAccountMetering
            WHERE mcsa_end_date IS NOT NULL
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            result = cursor.fetchone()
            return result["max_date"] if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoSARepository.get_max_end_date",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # MIN(mcsa_end_date)
    # ==========================================================
    def get_min_end_date(self) -> Optional[str]:
        query = """
            SELECT MIN(mcsa_end_date) AS min_date
            FROM tbCiscoSmartAccountMetering
            WHERE mcsa_end_date IS NOT NULL
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            result = cursor.fetchone()
            return result["min_date"] if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoSARepository.get_min_end_date",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # SELECT IDs com suporte a NULL-safe
    # ==========================================================
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        """
        Retorna lista de mcsa_id com base em filtros dinâmicos.

        Regras:
        - valores None geram 'IS NULL'
        - demais valores geram '= %s'
        """

        if not where:
            error_msg = "WHERE é obrigatório."
            self.error_repo.log_error(
                error_function="CiscoSARepository.find_ids_by",
                error_command="SELECT mcsa_id FROM tbCiscoSmartAccountMetering WHERE ...",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        where_parts = []
        values = []

        for col, val in where.items():
            if val is None:
                where_parts.append(f"{col} IS NULL")
            else:
                where_parts.append(f"{col} = %s")
                values.append(val)

        where_clause = " AND ".join(where_parts)

        query = f"""
            SELECT mcsa_id
            FROM tbCiscoSmartAccountMetering
            WHERE {where_clause}
        """

        conn = get_db_connection()
        if not conn:
            return []

        try:
            cursor = conn.cursor()
            cursor.execute(query, tuple(values))
            return [row[0] for row in cursor.fetchall()]

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoSARepository.find_ids_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return []

        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # SELECT 1 registro com suporte a NULL-safe
    # ==========================================================
    def find_first_by(self, where: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Retorna o primeiro registro encontrado com base em filtros dinâmicos.

        Regras:
        - valores None geram 'IS NULL'
        - demais valores geram '= %s'
        """

        if not where:
            error_msg = "WHERE é obrigatório."
            self.error_repo.log_error(
                error_function="CiscoSARepository.find_first_by",
                error_command="SELECT * FROM tbCiscoSmartAccountMetering WHERE ... LIMIT 1",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        where_parts = []
        values = []

        for col, val in where.items():
            if val is None:
                where_parts.append(f"{col} IS NULL")
            else:
                where_parts.append(f"{col} = %s")
                values.append(val)

        where_clause = " AND ".join(where_parts)

        query = f"""
            SELECT *
            FROM tbCiscoSmartAccountMetering
            WHERE {where_clause}
            LIMIT 1
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(values))
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoSARepository.find_first_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # INSERT dinâmico
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere registro baseado em dicionário.
        Colunas não informadas assumem DEFAULT do banco.
        Retorna o ID inserido.
        """

        if not data:
            error_msg = "Dicionário de inserção não pode ser vazio."
            self.error_repo.log_error(
                error_function="CiscoSARepository.insert",
                error_command="INSERT INTO tbCiscoSmartAccountMetering (...) VALUES (...)",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        conn = get_db_connection()
        if not conn:
            error_msg = "Erro ao conectar ao banco de dados."
            self.error_repo.log_error(
                error_function="CiscoSARepository.insert",
                error_command="INSERT INTO tbCiscoSmartAccountMetering (...) VALUES (...)",
                error_description=error_msg,
                error_traceback=""
            )
            raise ConnectionError(error_msg)

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbCiscoSmartAccountMetering ({columns})
            VALUES ({placeholders})
        """

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="CiscoSARepository.insert",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # UPDATE dinâmico com suporte a NULL-safe no WHERE
    # ==========================================================
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros com base em:
        - data  -> colunas a alterar
        - where -> condição WHERE obrigatória

        Retorna número de linhas afetadas.
        """

        if not data:
            error_msg = "Dicionário de atualização não pode ser vazio."
            self.error_repo.log_error(
                error_function="CiscoSARepository.update",
                error_command="UPDATE tbCiscoSmartAccountMetering SET ... WHERE ...",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        if not where:
            error_msg = "WHERE é obrigatório para evitar UPDATE global."
            self.error_repo.log_error(
                error_function="CiscoSARepository.update",
                error_command="UPDATE tbCiscoSmartAccountMetering SET ... WHERE ...",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        conn = get_db_connection()
        if not conn:
            error_msg = "Erro ao conectar ao banco de dados."
            self.error_repo.log_error(
                error_function="CiscoSARepository.update",
                error_command="UPDATE tbCiscoSmartAccountMetering SET ... WHERE ...",
                error_description=error_msg,
                error_traceback=""
            )
            raise ConnectionError(error_msg)

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        set_values = list(data.values())

        where_parts = []
        where_values = []

        for col, val in where.items():
            if val is None:
                where_parts.append(f"{col} IS NULL")
            else:
                where_parts.append(f"{col} = %s")
                where_values.append(val)

        where_clause = " AND ".join(where_parts)
        values = tuple(set_values + where_values)

        query = f"""
            UPDATE tbCiscoSmartAccountMetering
            SET {set_clause}
            WHERE {where_clause}
        """

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="CiscoSARepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            cursor.close()
            conn.close()


    # ==========================================================
    # CISCO SMART ACCOUNT METERING LASTEST BY CLIENTE ID
    # ==========================================================
    def get_cisco_sa_metering_by_client_id(
        self,
        client_id: int,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros filtrando por customer_id.

        Parâmetros:
            client_id (int):
                ID do cliente

            as_df (bool):
                True  -> retorna pandas.DataFrame
                False -> retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra erro via ErrorRepository
        """
        query = "SELECT * FROM vwCiscoSAMeteringLatest WHERE mcsa_client_id = %s"

        params = (int(client_id),)

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoSARepository.get_cisco_sa_metering_by_client_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()


    # ==========================================================
    # CISCO SMART ACCOUNT METERING HISTORY BY CLIENTE ID
    # ==========================================================
    def get_cisco_sa_history_by_client_id(
        self,
        client_id: int,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros filtrando por customer_id.

        Parâmetros:
            client_id (int):
                ID do cliente

            as_df (bool):
                True  -> retorna pandas.DataFrame
                False -> retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra erro via ErrorRepository
        """
        query = "SELECT * FROM vwCiscoSAMeteringHistory WHERE mcsa_client_id = %s"

        params = (int(client_id),)

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoSARepository.get_cisco_sa_history_by_client_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()
