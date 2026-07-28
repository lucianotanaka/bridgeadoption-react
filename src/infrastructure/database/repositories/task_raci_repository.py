"""
TaskRACIRepository

Responsável por operações relacionadas à tabela tbTaskRACI.

Objetivos:
-----------
- Centralizar acesso a dados de RACI de tarefas
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

Regras específicas:
--------------------
1. taskraci_task_id é obrigatório no insert
2. taskraci_activity_id, quando nulo no insert, assume 0
3. Cópia de indivíduos considera apenas registros ativos (taskraci_enabled = 1)
4. Desabilitação grava:
   - taskraci_enabled = 0
   - taskraci_disabled_by = parâmetro recebido
   - taskraci_disabled_date = CURDATE()

Exemplos de uso:
----------------
1) Inserir novo RACI
    repo = TaskRACIRepository()

    new_id = repo.insert({
        "taskraci_task_id": 10,
        "taskraci_activity_id": None,
        "taskraci_person_id": 25,
        "taskraci_person_type": "user",
        "taskraci_responsibility": "R"
    })

2) Buscar indivíduos por task
    people = repo.get_persons_by_task(task_id=10)

3) Buscar indivíduos por task + activity
    people = repo.get_persons_by_task(task_id=10, activity_id=5)

4) Copiar indivíduos ativos
    inserted = repo.copy_active_persons(
        source_task_id=10,
        target_task_id=20
    )

5) Copiar indivíduos ativos de activity específica
    inserted = repo.copy_active_persons(
        source_task_id=10,
        source_activity_id=5,
        target_task_id=20,
        target_activity_id=8
    )

6) Desabilitar indivíduo em uma task
    affected = repo.disable_person(
        task_id=10,
        person_id=25,
        disabled_by="admin"
    )

7) Desabilitar indivíduo em task + activity
    affected = repo.disable_person(
        task_id=10,
        activity_id=5,
        person_id=25,
        disabled_by="admin"
    )
"""

