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
from src.infrastructure.database.repositories.task_history_repository import TaskHistoryRepository


class TaskActivityRepository:
    """
    Repository responsável por operações relacionadas a atividades de tarefas.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()
        self.history_repo = TaskHistoryRepository()

    # ==========================================================
    # HELPERS INTERNOS
    # ==========================================================
    def _close(self, conn=None, cursor=None) -> None:
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
                self._close(conn, cursor)

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
                self._close(conn, cursor)

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
                self._close(conn, cursor)

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
            self._close(conn, cursor)

    # ==========================================================
    # FIND IDS BY (filtro dinâmico)
    # ==========================================================
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        """
        Retorna lista de activity_ids que satisfazem os filtros fornecidos.

        Parâmetros:
            where: Dicionário com condições de filtro (campo: valor)

        Retorna:
            Lista de activity_ids encontrados, ou lista vazia.
        """
        if not where:
            return []

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT activity_id
            FROM tbTaskActivity
            WHERE {where_clause}
            ORDER BY activity_id
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, values)
            rows = cursor.fetchall()
            return [int(row[0]) for row in rows if row[0] is not None]

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskActivityRepository.find_ids_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return []

        finally:
            self._close(conn, cursor)

    # ==========================================================
    # BUSCAR ATIVIDADES (por task_id e/ou activity_id)
    # ==========================================================
    def get_activity(
        self,
        task_id: Optional[Union[int, List[int]]] = None,
        activity_id: Optional[Union[int, List[int]]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna atividades de tbTaskActivity filtradas por task_id e/ou activity_id.

        Casos de uso:
            - task_id=int, activity_id=None   → todas as atividades de uma tarefa
            - task_id=list, activity_id=None  → atividades de múltiplas tarefas
            - task_id=None, activity_id=list  → atividades específicas por ID
            - task_id=int, activity_id=int    → atividade específica de uma tarefa

        Parâmetros:
            task_id     : Filtra por activity_task_id (int, List[int] ou None).
            activity_id : Filtra por activity_id (int, List[int] ou None).
            as_df       : Se True, retorna DataFrame; senão retorna List[Dict].

        Retorna:
            List[Dict] ou DataFrame com as atividades encontradas.
        """

        conditions: List[str] = ["activity_task_id > 0"]
        params: List[Any] = []

        if task_id is not None:
            if isinstance(task_id, (list, tuple, set)):
                ids = [int(t) for t in task_id if t is not None]
                if not ids:
                    return pd.DataFrame() if as_df else []
                placeholders = ", ".join(["%s"] * len(ids))
                conditions.append(f"activity_task_id IN ({placeholders})")
                params.extend(ids)
            else:
                conditions.append("activity_task_id = %s")
                params.append(int(task_id))

        if activity_id is not None:
            if isinstance(activity_id, (list, tuple, set)):
                ids = [int(a) for a in activity_id if a is not None]
                if not ids:
                    return pd.DataFrame() if as_df else []
                placeholders = ", ".join(["%s"] * len(ids))
                conditions.append(f"activity_id IN ({placeholders})")
                params.extend(ids)
            else:
                conditions.append("activity_id = %s")
                params.append(int(activity_id))

        where_clause = " AND ".join(conditions)
        query = f"""
            SELECT *
            FROM tbTaskActivity
            WHERE {where_clause}
            ORDER BY activity_task_id, activity_seq, activity_id
        """

        conn = None
        cursor = None

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
                error_function="TaskActivityRepository.get_activity",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close(conn, cursor)

    # ==========================================================
    # CONTAR ATIVIDADES
    # ==========================================================
    def get_count_activity(self, task_id: int) -> int:
        """
        Retorna o total de atividades de uma tarefa (excluindo registros vagos).

        Parâmetros:
            task_id: ID da tarefa

        Retorna:
            Número inteiro com a contagem total de atividades.
        """
        query = """
            SELECT COUNT(activity_id) AS total
            FROM tbTaskActivity
            WHERE activity_task_id = %s
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(task_id),))
            row = cursor.fetchone()
            return int(row["total"]) if row and row["total"] is not None else 0

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskActivityRepository.get_count_activity",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            self._close(conn, cursor)

    def get_count_unclosed_activity(self, task_id: int) -> int:
        """
        Retorna o total de atividades ABERTAS (não encerradas) de uma tarefa.

        Atividades encerradas são aquelas com activity_status IN (4, 5, 6, 10).

        Parâmetros:
            task_id: ID da tarefa

        Retorna:
            Número inteiro com a contagem de atividades não encerradas.
        """
        query = """
            SELECT COUNT(activity_id) AS total
            FROM tbTaskActivity
            WHERE activity_task_id = %s
              AND (activity_status IS NULL OR activity_status NOT IN (4, 5, 6, 10))
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(task_id),))
            row = cursor.fetchone()
            return int(row["total"]) if row and row["total"] is not None else 0

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskActivityRepository.get_count_unclosed_activity",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            self._close(conn, cursor)

    # ==========================================================
    # DASHBOARD DE ATIVIDADES
    # ==========================================================
    def get_task_activity_dashboard(
        self,
        owner_id: Optional[int] = None,
        for_team: Optional[str] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna atividades para o dashboard de overview de tarefas.

        Realiza JOIN com tbTask para permitir filtro por dono e equipe.
        O campo activity_status é exposto também como activity_status_id
        para compatibilidade com o frontend.

        Parâmetros:
            owner_id : Se informado, filtra por t.task_owner_id.
            for_team : Se informado, filtra por t.task_for_team.
            as_df    : Se True, retorna DataFrame; senão retorna List[Dict].

        Retorna:
            List[Dict] ou DataFrame com as atividades ativas (activity_task_id > 0).
        """

        query = """
            SELECT
                ta.activity_id,
                ta.activity_task_id,
                ta.activity_seq,
                ta.activity_name,
                ta.activity_objective,
                ta.activity_scope,
                ta.activity_expected_results,
                ta.activity_effort,
                ta.activity_status,
                ta.activity_status            AS activity_status_id,
                ta.activity_ws,
                ta.activity_deal_id,
                ta.activity_track,
                ta.activity_sub_track,
                ta.activity_value,
                ta.activity_currency,
                ta.activity_start,
                ta.activity_end,
                ta.activity_start_performed,
                ta.activity_end_performed,
                ta.activity_effort_performed,
                ta.activity_completed,
                ta.activity_approved,
                ta.activity_approved_value,
                ta.activity_approved_currency,
                ta.activity_approval_date,
                ta.activity_approval_request_date,
                ta.activity_approval_fy,
                ta.activity_end_fy,
                ta.activity_backlog_value
            FROM tbTaskActivity ta
            INNER JOIN tbTask t ON ta.activity_task_id = t.task_id
            WHERE ta.activity_task_id > 0
        """

        conditions: List[str] = []
        params: List[Any] = []

        if owner_id is not None:
            conditions.append("t.task_owner_id = %s")
            params.append(int(owner_id))

        if for_team is not None:
            conditions.append("t.task_for_team = %s")
            params.append(str(for_team))

        if conditions:
            query += " AND " + " AND ".join(conditions)

        query += " ORDER BY ta.activity_task_id, ta.activity_seq, ta.activity_id"

        conn = None
        cursor = None

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
                error_function="TaskActivityRepository.get_task_activity_dashboard",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close(conn, cursor)

    # ==========================================================
    # INSERT
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere ou reaproveita um registro em tbTaskActivity.

        Regras:
            1. O campo activity_task_id é obrigatório e deve ser > 0.
            2. Antes de inserir, verifica se há registros vagos
               (activity_task_id = 0) buscando MIN(activity_id).
            3. Se MIN(activity_id) > 0 → realiza UPDATE nesse registro.
            4. Caso contrário → realiza INSERT de um novo registro.
            5. Em ambos os casos, registra o histórico via TaskHistoryRepository.

        Parâmetros:
            data: Dicionário com os campos e valores da atividade.
                  Deve conter activity_task_id > 0.

        Retorna:
            activity_id do registro criado/atualizado, ou 0 em caso de erro.
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        activity_task_id = data.get("activity_task_id")
        if not activity_task_id or int(activity_task_id) <= 0:
            raise ValueError("activity_task_id é obrigatório e deve ser maior que 0.")

        query_vacant = """
            SELECT MIN(activity_id) AS min_id
            FROM tbTaskActivity
            WHERE activity_task_id = 0
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # --- Verificar registro vago ---
            cursor.execute(query_vacant)
            row = cursor.fetchone()
            min_id = row["min_id"] if row and row["min_id"] is not None else 0

            if min_id > 0:
                # --- Reaproveitar registro vago via UPDATE ---
                set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
                values = tuple(data.values()) + (int(min_id),)

                query_update = f"""
                    UPDATE tbTaskActivity
                    SET {set_clause}
                    WHERE activity_id = %s
                """

                cursor.execute(query_update, values)
                conn.commit()
                activity_id = int(min_id)

            else:
                # --- Inserir novo registro ---
                columns = ", ".join(data.keys())
                placeholders = ", ".join(["%s"] * len(data))
                values = tuple(data.values())

                query_insert = f"""
                    INSERT INTO tbTaskActivity ({columns})
                    VALUES ({placeholders})
                """

                cursor.execute(query_insert, values)
                conn.commit()
                activity_id = cursor.lastrowid

            # --- Registrar histórico ---
            history_data = {
                "taskrecord_task_id": int(activity_task_id),
                "taskrecord_activity_id": activity_id,
            }
            self.history_repo.insert(history_data)

            return activity_id

        except ValueError:
            raise

        except Exception as e:
            if conn is not None:
                conn.rollback()

            self.error_repo.log_error(
                error_function="TaskActivityRepository.insert",
                error_command=query_vacant,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            self._close(conn, cursor)

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
            self._close(conn, cursor)
