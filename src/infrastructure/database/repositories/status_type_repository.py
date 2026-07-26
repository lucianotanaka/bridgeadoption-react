"""
StatusTypeRepository
====================

Repository responsável pelas operações relacionadas a:

    - tbStatusType
    - tbStatusTypeJustification

Objetivos:
-----------
- Centralizar consultas relacionadas a tipos de status
- Padronizar retorno:
    • Lista de dicionários
    • DataFrame (opcional)
- Remover dependência de Streamlit
- Garantir tratamento de erro consistente
- Seguir padrão arquitetural do projeto

Padrão de retorno:
-------------------
- as_df=False → retorna List[Dict]
- as_df=True  → retorna pandas.DataFrame

Tratamento de erro:
--------------------
- Log via ErrorRepository
- Não propaga erro para camada de apresentação
- Retorna lista vazia ou DataFrame vazio

Exemplo de uso:
----------------

    repo = StatusTypeRepository()

    status_list = repo.load_status()

    justifications = repo.get_status_type_justification(status_id=2)

"""

from typing import List, Dict, Any, Union, Optional
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class StatusTypeRepository:
    """
    Repository do módulo Status Type.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # LISTAR TODOS OS STATUS
    # ==========================================================
    def load_status(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna todos os registros da tabela tbStatusType.
        """

        query = """
            SELECT *
            FROM tbStatusType
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
                error_function="StatusTypeRepository.load_status",
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
    # LISTAR JUSTIFICATIVAS POR STATUS
    # ==========================================================
    def get_status_type_justification(
        self,
        status_id: Optional[int] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna justificativas da tabela tbStatusTypeJustification.

        Parâmetros:
            status_id : int | None
                - Se informado → filtra por status
                - Se None → retorna todas

        Retorno:
            List[Dict] ou DataFrame
        """

        query = """
            SELECT *
            FROM tbStatusTypeJustification
        """

        conditions = []
        params: List[Any] = []

        # ------------------------------------------------------
        # Filtro opcional por status_id
        # ------------------------------------------------------
        if status_id is not None and status_id != 0:
            conditions.append("status_justification_status_id = %s")
            params.append(int(status_id))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

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
                error_function="StatusTypeRepository.get_status_type_justification",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()
