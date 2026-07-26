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
from datetime import date, timedelta
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

        # Cache para os follow-ups: evita 4 queries idênticas por renderização de página.
        # Keyed pela data de hoje — invalida automaticamente no dia seguinte.
        self._follow_ups_cache_date: Optional[date] = None
        self._follow_ups_cache_df: Optional[pd.DataFrame] = None

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
    # NEXT FOLLOW-UP (1 query + cache em memória → 4x mais rápido)
    # ==========================================================
    def _fetch_all_follow_ups_raw(self) -> pd.DataFrame:
        """
        Executa UMA única query que traz todos os follow-ups relevantes
        (atrasados + semana atual + semana seguinte) e armazena o resultado
        em cache de instância.

        Ao ser chamado 4 vezes na mesma renderização de página, apenas a
        primeira chamada acessa o banco; as 3 seguintes retornam o cache.
        O cache é invalidado automaticamente quando a data muda.

        Retorna:
            DataFrame com colunas:
            activity_id, task_id, activity_name,
            task_customer_name, task_type_name, task_owner_id, follow_up_date
        """
        today = date.today()

        # Retorna cache se já foi carregado hoje
        if self._follow_ups_cache_date == today and self._follow_ups_cache_df is not None:
            return self._follow_ups_cache_df

        # Cobertura: tudo até o fim da próxima semana (delayed tem data < hoje, sem lower bound)
        days_to_sunday = 6 - today.weekday()
        next_sunday = today + timedelta(days=days_to_sunday + 7)

        query = """
            SELECT
                tr.taskrecord_activity_id   AS activity_id,
                tr.taskrecord_task_id       AS task_id,
                ta.activity_name,
                vt.task_customer_name,
                vt.task_type_name,
                vt.task_owner_id,
                tr.taskrecord_date          AS follow_up_date
            FROM tbTaskRecord tr
            INNER JOIN tbTaskActivity ta
                    ON tr.taskrecord_activity_id = ta.activity_id
            INNER JOIN vwTask vt
                    ON tr.taskrecord_task_id = vt.task_id
            WHERE tr.taskrecord_activity_id IS NOT NULL
              AND tr.taskrecord_activity_id > 0
              AND tr.taskrecord_date <= %s
            ORDER BY tr.taskrecord_date, tr.taskrecord_id
        """

        try:
            engine = get_sqlalchemy_engine()
            df = pd.read_sql(query, engine, params=(next_sunday,))
            df["follow_up_date"] = pd.to_datetime(df["follow_up_date"], errors="coerce").dt.date

            self._follow_ups_cache_date = today
            self._follow_ups_cache_df = df
            return df

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskHistoryRepository._fetch_all_follow_ups_raw",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            empty = pd.DataFrame(columns=[
                "activity_id", "task_id", "activity_name",
                "task_customer_name", "task_type_name",
                "task_owner_id", "follow_up_date",
            ])
            return empty

    def _slice_follow_ups(
        self,
        as_df: bool,
        mask_fn,
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Aplica uma máscara de data sobre o DataFrame em cache e retorna
        o resultado no formato solicitado.
        """
        all_df = self._fetch_all_follow_ups_raw()

        if all_df.empty:
            return pd.DataFrame(columns=all_df.columns) if as_df else []

        result = all_df[mask_fn(all_df["follow_up_date"])].copy()

        if as_df:
            return result.reset_index(drop=True)

        return result.to_dict("records")

    def get_next_follow_up_delayed(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna follow-ups em atraso (follow_up_date < hoje).
        Usa cache — não executa nova query se chamado na mesma renderização.
        """
        today = date.today()
        return self._slice_follow_ups(
            as_df=as_df,
            mask_fn=lambda col: col < today,
        )

    def get_next_follow_up_today(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna follow-ups para hoje (follow_up_date == hoje).
        Usa cache — não executa nova query se chamado na mesma renderização.
        """
        today = date.today()
        return self._slice_follow_ups(
            as_df=as_df,
            mask_fn=lambda col: col == today,
        )

    def get_next_follow_up_current_week(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna follow-ups da semana corrente excluindo hoje
        (hoje < follow_up_date <= domingo desta semana).
        Usa cache — não executa nova query se chamado na mesma renderização.
        """
        today = date.today()
        days_to_sunday = 6 - today.weekday()
        end_of_week = today + timedelta(days=days_to_sunday)

        return self._slice_follow_ups(
            as_df=as_df,
            mask_fn=lambda col: (col > today) & (col <= end_of_week),
        )

    def get_next_follow_up_next_week(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna follow-ups da próxima semana
        (segunda-feira ≤ follow_up_date ≤ domingo da próxima semana).
        Usa cache — não executa nova query se chamado na mesma renderização.
        """
        today = date.today()
        days_to_sunday = 6 - today.weekday()
        next_monday = today + timedelta(days=days_to_sunday + 1)
        next_sunday = next_monday + timedelta(days=6)

        return self._slice_follow_ups(
            as_df=as_df,
            mask_fn=lambda col: (col >= next_monday) & (col <= next_sunday),
        )

    # ==========================================================
    # BUSCAR HISTÓRICO POR TASK_ID E/OU ACTIVITY_ID
    # ==========================================================
    def get_history(
        self,
        task_id: int,
        activity_id: Optional[int] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros de histórico de tbTaskRecord filtrados por task_id
        e opcionalmente por activity_id.

        Convenção:
            - activity_id=0  → registros da tarefa sem atividade específica
            - activity_id=N  → registros da atividade N
            - activity_id=None → todos os registros da tarefa

        Parâmetros:
            task_id     : ID da tarefa (obrigatório)
            activity_id : ID da atividade ou 0 para histórico da tarefa
            as_df       : Se True, retorna DataFrame; senão retorna List[Dict]
        """

        conditions = ["taskrecord_task_id = %s"]
        params: List[Any] = [int(task_id)]

        if activity_id is not None:
            conditions.append("taskrecord_activity_id = %s")
            params.append(int(activity_id))

        where_clause = " AND ".join(conditions)
        query = f"""
            SELECT *
            FROM tbTaskRecord
            WHERE {where_clause}
            ORDER BY taskrecord_date DESC, taskrecord_id DESC
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
                error_function="TaskHistoryRepository.get_history",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # INSERT
    # ==========================================================
    def insert(self, data: Optional[Dict[str, Any]] = None, record: Optional[Dict[str, Any]] = None) -> int:
        """
        Insere um novo registro em tbTaskRecord.

        Aceita os campos tanto pelo parâmetro 'data' quanto pelo parâmetro 'record'
        para compatibilidade com os diferentes pontos de chamada do sistema.

        Parâmetros:
            data   : Dicionário com os campos do registro (uso interno/repositórios)
            record : Dicionário com os campos do registro (uso em task_detail)

        Retorna:
            ID do novo registro inserido, ou 0 em caso de erro
        """

        payload = data if data is not None else record

        if not payload:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        columns = ", ".join(payload.keys())
        placeholders = ", ".join(["%s"] * len(payload))
        values = tuple(payload.values())

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
