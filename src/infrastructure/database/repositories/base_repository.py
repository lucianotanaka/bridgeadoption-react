from typing import List, Dict, Any, Optional
import pandas as pd
from src.infrastructure.database.connection import get_db_connection


class BaseRepository:
    """
    Classe base para todos os repositories.
    Fornece execução padrão em formato raw (List[Dict])
    e DataFrame (pandas).
    """

    # -----------------------------------------
    # RAW → List[Dict]
    # -----------------------------------------
    def _execute_raw(
        self,
        query: str,
        params: Optional[tuple] = None
    ) -> List[Dict[str, Any]]:

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            return cursor.fetchall() or []

        finally:
            cursor.close()
            conn.close()

    # -----------------------------------------
    # DATAFRAME → pd.DataFrame
    # -----------------------------------------
    def _execute_df(
        self,
        query: str,
        params: Optional[tuple] = None
    ) -> pd.DataFrame:

        conn = get_db_connection()

        try:
            return pd.read_sql(query, conn, params=params)
        finally:
            conn.close()
