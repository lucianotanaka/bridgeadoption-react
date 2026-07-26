"""
TaskHistoryRepository

Responsável por operações relacionadas à tabela:
    - tbTaskRecord

Objetivos:
-----------
- Centralizar acesso a dados de registros/histórico de tarefas
- Evitar SQL espalhado pelo sistema
- Garantir segurança contra SQL Injection
- Padronizar tratamento de erro via ErrorRepository
- Manter consistência arquitetural

Padrão de retorno:
-------------------
- Métodos SELECT → retornam List[Dict] ou DataFrame
- Métodos INSERT → retornam ID inserido
- Métodos UPDATE → retornam número de linhas afetadas

Observações:
------------
- tbTaskRecord armazena registros de acompanhamento (follow-up) de tarefas e atividades.
- Cada registro pode estar associado a uma tarefa (taskrecord_task_id)
  e/ou a uma atividade específica (taskrecord_activity_id).
- O campo taskrecord_status indica: DOING, PENDING, DONE
- O campo taskrecord_type indica: INFO, ISSUE, BLOCKER
"""

from typing import Optional, Union, List, Dict, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class TaskHistoryRepository:
    """
    Repository responsável por operações relacionadas ao histórico/registros de tarefas (tbTaskRecord).
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # HELPERS INTERNOS
    # ==========================================================
    def _close_resources(self, conn=None, cursor=None) -> None:
        """Fecha cursor e conexão com segurança."""
        try:
            if cursor is not None:
                cursor.close()
        except Exception:
            pass
        try:
            if conn is not None:
                conn.close()
        except Exception:
            pass

    # ==========================================================
    # BUSCAR REGISTROS POR TASK_ID
    # ==========================================================
    def get_records_by_task_id(
        self,
        task_id: int,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna todos os registros de acompanhamento de uma tarefa.

        Parâmetros:
            task_id: ID da tarefa (tbTask.task_id)
            as_df: Se True, retorna DataFrame; senão retorna List[Dict]
        """

        query = """
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_task_id = %s
            ORDER BY taskrecord_date DESC, taskrecord_id DESC
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(int(task_id),))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(task_id),))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskHistoryRepository.get_records_by_task_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # BUSCAR REGISTROS POR ACTIVITY_ID
    # ==========================================================
    def get_records_by_activity_id(
        self,
        activity_id: int,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna todos os registros de acompanhamento de uma atividade específica.

        Parâmetros:
            activity_id: ID da atividade (tbTaskActivity.activity_id)
            as_df: Se True, retorna DataFrame; senão retorna List[Dict]
        """

        query = """
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_activity_id = %s
            ORDER BY taskrecord_date DESC, taskrecord_id DESC
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(int(activity_id),))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(activity_id),))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskHistoryRepository.get_records_by_activity_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # BUSCAR REGISTROS POR TASK_ID E ACTIVITY_ID
    # ==========================================================
    def get_records_by_task_and_activity(
        self,
        task_id: int,
        activity_id: int,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros filtrados por tarefa e atividade simultaneamente.

        Parâmetros:
            task_id: ID da tarefa
            activity_id: ID da atividade
            as_df: Se True, retorna DataFrame; senão retorna List[Dict]
        """

        query = """
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_task_id = %s
              AND taskrecord_activity_id = %s
            ORDER BY taskrecord_date DESC, taskrecord_id DESC
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(int(task_id), int(activity_id)))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(task_id), int(activity_id)))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskHistoryRepository.get_records_by_task_and_activity",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # BUSCAR REGISTROS POR LISTA DE TASK_IDS
    # ==========================================================
    def get_records_by_task_ids(
        self,
        task_ids: List[int],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros de acompanhamento para uma lista de tarefas.

        Parâmetros:
            task_ids: Lista de IDs de tarefas
            as_df: Se True, retorna DataFrame; senão retorna List[Dict]
        """

        if not task_ids:
            return pd.DataFrame() if as_df else []

        placeholders = ", ".join(["%s"] * len(task_ids))
        query = f"""
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_task_id IN ({placeholders})
            ORDER BY taskrecord_task_id, taskrecord_date DESC, taskrecord_id DESC
        """

        conn = None
        cursor = None

        try:
            params = tuple(int(t) for t in task_ids)

            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskHistoryRepository.get_records_by_task_ids",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # BUSCAR REGISTRO POR ID
    # ==========================================================
    def get_record_by_id(
        self,
        record_id: int,
        as_df: bool = False
    ) -> Optional[Union[Dict[str, Any], pd.DataFrame]]:
        """
        Retorna um registro específico pelo seu ID.

        Parâmetros:
            record_id: ID do registro (tbTaskRecord.taskrecord_id)
            as_df: Se True, retorna DataFrame; senão retorna Dict
        """

        query = """
            SELECT *
            FROM tbTaskRecord
            WHERE taskrecord_id = %s
            LIMIT 1
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                df = pd.read_sql(query, engine, params=(int(record_id),))
                return df if not df.empty else None

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(record_id),))
            result = cursor.fetchone()
            return result if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskHistoryRepository.get_record_by_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # INSERT
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere um novo registro em tbTaskRecord.

        Parâmetros:
            data: Dicionário com os campos do registro

        Retorna:
            ID do novo registro inserido, ou 0 em caso de erro
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbTaskRecord ({columns})
            VALUES ({placeholders})
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            if conn is not None:
                conn.rollback()

            self.error_repo.log_error(
                error_function="TaskHistoryRepository.insert",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            self._close_resources(conn, cursor)

    # ==========================================================
    # UPDATE DINÂMICO
    # ==========================================================
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros em tbTaskRecord.

        Parâmetros:
            data: Dicionário com campos a atualizar
            where: Dicionário com condições de filtro
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbTaskRecord
            SET {set_clause}
            WHERE {where_clause}
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            if conn is not None:
                conn.rollback()

            self.error_repo.log_error(
                error_function="TaskHistoryRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            self._close_resources(conn, cursor)
