from typing import List, Dict, Any, Union, Optional
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class CiscoLCIRepository:
    """
    Repository responsável por consultas LCI Cisco.
    
    Como usar
    repo = CiscoLCIRepository()
    data = repo.find_all(task_eligible="Y")

    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    def find_all(
        self,
        task_eligible: str,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Retorna dados LCI filtrando por task_eligible ('Y' ou 'N').

        :param task_eligible: 'Y' ou 'N'
        :param as_df: Se True retorna DataFrame, senão List[Dict]
        """

        if task_eligible not in ("Y", "N"):
            raise ValueError("task_eligible deve ser 'Y' ou 'N'.")

        query = """
            SELECT
                t.task_id AS lci_task_id,
                c.company_name AS lci_client_name,
                ty.tasktype_name AS lci_type,
                t.task_track AS lci_track,
                t.task_subtrack AS lci_use_case,
                t.task_ws AS lci_ws,
                t.task_deal_id AS lci_deal_id,
                u.user_name AS lci_csm_name,
                t.task_eligible AS lci_task_eligible,
                t.task_status AS lci_task_status,
                t.task_end_fy AS lci_task_end_fy,
                CASE
                    WHEN a.activity_id IS NULL THEN 0
                    ELSE a.activity_id
                END AS lci_stage_id,
                a.activity_name AS lci_stage_name,
                a.activity_ws AS lci_stage_ws,
                a.activity_start AS lci_stage_estimated_start,
                a.activity_end AS lci_stage_estimated_end,
                a.activity_start_performed AS lci_stage_performed_start,
                a.activity_end_performed AS lci_stage_performed_end,
                a.activity_end_fy AS lci_stage_end_fy,
                a.activity_value AS lci_stage_value,
                a.activity_approved_value AS lci_stage_approval_value,
                a.activity_approval_date AS lci_stage_approval_date,
                a.activity_approval_fy AS lci_stage_approval_fy,
                a.activity_backlog_value AS lci_stage_backlog_value,
                a.activity_status AS lci_stage_status_id,
                s.statustype_name AS lci_stage_status_name,
                CASE 
                    WHEN a.activity_status IN (9, 10) THEN
                        CASE
                            WHEN a.activity_end_performed IS NULL THEN 'ON-TME'
                            WHEN a.activity_end_performed < a.activity_end THEN 'EARLY'
                            WHEN a.activity_end_performed = a.activity_end THEN 'ON-TIME'
                            ELSE 'ON-TIME'
                        END
                    ELSE ''
                END AS termination_status
            FROM tbTask t
            LEFT JOIN tbTaskActivity a
                ON t.task_id = a.activity_task_id
            INNER JOIN tbCompany c
                ON t.task_customer_id = c.company_id
            LEFT JOIN tbUser u
                ON t.task_owner_id = u.user_id
            INNER JOIN tbTaskType ty
                ON t.task_tasktype_id = ty.tasktype_id
            LEFT JOIN tbStatusType s
                ON a.activity_status = s.statustype_id
            WHERE
                t.task_eligible = %s
                AND t.task_tasktype_id IN (21, 22)
                AND a.activity_ws IS NOT NULL
        """

        conn = get_db_connection()

        try:
            if as_df:
                return pd.read_sql(query, conn, params=[task_eligible])

            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (task_eligible,))
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoLCIRepository.find_all",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            try:
                if not as_df:
                    cursor.close()
            except Exception:
                pass
            conn.close()


    # ==========================================================
    # LCI APROVADOS (COM VALOR DE APROVAÇÃO)
    # ==========================================================
    def load_cisco_lci_approved(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwCiscoLCI
        onde lci_stage_approval_value IS NOT NULL.

        Ordenação:
            - lci_stage_start_date ASC

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
        """

        query = """
            SELECT *
            FROM vwCiscoLCI
            WHERE lci_stage_approval_value IS NOT NULL
            ORDER BY lci_stage_start_date
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
                error_function="CiscoLCIRepository.load_cisco_lci_approved",
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
    # LCI JOURNEY (ETAPAS DO PROCESSO)
    # ==========================================================
    def load_cisco_lci_journey(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwCiscoLCIjourney.

        Ordenação:
            - task_start_date ASC

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
        """

        query = """
            SELECT *
            FROM vwCiscoLCIjourney
            ORDER BY task_start_date
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
                error_function="CiscoLCIRepository.load_cisco_lci_journey",
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
    # LCI ELIGIBLE STAGES STATUS
    # ==========================================================
    def get_lci_eligible_stages_status(
        self,
        fy: Optional[int] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwCiscoLCI para listar
        o status dos estágios de tarefas LCI elegíveis.

        Regras:
            - lci_stage_approval_value IS NOT NULL
            - lci_status NOT IN (4, 5)
            - se fy for informado:
                lci_stage_end_fy = fy
            - se fy for None:
                lci_stage_end_fy >= 2025

        Parâmetros:
            fy (int | None):
                FY NTT para filtro exato.
                Se None, retorna registros a partir de 2025.

            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
        """

        query = """
            SELECT *
            FROM vwCiscoLCI
            WHERE lci_stage_approval_value IS NOT NULL
              AND lci_status NOT IN (4, 5)
        """

        params: List[Any] = []

        if fy is not None:
            query += " AND lci_stage_end_fy = %s"
            params.append(int(fy))
        else:
            query += " AND lci_stage_end_fy >= %s"
            params.append(2025)

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
                error_function="CiscoLCIRepository.get_lci_eligible_stages_status",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals() and conn is not None:
                if "cursor" in locals() and cursor is not None:
                    cursor.close()
                conn.close()


    # =====================================================================
    # LCI - SOLUÇÃO vc PROJETOS (vwCustomerCiscoLCIDealTrackProjectStatus)
    # =====================================================================
    def load_lci_solution_vs_project(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view #vwCustomerCiscoLCIDealTrackProjectStatus

        Ordenação:
            - customer_name ASC

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
        """

        query = """
            SELECT *
            FROM vwCustomerCiscoLCIDealTrackProjectStatus
            ORDER BY customer_name
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
                error_function="CiscoLCIRepository.load_lci_solution_vs_project",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # =====================================================================
    # LCI - SOLUÇÃO vs PROJETOS + task_end (para filtro de Fiscal Year NTT)
    # =====================================================================
    def load_lci_solution_vs_project_with_task_end(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Reproduz a lógica de vwCustomerCiscoLCIDealTrackProjectStatus,
        porém expõe adicionalmente 'potential_task_end' (MIN(task_end)
        dentre as tarefas selecionadas por cliente + deal + track),
        permitindo filtrar por Fiscal Year NTT (abril -> março) no
        frontend React.

        Ordenação:
            - customer_name ASC

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
        """

        query = """
            WITH task_base AS (
                SELECT
                    t.task_id,
                    t.task_customer_id,
                    c.company_name AS customer_name,
                    t.task_track,
                    t.task_subtrack,
                    COALESCE(t.task_value, 0) AS task_value,
                    t.task_ws,
                    t.task_deal_id,
                    t.task_status,
                    t.task_end,
                    s.statustype_name AS task_status_name,
                    COALESCE(t.task_project_id, 0) AS task_project_id
                FROM tbTask t
                INNER JOIN tbCompany c
                    ON c.company_id = t.task_customer_id
                INNER JOIN tbStatusType s
                    ON s.statustype_id = t.task_status
                WHERE t.task_tasktype_id IN (21, 22)
                  AND t.task_customer_id <> 0
                  AND t.task_status NOT IN (4, 5, 6, 10)
            ),
            customer_track_deal_base AS (
                SELECT DISTINCT
                    tb.task_customer_id,
                    tb.customer_name,
                    tb.task_track,
                    tb.task_deal_id
                FROM task_base tb
            ),
            has_project_calc AS (
                SELECT
                    tb.task_customer_id,
                    tb.task_track,
                    tb.task_deal_id,
                    CASE
                        WHEN SUM(
                            CASE
                                WHEN tb.task_project_id > 0
                                 AND tb.task_status <> 1
                                THEN 1
                                ELSE 0
                            END
                        ) > 0 THEN 'YES'
                        WHEN COUNT(*) = SUM(
                            CASE
                                WHEN tb.task_status = 3 THEN 1
                                ELSE 0
                            END
                        ) THEN 'IN REVIEW'
                        WHEN COUNT(*) = SUM(
                            CASE
                                WHEN tb.task_status = 1 THEN 1
                                ELSE 0
                            END
                        ) THEN 'PENDING REVIEW'
                        ELSE 'NO'
                    END AS has_project
                FROM task_base tb
                GROUP BY
                    tb.task_customer_id,
                    tb.task_track,
                    tb.task_deal_id
            ),
            task_priority AS (
                SELECT
                    tb.*,
                    CASE
                        WHEN tb.task_status NOT IN (1, 3) THEN 1
                        WHEN tb.task_status = 3 THEN 2
                        WHEN tb.task_status = 1 THEN 3
                        ELSE 9
                    END AS priority_group
                FROM task_base tb
            ),
            best_priority AS (
                SELECT
                    tp.task_customer_id,
                    tp.task_track,
                    tp.task_deal_id,
                    MIN(tp.priority_group) AS best_priority_group
                FROM task_priority tp
                GROUP BY
                    tp.task_customer_id,
                    tp.task_track,
                    tp.task_deal_id
            ),
            min_value_by_priority AS (
                SELECT
                    tp.task_customer_id,
                    tp.task_track,
                    tp.task_deal_id,
                    bp.best_priority_group,
                    MIN(tp.task_value) AS min_task_value
                FROM task_priority tp
                INNER JOIN best_priority bp
                    ON bp.task_customer_id = tp.task_customer_id
                   AND bp.task_track = tp.task_track
                   AND bp.task_deal_id = tp.task_deal_id
                   AND bp.best_priority_group = tp.priority_group
                GROUP BY
                    tp.task_customer_id,
                    tp.task_track,
                    tp.task_deal_id,
                    bp.best_priority_group
            ),
            selected_tasks AS (
                SELECT DISTINCT
                    tp.task_id,
                    tp.task_customer_id,
                    tp.customer_name,
                    tp.task_track,
                    tp.task_subtrack,
                    tp.task_value,
                    tp.task_ws,
                    tp.task_deal_id,
                    tp.task_status,
                    tp.task_status_name,
                    tp.task_end
                FROM task_priority tp
                INNER JOIN min_value_by_priority mv
                    ON mv.task_customer_id = tp.task_customer_id
                   AND mv.task_track = tp.task_track
                   AND mv.task_deal_id = tp.task_deal_id
                   AND mv.best_priority_group = tp.priority_group
                   AND mv.min_task_value = tp.task_value
            ),
            selected_tasks_agg AS (
                SELECT
                    st.task_customer_id,
                    st.task_track,
                    st.task_deal_id,
                    GROUP_CONCAT(
                        st.task_subtrack
                        ORDER BY st.task_id
                        SEPARATOR ', '
                    ) AS potential_use_case,
                    MIN(st.task_value) AS potential_value_usd,
                    GROUP_CONCAT(
                        st.task_ws
                        ORDER BY st.task_id
                        SEPARATOR ', '
                    ) AS potential_task_ws,
                    GROUP_CONCAT(
                        st.task_status_name
                        ORDER BY st.task_id
                        SEPARATOR ', '
                    ) AS potential_task_status,
                    MIN(st.task_end) AS potential_task_end
                FROM selected_tasks st
                GROUP BY
                    st.task_customer_id,
                    st.task_track,
                    st.task_deal_id
            )
            SELECT
                ctdb.customer_name,
                sta.task_deal_id,
                ctdb.task_track AS solution_track,
                hpc.has_project,
                sta.potential_use_case,
                sta.potential_value_usd,
                sta.potential_task_ws,
                sta.potential_task_status,
                sta.potential_task_end
            FROM customer_track_deal_base ctdb
            INNER JOIN has_project_calc hpc
                ON hpc.task_customer_id = ctdb.task_customer_id
               AND hpc.task_track = ctdb.task_track
               AND hpc.task_deal_id = ctdb.task_deal_id
            INNER JOIN selected_tasks_agg sta
                ON sta.task_customer_id = ctdb.task_customer_id
               AND sta.task_track = ctdb.task_track
               AND sta.task_deal_id = ctdb.task_deal_id
            ORDER BY ctdb.customer_name
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
                error_function="CiscoLCIRepository.load_lci_solution_vs_project_with_task_end",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # =============================================================
    # RELAÇÃO DE TRACK E SE CLIENTE TEM ALGUM PROJETO EM ANDAMENTO
    # =============================================================
    def load_lci_track_project_pm(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwCustomerCiscoLCITrackProjectPM

        Ordenação:
            - lci_stage_start_date ASC

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
        """

        query = """
            SELECT *
            FROM vwCustomerCiscoLCITrackProjectPM
            ORDER BY customer_name
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
                error_function="CiscoLCIRepository.load_lci_track_project_pm",
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
    # LIST TASK LCI
    # ==========================================================
    def load_cisco_lci_all(
        self,
        fy: Optional[Union[int, List[int]]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros de tarefas do tipo Cisco LCI (task_tasktype_id IN (21, 22)).

        Filtro de Fiscal Year (NTT FY: abril → março, calculado sobre task_end):
            - fy=None       → retorna todos os registros sem filtro de FY
            - fy=2026       → retorna registros com task_end_data_fy = 2026
            - fy=[2025,2026] → retorna registros com task_end_data_fy IN (2025, 2026)

        Parâmetros:
            fy (int | List[int] | None): Fiscal Year(s) para filtro. Default=None.
            as_df (bool): Se True retorna DataFrame, senão List[Dict].

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
        """

        base_query = """
            SELECT
                t.task_id,
                t.task_tasktype_id AS task_type_id,
                ty.tasktype_name AS task_type_name,
                t.task_owner_id,
                u.user_name AS task_owner_name,
                t.task_customer_id,
                c.company_name AS task_customer_name,
                t.task_cr_party_id,
                t.task_cr_party_name,
                t.task_priority,
                t.task_project_id,
                t.task_status AS task_status_id,
                s.statustype_name AS task_status_name,
                t.task_status_justification,
                t.task_start,
                t.task_start_performed,
                COALESCE(t.task_start, t.task_start_performed) AS task_start_date,
                t.task_end,
                t.task_end_performed,
                COALESCE(t.task_end, t.task_end_performed) AS task_end_date,
                CASE
                    WHEN COALESCE(t.task_end, t.task_end_performed) IS NULL
                        THEN NULL
                    WHEN MONTH(COALESCE(t.task_end, t.task_end_performed)) >= 4
                        THEN YEAR(COALESCE(t.task_end, t.task_end_performed))
                    ELSE
                        YEAR(COALESCE(t.task_end, t.task_end_performed)) - 1
                END AS task_end_data_fy,
                t.task_ws,
                t.task_deal_id,
                t.task_track,
                t.task_subtrack,
                t.task_opt_in_flag,
                t.task_completed,
                t.task_eligible,
                t.task_booking_date,
                t.task_booking_amount,
                t.task_value,
                COALESCE(a.approved_value_sum, 0) AS task_approved_value,
                t.task_currency
            FROM tbTask t
            INNER JOIN tbCompany c
                ON c.company_id = t.task_customer_id
            INNER JOIN tbStatusType s
                ON s.statustype_id = t.task_status
            INNER JOIN tbTaskType ty
                ON t.task_tasktype_id = ty.tasktype_id
            INNER JOIN tbUser u
                ON u.user_id = t.task_owner_id
            LEFT JOIN (
                SELECT
                    activity_task_id,
                    SUM(activity_value) AS activity_value_sum,
                    SUM(activity_approved_value) AS approved_value_sum
                FROM tbTaskActivity
                GROUP BY activity_task_id
            ) a
                ON a.activity_task_id = t.task_id
            WHERE t.task_tasktype_id IN (21, 22)
              AND t.task_customer_id > 0
        """

        params: List[Any] = []

        # Normalise fy to a list (or empty list meaning "no filter")
        if fy is not None:
            fy_list = [fy] if isinstance(fy, int) else list(fy)
            fy_list = [int(f) for f in fy_list if f is not None]
            if fy_list:
                placeholders = ", ".join(["%s"] * len(fy_list))
                base_query += f"""
            AND CASE
                    WHEN COALESCE(t.task_end, t.task_end_performed) IS NULL THEN NULL
                    WHEN MONTH(COALESCE(t.task_end, t.task_end_performed)) >= 4
                        THEN YEAR(COALESCE(t.task_end, t.task_end_performed))
                    ELSE YEAR(COALESCE(t.task_end, t.task_end_performed)) - 1
                END IN ({placeholders})"""
                params.extend(fy_list)

        base_query += "\n            ORDER BY COALESCE(t.task_start, t.task_start_performed)"

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(base_query, engine, params=tuple(params) if params else None)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(base_query, tuple(params) if params else ())
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="CiscoLCIRepository.load_cisco_lci_all",
                error_command=base_query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                try:
                    cursor.close()
                except Exception:
                    pass
                conn.close()
