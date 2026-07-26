from __future__ import annotations

from typing import Optional, List, Dict, Union
import pandas as pd
from src.infrastructure.database.connection import get_db_connection


class CiscoDomainRepository:
    """
    Repository responsável por consultas de domínios Cisco
    baseados na tabela tbCiscoSmartAccountMetering.
    """

    def get_domain_all(
        self,
        client_id: Optional[int] = None,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Retorna domínios Cisco agrupados por cliente.

        Parâmetros:
            client_id: filtra por cliente específico
            as_df: se True retorna DataFrame, senão List[Dict]

        Retorno:
            List[Dict] ou pandas.DataFrame
            
        Retornar lista de dicionários
        repo = CiscoDomainRepository()

        domains = repo.cisco_domain_all(client_id=10)
        
        [
            {"client_id": 10, "cisco_domain": "empresa.com"},
            ...
        ]

        Retornar DataFrame
        df = repo.cisco_domain_all(client_id=10, as_df=True)

        """

        query = """
            SELECT 
                mcsa_client_id AS client_id,
                mcsa_domain AS cisco_domain
            FROM tbCiscoSmartAccountMetering
        """

        conditions = []
        params = []

        if client_id and client_id > 0:
            conditions.append("mcsa_client_id = %s")
            params.append(int(client_id))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " GROUP BY mcsa_client_id, mcsa_domain"

        conn = get_db_connection()

        try:
            if as_df:
                return pd.read_sql(query, conn, params=params if params else None)

            cursor = conn.cursor(dictionary=True)

            if params:
                cursor.execute(query, tuple(params))
            else:
                cursor.execute(query)

            return cursor.fetchall()

        finally:
            if not as_df:
                cursor.close()
            conn.close()


    def get_domains_by_client_id(
        self,
        client_id: int,
        as_df: bool = False
    ) -> Union[List[str], pd.DataFrame]:
        """
        Retorna os domínios (mcsa_domain) de um cliente específico.

        Parâmetros:
            client_id: ID do cliente (obrigatório)
            as_df: Se True retorna DataFrame, senão retorna lista de strings

        Retorno:
            List[str] ou pandas.DataFrame
        """

        query = """
            SELECT DISTINCT mcsa_domain AS cisco_domain
            FROM tbCiscoSmartAccountMetering
            WHERE mcsa_client_id = %s
        """

        conn = get_db_connection()

        try:
            if as_df:
                return pd.read_sql(query, conn, params=(client_id,))

            cursor = conn.cursor()
            cursor.execute(query, (client_id,))
            results = cursor.fetchall()

            # Retorna apenas lista de domínios
            return [row[0] for row in results]

        finally:
            if not as_df:
                cursor.close()
            conn.close()