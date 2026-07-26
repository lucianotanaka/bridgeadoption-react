"""
TeamTargetRepository
==================

Repository responsável pelas operações relacionadas a:

    - tbTeamTarget
    - vwMeasureTeamTarget

Objetivos:
-----------
- Centralizar consultas de metas de time (Team Target)
- Padronizar retorno como:
    • Lista de dicionários
    • DataFrame (opcional)
- Remover dependência de Streamlit
- Garantir tratamento de erro consistente
- Evitar SQL Injection
- Seguir padrão arquitetural do projeto

Padrão de retorno:
-------------------
- as_df=False → retorna List[Dict]
- as_df=True  → retorna pandas.DataFrame

Tratamento de erro:
--------------------
- Log via ErrorRepository
- Não lança exceção para camada de apresentação
- Retorna lista vazia ou DataFrame vazio

Exemplos de uso:
----------------

    repo = TeamTargetRepository()

    # Listar FY disponíveis para um time
    fy_list = repo.load_fiscal_year(team_id=3)

    # Buscar metas por FY
    target = repo.get_team_target_by_fy(fy=2026, team_id=3)

    # Medição da meta
    measure_df = repo.get_measure_team_target_by_id(10, as_df=True)

"""

from typing import List, Dict, Any, Union, Optional
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class TeamTargetRepository:
    """
    Repository do módulo Team Target.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # LISTAR ANOS FISCAIS DISPONÍVEIS PARA UM TIME
    # ==========================================================
    def load_fiscal_year(
        self,
        team_id: Optional[int],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna lista de anos fiscais (target_fy)
        associados a um time específico.
        """

        if not team_id:
            return [] if not as_df else pd.DataFrame()

        try:
            team_id = int(team_id)
        except (TypeError, ValueError):
            return [] if not as_df else pd.DataFrame()

        query = """
            SELECT target_fy
            FROM tbTeamTarget
            WHERE target_team_id = %s
            GROUP BY target_fy
            ORDER BY target_fy
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(team_id,))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (team_id,))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TeamTargetRepository.load_fiscal_year",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # BUSCAR METAS POR FY E TIME
    # ==========================================================
    def get_team_target_by_fy(
        self,
        fy: Optional[int],
        team_id: Optional[int] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna metas de um determinado ano fiscal (FY).
        Pode opcionalmente filtrar por team_id.
        """

        if not fy:
            return [] if not as_df else pd.DataFrame()

        try:
            fy = int(fy)
        except (TypeError, ValueError):
            return [] if not as_df else pd.DataFrame()

        query = """
            SELECT
                target_id AS ID,
                target_fy AS FY,
                target_name AS TARGET,
                target_description AS DESCRIPTION,
                target_team_id AS TEAM,
                target_users_list AS USERS,
                target_tasks_list AS TASKS,
                target_measurement_by_counting AS MEASURE_BY_COUNTING,
                target_measurement_by_sum AS MEASURE_BY_SUM,
                target_point AS POINTS,
                target_multiplier AS MULTIPLIER,
                target_value AS VALUE,
                target_individual AS INDIVIDUAL
            FROM tbTeamTarget
            WHERE target_fy = %s
        """

        params = [fy]

        # Correção importante:
        # Removido f-string que gerava risco de SQL Injection
        if team_id:
            try:
                team_id = int(team_id)
                query += " AND target_team_id = %s"
                params.append(team_id)
            except (TypeError, ValueError):
                return [] if not as_df else pd.DataFrame()

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
                error_function="TeamTargetRepository.get_team_target_by_fy",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # BUSCAR MEDIÇÃO DE META POR ID
    # ==========================================================
    def get_measure_team_target_by_id(
        self,
        target_id: Optional[int],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados de medição da meta
        a partir da view vwMeasureTeamTarget.
        """

        if not target_id:
            return [] if not as_df else pd.DataFrame()

        try:
            target_id = int(target_id)
        except (TypeError, ValueError):
            return [] if not as_df else pd.DataFrame()

        query = """
            SELECT *
            FROM vwMeasureTeamTarget
            WHERE target_id = %s
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(target_id,))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (target_id,))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TeamTargetRepository.get_measure_team_target_by_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()
