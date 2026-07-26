"""
    Exemplos de uso
    a) Buscar registros
        repo = CiscoEARepository()

        ids = repo.find_ids_by({
            "ea_web_order_id": "WO123",
            "ea_subscription_id": "SUB001"
        })
        
    b) Inserir
        new_id = repo.insert({
        "ea_web_order_id": "WO123",
        "ea_subscription_id": "SUB001",
        "ea_service_customer": 10,
        "ea_end_customer": 20,
        "ea_order_value": 1500.00
    })
    
    c) Atualizar
        repo.update(
        data={
            "ea_consumption_status": "OVER",
            "ea_tf_overage": 250.00
        },
        where={
            "ea_id": 100
            }
        )

"""

from typing import Optional, List, Dict, Any, Union, Tuple
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class CiscoEARepository:
    """
    Repository responsável pela tabela tbCiscoEA.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()
        
    
    # ==========================================================
    # SELECT ea_id com WHERE dinâmico avançado
    # ==========================================================
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        """
        Retorna lista de ea_id baseado em filtro dinâmico.

        Suporta:
            - AND / OR
            - =, !=, >, <, >=, <=
            - IN
            - LIKE
            - IS NULL / IS NOT NULL

        Formato avançado:
            {
                "operator": "AND",  # opcional (default AND)
                "conditions": [
                    {"field": "ea_web_order_id", "op": "=", "value": "123"},
                    {"field": "ea_subscription_id", "op": "LIKE", "value": "%ABC%"},
                    {"field": "ea_service_customer", "op": "IN", "value": [1, 2, 3]},
                    {"field": "ea_end_date", "op": "IS NULL"},
                ]
            }

        Formato simples (compatível):
            {
                "ea_web_order_id": "123",
                "ea_subscription_id": "ABC"
            }
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        conditions_sql = []
        values: List[Any] = []

        # ------------------------------------------------------
        # FORMATO SIMPLES (compatibilidade)
        # ------------------------------------------------------
        if "conditions" not in where:
            for field, value in where.items():
                conditions_sql.append(f"{field} = %s")
                values.append(value)

            operator = "AND"

        # ------------------------------------------------------
        # FORMATO AVANÇADO
        # ------------------------------------------------------
        else:
            operator = where.get("operator", "AND").upper()
            conditions = where.get("conditions", [])

            if not conditions:
                raise ValueError("Lista de conditions não pode ser vazia.")

            for cond in conditions:
                field = cond["field"]
                op = cond["op"].upper()

                # IS NULL / IS NOT NULL
                if op in ("IS NULL", "IS NOT NULL"):
                    conditions_sql.append(f"{field} {op}")

                # IN
                elif op == "IN":
                    in_values = cond.get("value", [])
                    if not in_values:
                        raise ValueError("IN requer lista de valores.")

                    placeholders = ", ".join(["%s"] * len(in_values))
                    conditions_sql.append(f"{field} IN ({placeholders})")
                    values.extend(in_values)

                # LIKE ou operadores normais
                else:
                    conditions_sql.append(f"{field} {op} %s")
                    values.append(cond.get("value"))

        where_clause = f" {operator} ".join(conditions_sql)

        query = f"""
            SELECT ea_id
            FROM tbCiscoEA
            WHERE {where_clause}
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(values))
            results = cursor.fetchall()
            return [row["ea_id"] for row in results]
        finally:
            cursor.close()
            conn.close()
        
        
    # INSERT dinâmico
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere registro baseado em dicionário.
        Retorna ea_id inserido.
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbCiscoEA ({columns})
            VALUES ({placeholders})
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # UPDATE dinâmico
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros baseado em:
        - data  -> colunas a alterar
        - where -> condição obrigatória

        Retorna número de linhas afetadas.
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório para evitar UPDATE global.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])

        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbCiscoEA
            SET {set_clause}
            WHERE {where_clause}
        """

        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()


    # ==========================================================
    # MEDIDAS CISCO EA (VIEW ANALÍTICA)
    # ==========================================================
    def load_measure_cisco_ea(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna todos os registros da view vwMeasureCiscoEA.

        Ordenação:
            - mcea_start_date ASC

        Uso típico:
            - Dashboards
            - Relatórios analíticos
            - Consolidação de métricas EA

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame

        Tratamento de erro:
            - Registra erro via ErrorRepository
            - Retorna lista vazia ou DataFrame vazio
        """

        query = """
            SELECT *
            FROM vwMeasureCiscoEA
            ORDER BY mcea_start_date
        """

        try:
            # Retorno como DataFrame (ideal para análises e dashboards)
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            # Retorno como lista de dicionários
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoEARepository.load_measure_cisco_ea",
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
    # BUSCAR TASK E ACTIVITY RELACIONADA AO CISCO EA TRUE FORWARD
    # ==========================================================
    def find_task_over_consumed(
        self,
        task_customer_id: int,
        task_ws: Optional[str],
        task_reference: str,
        track_keyword: str,
        subtrack_keyword: str
    ) -> Optional[Dict[str, Any]]:
        """
        Busca task_id e activity_id baseado em:

            - task_tasktype_id = 35
            - task_customer_id
            - task_ws (ou IS NULL)
            - task_reference (LIKE)
            - track/subtrack (LIKE)

        Retorno:
            {
                "task_id": int,
                "task_status_id": int,
                "activity_id": int,
                "activity_status_id": int
            }
            ou None
        """

        # ------------------------------------------------------
        # Montagem dinâmica do filtro task_ws
        # ------------------------------------------------------
        ws_condition = "AND t.task_ws IS NULL" if task_ws is None else "AND t.task_ws = %s"

        query = f"""
            SELECT
                t.task_id,
                t.task_status AS task_status_id,
                t.task_track,
                t.task_subtrack,
                IFNULL(a.activity_id, 0) AS activity_id,
                IFNULL(a.activity_status, 0) AS activity_status_id,
                a.activity_track,
                a.activity_sub_track AS activity_subtrack
            FROM tbTask t
            LEFT JOIN tbTaskActivity a 
                ON t.task_id = a.activity_task_id
            WHERE
                t.task_tasktype_id = 35
                AND t.task_customer_id = %s
                {ws_condition}
                AND t.task_reference LIKE %s
                AND (
                    t.task_track LIKE %s
                    OR t.task_subtrack LIKE %s
                    OR a.activity_track LIKE %s
                    OR a.activity_sub_track LIKE %s
                )
            LIMIT 1
        """

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            like_reference = f"%{task_reference}%"
            like_track = f"%{track_keyword}%"
            like_subtrack = f"%{subtrack_keyword}%"

            # --------------------------------------------------
            # Montar parâmetros dinamicamente
            # --------------------------------------------------
            params = [task_customer_id]

            if task_ws is not None:
                params.append(task_ws)

            params.extend([
                like_reference,
                like_track,
                like_subtrack,
                like_track,
                like_subtrack,
            ])

            cursor.execute(query, tuple(params))

            result = cursor.fetchone()
            return result if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoEARepository.find_task_over_consumed",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if "conn" in locals():
                cursor.close()
                conn.close()


    # ==========================================================
    # CUSTOMER CISCO EA CONSOLIDATED
    # ==========================================================
    def load_customer_cisco_ea_consolidated(
        self,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna todos os registros da view vwCustomerCiscoEAConsolidated.

        Parâmetros:
            as_df (bool):
                True  -> retorna pandas.DataFrame
                False -> retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra erro via ErrorRepository
        """

        query = """
            SELECT *
            FROM vwCustomerCiscoEAConsolidated
            ORDER BY customer_name, subscription_id, start_date, end_date
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoEARepository.load_customer_cisco_ea_consolidated",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()


    # ==========================================================
    # CUSTOMER CISCO EA CONSOLIDATED BY CUSTOMER_ID
    # ==========================================================
    def get_customer_cisco_ea_consolidated_by_customer_id(
        self,
        customer_id: int,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwCustomerCiscoEAConsolidated
        filtrando por customer_id.

        Parâmetros:
            customer_id (int):
                ID do cliente

            as_df (bool):
                True  -> retorna pandas.DataFrame
                False -> retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra erro via ErrorRepository
        """

        query = """
            SELECT *
            FROM vwCustomerCiscoEAConsolidated
            WHERE customer_id = %s
            ORDER BY customer_name, subscription_id, start_date, end_date
        """

        params = (int(customer_id),)

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoEARepository.get_customer_cisco_ea_consolidated_by_customer_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()