from typing import Optional, Union, List, Dict, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class TaskRACIRepository:
    """
    Repository responsável pela tabela tbTaskRACI.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # BUSCAR IDS POR WHERE DINÂMICO
    # ==========================================================
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        """
        Retorna lista de taskraci_id baseado em filtros dinâmicos.

        Exemplo:
            repo.find_ids_by({
                "taskraci_task_id": 10,
                "taskraci_enabled": 1
            })

        Segurança:
            - WHERE obrigatório
            - Query parametrizada
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT taskraci_id
            FROM tbTaskRACI
            WHERE {where_clause}
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            results = cursor.fetchall()
            return [row["taskraci_id"] for row in results]

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRACIRepository.find_ids_by",
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
        Insere registro dinamicamente na tbTaskRACI.

        Regras:
            - taskraci_task_id é obrigatório
            - taskraci_activity_id, se nulo, assume 0

        Retorno:
            taskraci_id inserido
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        if not data.get("taskraci_task_id"):
            raise ValueError("taskraci_task_id é obrigatório.")

        if data.get("taskraci_activity_id") is None:
            data["taskraci_activity_id"] = 0

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbTaskRACI ({columns})
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
                error_function="TaskRACIRepository.insert",
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
            UPDATE tbTaskRACI
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
                error_function="TaskRACIRepository.update",
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
    # GET TASK RACI
    # ==========================================================
    def get_task_raci(
        self,
        taskraci_id: Optional[Union[int, List[int]]] = None,
        task_id: Optional[int] = None,
        activity_id: Optional[int] = None,
        person_id: Optional[int] = None,
        enabled_only: bool = False,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da tabela tbTaskRACI.

        Filtros opcionais:
            - taskraci_id
            - task_id
            - activity_id
            - person_id
            - enabled_only

        Parâmetros:
            taskraci_id : int | List[int] | None
            task_id : int | None
            activity_id : int | None
            person_id : int | None
            enabled_only : bool
            as_df : bool

        Retorno:
            List[Dict] ou DataFrame
        """

        query = """
            SELECT *
            FROM tbTaskRACI
        """

        conditions = []
        params: List[Any] = []

        if taskraci_id is not None:
            if isinstance(taskraci_id, list):
                if not taskraci_id:
                    return [] if not as_df else pd.DataFrame()

                placeholders = ", ".join(["%s"] * len(taskraci_id))
                conditions.append(f"taskraci_id IN ({placeholders})")
                params.extend([int(x) for x in taskraci_id])

            else:
                conditions.append("taskraci_id = %s")
                params.append(int(taskraci_id))

        if task_id is not None:
            conditions.append("taskraci_task_id = %s")
            params.append(int(task_id))

        if activity_id is not None:
            conditions.append("taskraci_activity_id = %s")
            params.append(int(activity_id))

        if person_id is not None:
            conditions.append("taskraci_person_id = %s")
            params.append(int(person_id))

        if enabled_only:
            conditions.append("taskraci_enabled = 1")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY taskraci_task_id, taskraci_activity_id, taskraci_person_id"

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
                error_function="TaskRACIRepository.get_task_raci",
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
    # GET PERSONS BY TASK / TASK + ACTIVITY
    # ==========================================================
    def get_persons_by_task(
        self,
        task_id: int,
        activity_id: Optional[int] = None,
        enabled_only: bool = False,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Busca indivíduos (taskraci_person_id) a partir de:
            - task_id
            - task_id + activity_id

        Parâmetros:
            task_id : int
            activity_id : int | None
            enabled_only : bool
            as_df : bool

        Retorno:
            List[Dict] ou DataFrame

        Campos retornados:
            - taskraci_id
            - taskraci_task_id
            - taskraci_activity_id
            - taskraci_person_id
            - taskraci_person_type
            - taskraci_responsibility
            - taskraci_enabled
        """

        if not task_id:
            raise ValueError("task_id é obrigatório.")

        query = """
            SELECT
                taskraci_id,
                taskraci_task_id,
                taskraci_activity_id,
                taskraci_person_id,
                taskraci_person_type,
                taskraci_responsibility,
                taskraci_enabled
            FROM tbTaskRACI
            WHERE taskraci_task_id = %s
        """

        params: List[Any] = [int(task_id)]

        if activity_id is not None:
            query += " AND taskraci_activity_id = %s"
            params.append(int(activity_id))

        if enabled_only:
            query += " AND taskraci_enabled = 1"

        query += """
            ORDER BY
                taskraci_activity_id,
                taskraci_person_id,
                taskraci_responsibility
        """

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
                error_function="TaskRACIRepository.get_persons_by_task",
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
    # GET PERSON IDS BY TASK / TASK + ACTIVITY
    # ==========================================================
    def get_person_ids_by_task(
        self,
        task_id: int,
        activity_id: Optional[int] = None,
        enabled_only: bool = False
    ) -> List[int]:
        """
        Retorna lista única de taskraci_person_id a partir de:
            - task_id
            - task_id + activity_id

        Parâmetros:
            task_id : int
            activity_id : int | None
            enabled_only : bool

        Retorno:
            List[int]
        """

        if not task_id:
            raise ValueError("task_id é obrigatório.")

        query = """
            SELECT DISTINCT taskraci_person_id
            FROM tbTaskRACI
            WHERE taskraci_task_id = %s
              AND taskraci_person_id IS NOT NULL
        """

        params: List[Any] = [int(task_id)]

        if activity_id is not None:
            query += " AND taskraci_activity_id = %s"
            params.append(int(activity_id))

        if enabled_only:
            query += " AND taskraci_enabled = 1"

        query += " ORDER BY taskraci_person_id"

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            return [row["taskraci_person_id"] for row in rows]

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRACIRepository.get_person_ids_by_task",
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
    # COPY ACTIVE PERSONS
    # ==========================================================
    def copy_active_persons(
        self,
        source_task_id: int,
        target_task_id: int,
        source_activity_id: Optional[int] = None,
        target_activity_id: Optional[int] = None
    ) -> int:
        """
        Copia todos os indivíduos ativos (taskraci_enabled = 1)
        de uma task/activity origem para outra task/activity destino.

        Regras:
            - source_task_id obrigatório
            - target_task_id obrigatório
            - source_activity_id opcional
            - target_activity_id, se None, assume 0
            - copia apenas registros ativos
            - evita duplicidade exata ativa no destino considerando:
                task_id, activity_id, person_id, person_type, responsibility

        Retorno:
            Quantidade de registros inseridos
        """

        if not source_task_id:
            raise ValueError("source_task_id é obrigatório.")

        if not target_task_id:
            raise ValueError("target_task_id é obrigatório.")

        if target_activity_id is None:
            target_activity_id = 0

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)

            query_source = """
                SELECT
                    taskraci_person_id,
                    taskraci_person_type,
                    taskraci_responsibility
                FROM tbTaskRACI
                WHERE taskraci_task_id = %s
                  AND taskraci_enabled = 1
            """

            params_source: List[Any] = [int(source_task_id)]

            if source_activity_id is not None:
                query_source += " AND taskraci_activity_id = %s"
                params_source.append(int(source_activity_id))

            cursor.execute(query_source, tuple(params_source))
            source_rows = cursor.fetchall()

            inserted_count = 0

            for row in source_rows:
                person_id = row["taskraci_person_id"]
                person_type = row["taskraci_person_type"]
                responsibility = row["taskraci_responsibility"]

                query_exists = """
                    SELECT taskraci_id
                    FROM tbTaskRACI
                    WHERE taskraci_task_id = %s
                      AND taskraci_activity_id = %s
                      AND taskraci_person_id = %s
                      AND (
                            taskraci_person_type = %s
                            OR (taskraci_person_type IS NULL AND %s IS NULL)
                          )
                      AND taskraci_responsibility = %s
                      AND taskraci_enabled = 1
                    LIMIT 1
                """

                cursor.execute(query_exists, (
                    int(target_task_id),
                    int(target_activity_id),
                    person_id,
                    person_type,
                    person_type,
                    responsibility
                ))

                existing = cursor.fetchone()

                if existing:
                    continue

                query_insert = """
                    INSERT INTO tbTaskRACI (
                        taskraci_task_id,
                        taskraci_activity_id,
                        taskraci_person_id,
                        taskraci_person_type,
                        taskraci_responsibility,
                        taskraci_enabled,
                        taskraci_disabled_by,
                        taskraci_disabled_date
                    )
                    VALUES (%s, %s, %s, %s, %s, 1, NULL, NULL)
                """

                cursor.execute(query_insert, (
                    int(target_task_id),
                    int(target_activity_id),
                    person_id,
                    person_type,
                    responsibility
                ))

                inserted_count += 1

            conn.commit()
            return inserted_count

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="TaskRACIRepository.copy_active_persons",
                error_command="COPY ACTIVE PERSONS tbTaskRACI",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    # ==========================================================
    # DISABLE PERSON
    # ==========================================================
    def disable_person(
        self,
        task_id: int,
        person_id: int,
        activity_id: Optional[int] = None,
        disabled_by: Optional[str] = None
    ) -> int:
        """
        Desabilita indivíduo em uma task_id e/ou activity_id.

        Regras:
            - task_id obrigatório
            - person_id obrigatório
            - activity_id opcional
            - taskraci_enabled = 0
            - taskraci_disabled_by = parâmetro recebido
            - taskraci_disabled_date = CURDATE()

        Retorno:
            Número de linhas afetadas
        """

        if not task_id:
            raise ValueError("task_id é obrigatório.")

        if not person_id:
            raise ValueError("person_id é obrigatório.")

        query = """
            UPDATE tbTaskRACI
            SET taskraci_enabled = 0,
                taskraci_disabled_by = %s,
                taskraci_disabled_date = CURDATE()
            WHERE taskraci_task_id = %s
              AND taskraci_person_id = %s
              AND taskraci_enabled = 1
        """

        params: List[Any] = [
            disabled_by,
            int(task_id),
            int(person_id)
        ]

        if activity_id is not None:
            query += " AND taskraci_activity_id = %s"
            params.append(int(activity_id))

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="TaskRACIRepository.disable_person",
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
    # GET COLUNAS ESPECÍFICAS POR TASKRACI_ID
    # ==========================================================
    def get_columns_by_taskraci_id(
        self,
        taskraci_id: int,
        columns: List[str],
        as_df: bool = False
    ) -> Optional[Union[Dict[str, Any], pd.DataFrame]]:
        """
        Retorna colunas específicas da tabela tbTaskRACI
        baseado no taskraci_id informado.

        Parâmetros:
        -----------
        taskraci_id : int
            ID do registro RACI.

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

        if not taskraci_id:
            raise ValueError("taskraci_id é obrigatório.")

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
                FROM tbTaskRACI
                WHERE taskraci_id = %s
                LIMIT 1
            """

            if as_df:
                engine = get_sqlalchemy_engine()
                df = pd.read_sql(query, engine, params=(taskraci_id,))
                return df if not df.empty else None

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (taskraci_id,))
            result = cursor.fetchone()

            return result if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRACIRepository.get_columns_by_taskraci_id",
                error_command="SELECT dynamic columns FROM tbTaskRACI",
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

