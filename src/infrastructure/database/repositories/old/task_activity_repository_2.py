"""
TaskActivityRepository — tbTaskActivity
"""

from typing import Optional, Union, List, Dict, Any, Set
import pandas as pd
import traceback

from src.infrastructure.database.connection import get_db_connection, get_sqlalchemy_engine
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class TaskActivityRepository:

    def __init__(self):
        self.error_repo = ErrorRepository()

    def _close(self, conn=None, cursor=None):
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass

    def get_activities_by_task_id(
        self, task_id: int, as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        query = """
            SELECT * FROM tbTaskActivity
            WHERE activity_task_id = %s
            ORDER BY activity_seq, activity_id
        """
        conn = cursor = None
        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=(int(task_id),))
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(task_id),))
            return cursor.fetchall()
        except Exception as e:
            self.error_repo.log_error(
                "TaskActivityRepository.get_activities_by_task_id",
                query, str(e), traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []
        finally:
            if not as_df:
                self._close(conn, cursor)

    def get_activities_by_task_ids(
        self, task_ids: List[int], as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        if not task_ids:
            return pd.DataFrame() if as_df else []
        ph = ", ".join(["%s"] * len(task_ids))
        query = f"""
            SELECT * FROM tbTaskActivity
            WHERE activity_task_id IN ({ph})
            ORDER BY activity_task_id, activity_seq, activity_id
        """
        params = tuple(int(t) for t in task_ids)
        conn = cursor = None
        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=params)
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall()
        except Exception as e:
            self.error_repo.log_error(
                "TaskActivityRepository.get_activities_by_task_ids",
                query, str(e), traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []
        finally:
            if not as_df:
                self._close(conn, cursor)

    def get_activity_by_id(
        self, activity_id: int, as_df: bool = False
    ) -> Optional[Union[Dict[str, Any], pd.DataFrame]]:
        query = "SELECT * FROM tbTaskActivity WHERE activity_id = %s LIMIT 1"
        conn = cursor = None
        try:
            if as_df:
                df = pd.read_sql(query, get_sqlalchemy_engine(), params=(int(activity_id),))
                return df if not df.empty else None
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(activity_id),))
            return cursor.fetchone()
        except Exception as e:
            self.error_repo.log_error(
                "TaskActivityRepository.get_activity_by_id",
                query, str(e), traceback.format_exc()
            )
            return None
        finally:
            if not as_df:
                self._close(conn, cursor)

    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        if not data or not where:
            raise ValueError("data e where são obrigatórios.")
        set_clause = ", ".join([f"{c} = %s" for c in data])
        where_clause = " AND ".join([f"{c} = %s" for c in where])
        query = f"UPDATE tbTaskActivity SET {set_clause} WHERE {where_clause}"
        values = tuple(data.values()) + tuple(where.values())
        conn = cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount
        except Exception as e:
            if conn:
                conn.rollback()
            self.error_repo.log_error(
                "TaskActivityRepository.update",
                query, str(e), traceback.format_exc()
            )
            return 0
        finally:
            self._close(conn, cursor)
