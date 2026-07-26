"""
    EXEMPLOS DE USO
    1) Lista todos
        repo = TaskTechnologyAdoptionReportRepository()
        data = repo.find_all()

        for row in data:
            print(row["task_id"], row["task_customer_name"])
    
    2) Procura específica
        repo = TaskTechnologyAdoptionReportRepository()

        # Buscar por owner
        data = repo.find_by({
            "task_owner_id": 5
        })

        # Buscar por owner + status
        data = repo.find_by({
            "task_owner_id": 5,
            "task_status_id": 1
        })

"""
import pandas as pd
from typing import Dict, Any
from src.infrastructure.database.connection import get_db_connection


class TaskTechnologyAdoptionReportRepository:

    def find_all_df(self) -> pd.DataFrame:
        conn = get_db_connection()
        try:
            query = "SELECT * FROM vwTaskTechnologyAdoptionReport"
            return pd.read_sql(query, conn)
        finally:
            conn.close()

    def find_by_df(self, where: Dict[str, Any]) -> pd.DataFrame:
        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT *
            FROM vwTaskTechnologyAdoptionReport
            WHERE {where_clause}
        """

        conn = get_db_connection()
        try:
            return pd.read_sql(query, conn, params=values)
        finally:
            conn.close()
