"""
AdoptionForecastRepository
===========================

Repository responsável por consultas relacionadas a:

    - vwForecast
    - vwTaskIncentive

Objetivos:
-----------
- Centralizar acesso a dados de Forecast e Incentivos
- Padronizar retorno:
    • Lista de dicionários
    • DataFrame (opcional)
- Remover dependência de Streamlit
- Garantir tratamento de erro consistente
- Manter padrão arquitetural do projeto

Padrão de retorno:
-------------------
- as_df=False → retorna List[Dict]
- as_df=True  → retorna pandas.DataFrame

Tratamento de erro:
--------------------
- Loga erro via ErrorRepository
- Não propaga erro para camada de apresentação
- Retorna lista vazia ou DataFrame vazio

Exemplos de uso:
----------------

    repo = AdoptionForecastRepository()

    # Lista de FY disponíveis
    fy_list = repo.load_fy_forecast()

    # Forecast a partir de um FY específico
    forecast_df = repo.get_forecast_by_fy(2026, as_df=True)

    # Incentivos
    incentive_data = repo.load_task_incentive()

"""

from typing import List, Dict, Any, Union, Optional
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class AdoptionForecastRepository:
    """
    Repository do módulo Adoption Forecast.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # LISTAR ANOS FISCAIS DISPONÍVEIS NO FORECAST
    # ==========================================================
    def load_fy_forecast(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna lista de anos fiscais disponíveis no vwForecast.

        Retorno:
            List[Dict] ou DataFrame

        Estrutura:
            activity_end_fy
        """

        query = """
            SELECT activity_end_fy
            FROM vwForecast
            WHERE activity_end_fy IS NOT NULL
            GROUP BY activity_end_fy
            ORDER BY activity_end_fy
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
                error_function="AdoptionForecastRepository.load_fy_forecast",
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
    # FORECAST A PARTIR DE UM FY
    # ==========================================================
    def get_forecast_by_fy(
        self,
        fy: Optional[int],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados do vwForecast a partir de um ano fiscal.

        Regra:
            - activity_end_fy >= fy
            OU
            - activity_approval_fy = fy
        """

        if not fy:
            return [] if not as_df else pd.DataFrame()

        try:
            fy = int(fy)
        except (TypeError, ValueError):
            return [] if not as_df else pd.DataFrame()

        query = """
            SELECT *
            FROM vwForecast
            WHERE activity_end_fy >= %s
               OR activity_approval_fy = %s
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(fy, fy))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (fy, fy))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="AdoptionForecastRepository.get_forecast_by_fy",
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
    # LISTAR TASK INCENTIVE
    # ==========================================================
    def load_task_incentive(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da view vwTaskIncentive.

        Ordenação:
            task_start ASC
        """

        query = """
            SELECT *
            FROM vwTaskIncentive
            ORDER BY task_start
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
                error_function="AdoptionForecastRepository.load_task_incentive",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()
