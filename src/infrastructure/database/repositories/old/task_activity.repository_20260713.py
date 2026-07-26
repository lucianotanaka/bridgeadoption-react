"""
TaskActivityRepository

Responsável por operações relacionadas à tabela:
    - tbTaskActivity

Objetivos:
-----------
- Centralizar acesso a dados de atividades de tarefas
- Evitar SQL espalhado pelo sistema
- Garantir segurança contra SQL Injection
- Padronizar tratamento de erro via ErrorRepository
- Manter consistência arquitetural

Padrão de retorno:
-------------------
- Métodos SELECT → retornam List[Dict] ou DataFrame
- Métodos INSERT → retornam ID inserido
- Métodos UPDATE → retornam número de linhas afetadas
"""

from typing import Optional, Union, List, Dict, Any, Set
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class TaskActivityRepository:
    """
    Repository responsável por operações relacionadas a atividades de tarefas.
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
    # BUSCAR ATIVIDADES POR TASK_ID
    # ==========================================================
    def get_activities_by_task_id(
        self,
        task_id: int,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna todas as atividades de uma tarefa específica.

        Parâmetros:
            task_id: ID da tarefa (tbTask.task_id)
            as_df: Se True, retorna DataFrame; senão retorna List[Dict]
        """

        query = """
            SELECT *
            FROM tbTaskActivity
            WHERE activity_task_id = %s
            ORDER BY activity_seq, activity_id
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
                error_function="TaskActivityRepository.get_activities_by_task_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # BUSCAR ATIVIDADES POR MÚLTIPLOS TASK_IDS
    # ==========================================================
    def get_activities_by_task_ids(
        self,
        task_ids: List[int],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna todas as atividades para uma lista de task_ids.

        Parâmetros:
            task_ids: Lista de IDs de tarefas
            as_df: Se True, retorna DataFrame; senão retorna List[Dict]
        """

        if not task_ids:
            return pd.DataFrame() if as_df else []

        placeholders = ", ".join(["%s"] * len(task_ids))
        query = f"""
            SELECT *
            FROM tbTaskActivity
            WHERE activity_task_id IN ({placeholders})
            ORDER BY activity_task_id, activity_seq, activity_id
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
                error_function="TaskActivityRepository.get_activities_by_task_ids",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # BUSCAR ATIVIDADE POR ID
    # ==========================================================
    def get_activity_by_id(
        self,
        activity_id: int,
        as_df: bool = False
    ) -> Optional[Union[Dict[str, Any], pd.DataFrame]]:
        """
        Retorna uma atividade específica pelo seu ID.

        Parâmetros:
            activity_id: ID da atividade (tbTaskActivity.activity_id)
            as_df: Se True, retorna DataFrame; senão retorna Dict
        """

        query = """
            SELECT *
            FROM tbTaskActivity
            WHERE activity_id = %s
            LIMIT 1
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                df = pd.read_sql(query, engine, params=(int(activity_id),))
                return df if not df.empty else None

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(activity_id),))
            result = cursor.fetchone()
            return result if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskActivityRepository.get_activity_by_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # BUSCAR DISTINCT VALORES DE COLUNAS (para filtros)
    # ==========================================================
    def get_distinct_values(
        self,
        column: str,
        task_ids: Optional[List[int]] = None
    ) -> List[Any]:
        """
        Retorna valores distintos de uma coluna de tbTaskActivity.

        Parâmetros:
            column: Nome da coluna
            task_ids: Se informado, restringe aos task_ids
        """

        _ALLOWED_COLUMNS: Set[str] = {
            "activity_status",
            "activity_ws",
            "activity_deal_id",
            "activity_track",
            "activity_sub_track",
            "activity_currency",
            "activity_task_id",
        }

        if column not in _ALLOWED_COLUMNS:
            raise ValueError(f"Coluna não permitida para get_distinct_values: {column}")

        params: list = []

        if task_ids:
            placeholders = ", ".join(["%s"] * len(task_ids))
            query = f"""
                SELECT DISTINCT {column}
                FROM tbTaskActivity
                WHERE activity_task_id IN ({placeholders})
                  AND {column} IS NOT NULL
                ORDER BY {column}
            """
            params = [int(t) for t in task_ids]
        else:
            query = f"""
                SELECT DISTINCT {column}
                FROM tbTaskActivity
                WHERE {column} IS NOT NULL
                ORDER BY {column}
            """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            return [row[0] for row in rows]

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskActivityRepository.get_distinct_values",
                error_command=query,
                error_description=f"{str(e)} | column={column}",
                error_traceback=traceback.format_exc()
            )
            return []

        finally:
            self._close_resources(conn, cursor)

    # ==========================================================
    # UPDATE DINÂMICO
    # ==========================================================
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros em tbTaskActivity.

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
            UPDATE tbTaskActivity
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
                error_function="TaskActivityRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            self._close_resources(conn, cursor)
