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
