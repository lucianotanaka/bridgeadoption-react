"""
SquadRepository

Responsável por operações relacionadas à tabela tbSquad.

Objetivos:
-----------
- Centralizar acesso a dados de squads
- Evitar SQL espalhado pelo sistema
- Garantir segurança contra SQL Injection
- Padronizar tratamento de erro via ErrorRepository
- Manter consistência arquitetural

Padrão de retorno:
-------------------
- Métodos SELECT → retornam List[Dict] ou DataFrame
- Métodos INSERT → retornam ID inserido
- Métodos UPDATE → retornam número de linhas afetadas

Tratamento de erro:
--------------------
- Registra erro via ErrorRepository
- Faz rollback automático quando necessário
- Evita quebrar frontend (retorno seguro)
"""

from typing import Optional, Union, List, Dict, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class SquadRepository:
    """
    Repository responsável pela tabela tbSquad.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # BUSCAR IDS POR WHERE DINÂMICO
    # ==========================================================
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        """
        Retorna lista de squad_id baseado em filtros dinâmicos.

        Exemplo:
            repo.find_ids_by({"squad_name": "Team Alpha"})

        Segurança:
            - WHERE obrigatório
            - Query parametrizada
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT squad_id
            FROM tbSquad
            WHERE {where_clause}
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            results = cursor.fetchall()
            return [row["squad_id"] for row in results]

        except Exception as e:
            self.error_repo.log_error(
                error_function="SquadRepository.find_ids_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return []

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    # ==========================================================
    # INSERT DINÂMICO
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere registro dinamicamente na tbSquad.

        Retorno:
            squad_id inserido

        Regras:
            - data não pode ser vazio
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbSquad ({columns})
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
                error_function="SquadRepository.insert",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    # ==========================================================
    # UPDATE DINÂMICO
    # ==========================================================
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros dinamicamente.

        Segurança:
            - WHERE obrigatório
            - Evita UPDATE global acidental

        Retorna:
            Número de linhas afetadas
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbSquad
            SET {set_clause}
            WHERE {where_clause}
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
                error_function="SquadRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    # ==========================================================
    # GET SQUAD
    # ==========================================================
    def get_squad(
        self,
        squad_id: Optional[Union[int, List[int]]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da tabela tbSquad.

        Parâmetros:
            squad_id : int | List[int] | None
                - Se int → filtra por igualdade
                - Se lista → usa IN (...)
                - Se None → retorna todos

            as_df : bool
                Se True → retorna pandas.DataFrame

        Retorno:
            List[Dict] ou DataFrame
        """

        query = """
            SELECT *
            FROM tbSquad
        """

        conditions = []
        params: List[Any] = []

        if squad_id is not None:
            if isinstance(squad_id, list):
                if not squad_id:
                    return [] if not as_df else pd.DataFrame()

                placeholders = ", ".join(["%s"] * len(squad_id))
                conditions.append(f"squad_id IN ({placeholders})")
                params.extend([int(x) for x in squad_id])

            else:
                conditions.append("squad_id = %s")
                params.append(int(squad_id))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY squad_id"

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="SquadRepository.get_squad",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # GET COLUNAS ESPECÍFICAS POR SQUAD_ID
    # ==========================================================
    def get_columns_by_squad_id(
        self,
        squad_id: int,
        columns: List[str],
        as_df: bool = False
    ) -> Optional[Union[Dict[str, Any], pd.DataFrame]]:
        """
        Retorna colunas específicas da tabela tbSquad
        baseado no squad_id informado.

        Parâmetros:
        -----------
        squad_id : int
            ID do squad.

        columns : List[str]
            Lista de colunas que deseja retornar.

        as_df : bool
            Se True → retorna DataFrame
            Se False → retorna Dict

        Retorno:
        --------
        Dict com colunas solicitadas
        ou DataFrame (1 linha)
        ou None se não existir
        """

        if not squad_id:
            raise ValueError("squad_id é obrigatório.")

        if not columns:
            raise ValueError("Lista de colunas não pode ser vazia.")

        try:
            safe_columns = []
            for col in columns:
                if not col.replace("_", "").isalnum():
                    raise ValueError(f"Coluna inválida: {col}")
                safe_columns.append(col)

            column_clause = ", ".join(safe_columns)

            query = f"""
                SELECT {column_clause}
                FROM tbSquad
                WHERE squad_id = %s
                LIMIT 1
            """

            if as_df:
                engine = get_sqlalchemy_engine()
                df = pd.read_sql(query, engine, params=(squad_id,))
                return df if not df.empty else None

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (squad_id,))
            result = cursor.fetchone()

            return result if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="SquadRepository.get_columns_by_squad_id",
                error_command="SELECT dynamic columns FROM tbSquad",
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()


    def get_csm_active(self, as_df: bool = False):
        """
        Retorna dados da view vwSquadCSMActive.

        Parâmetros:
            as_df : bool
                Se True, retorna pandas.DataFrame.
                Se False, retorna (data, column_names).

        Retorno:
            - as_df=False -> tuple[list, list]
            - as_df=True  -> pd.DataFrame
        """

        query = "SELECT * FROM vwSquadCSMActive"
        connection = get_db_connection()
        cursor = None

        try:
            if as_df:
                return pd.read_sql(query, connection)

            cursor = connection.cursor()
            cursor.execute(query)

            column_names = [column[0] for column in cursor.description]
            data = cursor.fetchall()

            if data:
                return data, column_names

            return [], column_names

        except Exception as e:
            self.error_repo.log_error(
                error_function="SquadRepository.get_csm_active",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )

            if as_df:
                return pd.DataFrame()

            return [], []

        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()


    def get_csm(self, as_df: bool = False):
        """
        Retorna dados da view vwSquadCSM.

        Parâmetros:
            as_df : bool
                Se True, retorna pandas.DataFrame.
                Se False, retorna (data, column_names).

        Retorno:
            - as_df=False -> tuple[list, list]
            - as_df=True  -> pd.DataFrame
        """

        query = "SELECT * FROM vwSquadCSM"
        connection = get_db_connection()
        cursor = None

        try:
            if as_df:
                return pd.read_sql(query, connection)

            cursor = connection.cursor()
            cursor.execute(query)

            column_names = [column[0] for column in cursor.description]
            data = cursor.fetchall()

            if data:
                return data, column_names

            return [], column_names

        except Exception as e:
            self.error_repo.log_error(
                error_function="SquadRepository.get_csm",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )

            if as_df:
                return pd.DataFrame()

            return [], []

        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()


    def get_csm_account(self, as_df: bool = False):
        """
        Retorna dados da view vwAccountTeamCSM.

        Parâmetros:
            as_df : bool
                Se True, retorna pandas.DataFrame.
                Se False, retorna (data, column_names).

        Retorno:
            - as_df=False -> tuple[list, list]
            - as_df=True  -> pd.DataFrame
        """

        query = "SELECT * FROM vwAccountTeamCSM"
        connection = get_db_connection()
        cursor = None

        try:
            if as_df:
                return pd.read_sql(query, connection)

            cursor = connection.cursor()
            cursor.execute(query)

            column_names = [column[0] for column in cursor.description]
            data = cursor.fetchall()

            if data:
                return data, column_names

            return [], column_names

        except Exception as e:
            self.error_repo.log_error(
                error_function="SquadRepository.get_csm_account",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )

            if as_df:
                return pd.DataFrame()

            return [], []

        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()
