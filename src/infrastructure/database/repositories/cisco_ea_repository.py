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
    Repository responsável por:

        - tbCiscoEA (contratos EA)
        - tbCiscoEnterpriseAgreementMetering (medições EA - mcea_*)
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
    # ==========================================================
    # MEDIÇÃO CISCO EA (tbCiscoEnterpriseAgreementMetering)
    # ==========================================================
    def find_metering_first_by(self, where: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Busca primeiro registro da tbCiscoEnterpriseAgreementMetering
        baseado em filtro simples (AND).
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT *
            FROM tbCiscoEnterpriseAgreementMetering
            WHERE {where_clause}
            LIMIT 1
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoEARepository.find_metering_first_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            if conn:
                cursor.close()
                conn.close()


    def insert_metering(self, data: Dict[str, Any]) -> int:
        """
        Insere registro na tbCiscoEnterpriseAgreementMetering.
        Retorna mcea_id inserido.
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbCiscoEnterpriseAgreementMetering ({columns})
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

        except Exception:
            if conn:
                conn.rollback()
            raise

        finally:
            if conn:
                cursor.close()
                conn.close()


    def find_latest_metering_snapshot(
        self,
        client_id: int,
        subscription: Optional[str],
        product_id: int,
        start_date: Optional[str],
        end_date: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Retorna o snapshot mais recente (por mcea_update DESC)
        para combinação lógica principal.
        """

        query = """
            SELECT *
            FROM tbCiscoEnterpriseAgreementMetering
            WHERE mcea_client_id = %s
              AND (mcea_subscription = %s OR (%s IS NULL AND mcea_subscription IS NULL))
              AND mcea_product_id = %s
              AND (mcea_start_date = %s OR (%s IS NULL AND mcea_start_date IS NULL))
              AND (mcea_end_date = %s OR (%s IS NULL AND mcea_end_date IS NULL))
            ORDER BY mcea_update DESC, mcea_id DESC
            LIMIT 1
        """

        params = (
            client_id,
            subscription,
            subscription,
            product_id,
            start_date,
            start_date,
            end_date,
            end_date,
        )

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoEARepository.find_latest_metering_snapshot",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            if conn:
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
        Retorna todos os registros da view vwCiscoEAMeteringLatest.

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
            FROM vwCiscoEAMeteringLatest
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
    # CISCO EA — HISTÓRICO COMPLETO POR CLIENTE (todos snapshots)
    # ==========================================================
    def get_cisco_ea_metering_full_history(
        self,
        client_id: int,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna TODOS os registros históricos do cliente,
        ordenados por data de medição (mcea_update ASC).

        Objetivo:
            Alimentar gráficos de linha do tempo que mostram
            a evolução de Purchased / Generated / Balance ao longo
            do período de cada contrato (Start → End).

        Parâmetros:
            client_id (int) : ID do cliente
            as_df    (bool) : True → DataFrame, False → List[Dict]

        Retorno:
            DataFrame ou List[Dict] com todos os snapshots históricos,
            ordenados por mcea_update ASC, mcea_suite_name, mcea_sku.

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra erro via ErrorRepository
        """

        query = """
            SELECT
                mcea_id,
                mcea_client_id,
                mcea_subscription,
                mcea_suite_name,
                mcea_sku,
                mcea_domain,
                mcea_virtual_account,
                mcea_status,
                mcea_start_date,
                mcea_end_date,
                mcea_total_purchased,
                mcea_generated,
                mcea_balance,
                IF(mcea_balance < 0, mcea_balance * -1, 0) AS mcea_overconsume,
                mcea_update
            FROM tbCiscoEnterpriseAgreementMetering
            WHERE mcea_client_id = %s
            ORDER BY mcea_update ASC, mcea_suite_name, mcea_sku
        """

        params = (int(client_id),)

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
                error_function="CiscoEARepository.get_cisco_ea_metering_full_history",
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
    # CISCO EA — SNAPSHOTS DO DIA MAIS RECENTE (ANÁLISE INTRA-DIA)
    # ==========================================================
    def get_cisco_ea_intraday_snapshots(
        self,
        client_id: int,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna TODOS os snapshots do dia mais recente de medição.

        Objetivo:
            Detectar overconsumes que foram resolvidos no mesmo dia —
            situações em que uma medição anterior mostrava balance < 0
            e a medição mais recente (max mcea_id) mostra balance >= 0.

        Parâmetros:
            client_id (int) : ID do cliente
            as_df    (bool) : True → DataFrame, False → List[Dict]

        Retorno:
            DataFrame ou List[Dict] com todos os snapshots do dia mais recente.

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra erro via ErrorRepository
        """

        query = """
            SELECT
                mcea_id,
                mcea_client_id,
                mcea_domain,
                mcea_virtual_account,
                mcea_subscription,
                mcea_start_date,
                mcea_end_date,
                mcea_suite_name,
                mcea_sku,
                mcea_purchased,
                mcea_total_purchased,
                mcea_generated,
                mcea_balance,
                IF(mcea_balance < 0, mcea_balance * -1, 0) AS mcea_overconsume,
                mcea_update
            FROM tbCiscoEnterpriseAgreementMetering
            WHERE mcea_client_id = %s
              AND mcea_update = (
                  SELECT MAX(mcea_update)
                  FROM tbCiscoEnterpriseAgreementMetering
                  WHERE mcea_client_id = %s
              )
            ORDER BY mcea_suite_name, mcea_sku, mcea_id
        """

        params = (int(client_id), int(client_id))

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
                error_function="CiscoEARepository.get_cisco_ea_intraday_snapshots",
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



    # ==========================================================
    # CISCO ENTERPRISE AGREEMENT METERING LASTEST BY CLIENTE ID
    # ==========================================================
    def get_cisco_ea_metering_by_client_id(
        self,
        client_id: int,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros filtrando por customer_id.

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
        query = "SELECT * FROM vwCiscoEAMeteringLatest WHERE mcea_client_id = %s"

        params = (int(client_id),)

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
                error_function="CiscoEARepository.get_cisco_ea_metering_by_client_id",
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
    # CISCO EA — SUBSCRIPTION REPORT (tbCiscoEA + Company + Product)
    # ==========================================================
    def load_cisco_ea_subscription_report(
        self,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados de tbCiscoEA enriquecidos com nome do cliente e
        nome do produto, para uso no relatório de Subscription / True Forward.

        Campos retornados:
            - end_customer           : nome do cliente (tbCompany)
            - offer_name             : nome do produto/oferta (tbProduct)
            - subscription_id        : ea_subscription_id
            - consumption_status     : ea_consumption_status
            - pending_tf_effective_date : ea_tf_effective_date
            - next_true_forward      : ea_next_tf
            - status                 : ea_ccw_line_status
            - start_date             : ea_start_date
            - end_date               : ea_end_date
            - currency               : ea_currency
            - tf_overage             : ea_tf_overage
            - buying_program_id      : ea_buying_program_id
            - provisioning_status    : ea_provisioning_status
            - customer_id            : ea_end_customer_id
            - ea_id                  : chave primária
            - ea_mrc                 : monthly charge
            - ea_over_consumed_tf_groups
            - ea_tf_groups

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

        # Colunas opcionais (podem nao existir em versoes mais antigas do schema)
        # Tentativa 1: query completa com todas as colunas
        # Tentativa 2: fallback sem colunas opcionais
        _OPTIONAL_COLS = [
            "ea.ea_pending_tf_effective_date",
            "ea.ea_consumed_suite_value_percent",
            "ea.ea_exceptional_growth_anniversary",
            "ea.ea_exceptional_growth_tf_eligible",
        ]

        def _build_query(include_optional: bool) -> str:
            optional_part = ""
            if include_optional:
                optional_part = """
                ea.ea_pending_tf_effective_date,
                ea.ea_consumed_suite_value_percent,
                ea.ea_exceptional_growth_anniversary,
                ea.ea_exceptional_growth_tf_eligible,"""
            return f"""
            SELECT
                c.company_name                      AS end_customer,
                p.product_name                      AS offer_name,
                ea.ea_id,
                ea.ea_end_customer_id               AS customer_id,
                ea.ea_subscription_id               AS subscription_id,
                ea.ea_consumption_status            AS consumption_status,
                ea.ea_tf_effective_date             AS pending_tf_effective_date,{optional_part}
                ea.ea_next_tf                       AS next_true_forward,
                ea.ea_ccw_line_status               AS status,
                ea.ea_start_date                    AS start_date,
                ea.ea_end_date                      AS end_date,
                ea.ea_currency                      AS currency,
                ea.ea_tf_overage                    AS tf_overage,
                ea.ea_buying_program_id             AS buying_program_id,
                ea.ea_provisioning_status           AS provisioning_status,
                ea.ea_mrc,
                ea.ea_over_consumed_tf_groups,
                ea.ea_tf_groups
            FROM tbCiscoEA ea
            LEFT JOIN tbCompany c ON c.company_id = ea.ea_end_customer_id
            LEFT JOIN tbProduct p ON p.product_id = ea.ea_product_id
            ORDER BY c.company_name, ea.ea_end_date, ea.ea_subscription_id
        """

        def _add_missing_optional_cols(df: pd.DataFrame) -> pd.DataFrame:
            """Adiciona colunas opcionais ausentes com valor None."""
            for col in [
                "ea_pending_tf_effective_date",
                "ea_consumed_suite_value_percent",
                "ea_exceptional_growth_anniversary",
                "ea_exceptional_growth_tf_eligible",
            ]:
                if col not in df.columns:
                    df[col] = None
            return df

        # Tentativa 1: query completa (com colunas opcionais)
        query = _build_query(include_optional=True)
        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                df = pd.read_sql(query, engine)
                return _add_missing_optional_cols(df)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            return rows

        except Exception:
            # Tentativa 2: fallback sem colunas opcionais
            query_fallback = _build_query(include_optional=False)
            try:
                if as_df:
                    engine = get_sqlalchemy_engine()
                    df = pd.read_sql(query_fallback, engine)
                    return _add_missing_optional_cols(df)

                conn2 = get_db_connection()
                cursor2 = conn2.cursor(dictionary=True)
                cursor2.execute(query_fallback)
                rows = cursor2.fetchall()
                cursor2.close()
                conn2.close()
                # Adicionar colunas opcionais como None nos dicts
                for row in rows:
                    for col in [
                        "ea_pending_tf_effective_date",
                        "ea_consumed_suite_value_percent",
                        "ea_exceptional_growth_anniversary",
                        "ea_exceptional_growth_tf_eligible",
                    ]:
                        if col not in row:
                            row[col] = None
                return rows

            except Exception as e2:
                self.error_repo.log_error(
                    error_function="CiscoEARepository.load_cisco_ea_subscription_report",
                    error_command=query_fallback,
                    error_description=str(e2),
                    error_traceback=traceback.format_exc()
                )
                return pd.DataFrame() if as_df else []


    # ==========================================================
    # CISCO ENTERPRISE AGREEMENT HISTORY BY CLIENTE ID
    # ==========================================================
    def get_cisco_ea_history_by_client_id(
        self,
        client_id: int,
        as_df: bool = True
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros filtrando por customer_id.

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
        query = "SELECT * FROM vwCiscoEAMeteringHistory WHERE mcea_client_id = %s"

        params = (int(client_id),)

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
                error_function="CiscoEARepository.get_cisco_ea_history_by_client_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()
