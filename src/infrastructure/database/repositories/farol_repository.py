"""
FarolRepository

Responsável por operações relacionadas às tabelas:

    - tbClientFarol
    - tbFarol

Objetivos:
-----------
- Centralizar acesso aos dados do módulo Farol
- Padronizar retorno como:
    • Lista de dicionários
    • DataFrame (opcional)
- Remover dependência de Streamlit
- Garantir tratamento de erro consistente
- Seguir o padrão arquitetural dos demais repositories

Padrão de retorno:
-------------------
- as_df=False → retorna List[Dict]
- as_df=True  → retorna pandas.DataFrame

Tratamento de erro:
--------------------
- Registra erro via ErrorRepository
- Nunca quebra a aplicação
- Retorna lista vazia ou DataFrame vazio

Exemplo de uso:
----------------

    repo = FarolRepository()

    # Lista de clientes
    clients = repo.get_farol(vendor_id=1)

    # DataFrame para Streamlit
    clients_df = repo.get_farol(vendor_id=1, as_df=True)

    # Carregar dados do Farol
    farol_data = repo.load_farol(vendor_id=1, client_id=10)

"""

from typing import List, Dict, Any, Union, Optional
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class FarolRepository:
    """
    Repository do módulo Farol.

    Responsável por:
        - Buscar clientes vinculados a um vendor
        - Carregar dados consolidados do Farol
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # SELECT clientes do Farol por vendor
    # ==========================================================
    def get_farol(
        self,
        vendor_id: Optional[int],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna clientes disponíveis no Farol para um vendor específico.

        Parâmetros:
        -----------
        vendor_id : int
            ID do vendor.

        as_df : bool
            Se True retorna pandas.DataFrame.
            Se False retorna lista de dicionários.

        Retorno:
        --------
        List[Dict] ou DataFrame

        Estrutura retornada:
        ---------------------
            client_id
            client_name

        Regras:
        -------
        - vendor_id inválido → retorna vazio
        - Não lança exceção para o frontend
        """

        # ------------------------------------------------------
        # Validação básica
        # ------------------------------------------------------
        if not vendor_id:
            return [] if not as_df else pd.DataFrame()

        try:
            vendor_id = int(vendor_id)
        except (TypeError, ValueError):
            return [] if not as_df else pd.DataFrame()

        query = """
            SELECT
                customer_id AS client_id,
                customer_name AS client_name
            FROM tbClientFarol
            WHERE vendor_id = %s
            GROUP BY customer_id
            ORDER BY customer_name
        """

        try:
            # --------------------------------------------------
            # Retorno como DataFrame (ideal para Streamlit)
            # --------------------------------------------------
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(vendor_id,))

            # --------------------------------------------------
            # Retorno como lista de dicionários
            # --------------------------------------------------
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (vendor_id,))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="FarolRepository.get_farol",
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
    # SELECT dados do Farol por vendor e cliente
    # ==========================================================
    def load_farol(
        self,
        vendor_id: Optional[int],
        client_id: Optional[int],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados completos do Farol para um vendor e cliente.

        Parâmetros:
        -----------
        vendor_id : int
            ID do vendor.

        client_id : int
            ID do cliente.

        as_df : bool
            Se True retorna DataFrame.
            Se False retorna lista de dicionários.

        Retorno:
        --------
        List[Dict] ou DataFrame

        Regras:
        -------
        - vendor_id ou client_id inválidos → retorna vazio
        - Não lança exceção para o frontend
        - Tratamento de erro centralizado
        """

        # ------------------------------------------------------
        # Validação básica
        # ------------------------------------------------------
        if not vendor_id or not client_id:
            return [] if not as_df else pd.DataFrame()

        try:
            vendor_id = int(vendor_id)
            client_id = int(client_id)
        except (TypeError, ValueError):
            return [] if not as_df else pd.DataFrame()

        query = """
            SELECT *
            FROM tbFarol
            WHERE vendor_id = %s
              AND customer_id = %s
        """

        try:
            # --------------------------------------------------
            # Retorno como DataFrame
            # --------------------------------------------------
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(
                    query,
                    engine,
                    params=(vendor_id, client_id)
                )

            # --------------------------------------------------
            # Retorno como lista de dicionários
            # --------------------------------------------------
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (vendor_id, client_id))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="FarolRepository.load_farol",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()
