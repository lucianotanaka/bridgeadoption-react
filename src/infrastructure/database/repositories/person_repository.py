"""
PersonRepository

Responsável por operações relacionadas à tabela tbPerson.

Objetivos:
-----------
- Centralizar acesso a dados de pessoas
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

Funcionalidades principais:
---------------------------
1. Criar novo registro na tbPerson com base em dicionário
2. Buscar person_id com WHERE dinâmico baseado em dicionário
3. Editar registro a partir de person_id
4. Listar registros com WHERE dinâmico baseado em dicionário
"""

from typing import Optional, Union, List, Dict, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class PersonRepository:
    """
    Repository responsável pela tabela tbPerson.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # BUSCAR IDS POR WHERE DINÂMICO
    # ==========================================================
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        """
        Retorna lista de person_id baseado em filtros dinâmicos.

        Exemplo:
            repo.find_ids_by({"person_email": "user@email.com"})

        Segurança:
            - WHERE obrigatório
            - Query parametrizada
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT person_id
            FROM tbPerson
            WHERE {where_clause}
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            results = cursor.fetchall()
            return [row["person_id"] for row in results]

        except Exception as e:
            self.error_repo.log_error(
                error_function="PersonRepository.find_ids_by",
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
    # BUSCAR PRIMEIRO ID POR WHERE DINÂMICO
    # ==========================================================
    def find_id_by(self, where: Dict[str, Any]) -> Optional[int]:
        """
        Retorna o primeiro person_id encontrado com base em filtros dinâmicos.

        Exemplo:
            repo.find_id_by({"person_email": "user@email.com"})

        Retorno:
            person_id ou None
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT person_id
            FROM tbPerson
            WHERE {where_clause}
            LIMIT 1
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            result = cursor.fetchone()
            return result["person_id"] if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="PersonRepository.find_id_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    # ==========================================================
    # INSERT DINÂMICO
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere registro dinamicamente na tbPerson.

        Regras:
            - data não pode ser vazio

        Retorno:
            person_id inserido
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbPerson ({columns})
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
                error_function="PersonRepository.insert",
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
    # UPDATE POR PERSON_ID
    # ==========================================================
    def update_by_id(self, person_id: int, data: Dict[str, Any]) -> int:
        """
        Atualiza registro da tbPerson a partir do person_id.

        Parâmetros:
            person_id : int
            data : Dict[str, Any]

        Retorna:
            Número de linhas afetadas
        """

        if not person_id:
            raise ValueError("person_id é obrigatório.")

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        values = tuple(data.values()) + (person_id,)

        query = f"""
            UPDATE tbPerson
            SET {set_clause}
            WHERE person_id = %s
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
                error_function="PersonRepository.update_by_id",
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
            UPDATE tbPerson
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
                error_function="PersonRepository.update",
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
    # LISTAR REGISTROS POR WHERE DINÂMICO
    # ==========================================================
    def list_by(
        self,
        where: Dict[str, Any],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Lista registros da tbPerson com base em WHERE dinâmico.

        Exemplo:
            repo.list_by({
                "person_enabled": 1,
                "person_company_id": 10
            })

        Parâmetros:
            where : Dict[str, Any]
            as_df : bool

        Retorno:
            List[Dict] ou DataFrame
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT *
            FROM tbPerson
            WHERE {where_clause}
            ORDER BY person_name
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=values)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="PersonRepository.list_by",
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
    # GET PERSON
    # ==========================================================
    def get_person(
        self,
        person_id: Optional[Union[int, List[int]]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da tabela tbPerson.

        Parâmetros:
            person_id : int | List[int] | None
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
            FROM tbPerson
        """

        conditions = []
        params: List[Any] = []

        if person_id is not None:
            if isinstance(person_id, list):
                if not person_id:
                    return [] if not as_df else pd.DataFrame()

                placeholders = ", ".join(["%s"] * len(person_id))
                conditions.append(f"person_id IN ({placeholders})")
                params.extend([int(x) for x in person_id])

            else:
                conditions.append("person_id = %s")
                params.append(int(person_id))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY person_name"

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
                error_function="PersonRepository.get_person",
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
    # GET COLUNAS ESPECÍFICAS POR PERSON_ID
    # ==========================================================
    def get_columns_by_person_id(
        self,
        person_id: int,
        columns: List[str],
        as_df: bool = False
    ) -> Optional[Union[Dict[str, Any], pd.DataFrame]]:
        """
        Retorna colunas específicas da tabela tbPerson
        baseado no person_id informado.

        Parâmetros:
        -----------
        person_id : int
            ID da pessoa.

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

        if not person_id:
            raise ValueError("person_id é obrigatório.")

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
                FROM tbPerson
                WHERE person_id = %s
                LIMIT 1
            """

            if as_df:
                engine = get_sqlalchemy_engine()
                df = pd.read_sql(query, engine, params=(person_id,))
                return df if not df.empty else None

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (person_id,))
            result = cursor.fetchone()

            return result if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="PersonRepository.get_columns_by_person_id",
                error_command="SELECT dynamic columns FROM tbPerson",
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

