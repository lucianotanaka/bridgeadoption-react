"""
ContractVendorAssetRepository

Responsável por operações relacionadas a:

- tbContractVendorAsset
- vwContractVendorAsset

Objetivos:

1) Centralizar acesso aos contratos vendor-asset.
2) Permitir consultas dinâmicas.
3) Reaproveitar registros VAGO antes de inserir.
4) Permitir INSERT e UPDATE dinâmicos.
5) Registrar erros com query e parâmetros executados.

Regras de retorno importantes:

update():
    0  -> erro
    1  -> sucesso (houve alteração OU dados já eram iguais)
    -1 -> nenhum registro encontrado
"""

from typing import Any, Dict, Optional, Union, List
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class ContractVendorAssetRepository:

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # Helper interno para log detalhado de SQL
    # ==========================================================
    def _format_query_log(self, query: str, params: Optional[tuple]) -> str:
        """
        Formata comando SQL para log incluindo parâmetros reais.

        Objetivo:
        Permitir auditoria completa da instrução executada,
        evitando perda de informação por uso de placeholders (%s).

        Exemplo de saída:
            UPDATE tbTable SET col=%s WHERE id=%s | params=(10, 5)
        """
        return f"{query.strip()} | params={params}"

    # ==========================================================
    # 1) SELECT vendorasset_id dinâmico
    # ==========================================================
    def find_vendorasset_id(
        self,
        where_clause: str,
        params: Optional[tuple] = None
    ) -> int:

        if not where_clause:
            raise ValueError("WHERE é obrigatório.")

        query = f"""
            SELECT vendorasset_id
            FROM tbContractVendorAsset
            WHERE {where_clause}
            ORDER BY vendorasset_id ASC
            LIMIT 1
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            result = cursor.fetchone()
            return int(result[0]) if result else 0

        except Exception as e:
            self.error_repo.log_error(
                "ContractVendorAssetRepository.find_vendorasset_id",
                self._format_query_log(query, params),
                str(e),
                traceback.format_exc()
            )
            return 0

        finally:
            conn.close()

    # ==========================================================
    # 2) SELECT da VIEW por ID
    # ==========================================================
    def find_from_view_by_id(
        self,
        fields: str,
        vendorasset_id: int,
        as_df: bool = False
    ) -> Union[Dict, pd.DataFrame, None]:

        query = f"""
            SELECT {fields}
            FROM vwContractVendorAsset
            WHERE vendorasset_id = %s
        """

        try:
            if as_df:
                return pd.read_sql(
                    query,
                    get_sqlalchemy_engine(),
                    params=(vendorasset_id,)
                )

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (vendorasset_id,))
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                "ContractVendorAssetRepository.find_from_view_by_id",
                self._format_query_log(query, (vendorasset_id,)),
                str(e),
                traceback.format_exc()
            )
            return None if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                conn.close()

    # ==========================================================
    # 3) Listagem consolidada
    # ==========================================================
    def list_contracts_summary(
        self,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:

        query = """
            SELECT
                va.vendorasset_contract_num AS vendorasset_contract_num,
                va.vendorasset_vendor_id AS vendorasset_vendor_id,
                v.company_name AS vendorasset_vendor_name,
                va.vendorasset_customer_id AS vendorasset_customer_id,
                c.company_name AS vendorasset_customer_name
            FROM tbContractVendorAsset va
            JOIN tbCompany v ON v.company_id = va.vendorasset_vendor_id
            JOIN tbCompany c ON c.company_id = va.vendorasset_customer_id
            GROUP BY
                va.vendorasset_contract_num,
                va.vendorasset_vendor_id,
                va.vendorasset_customer_id
            ORDER BY
                c.company_name
        """

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine())

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                "ContractVendorAssetRepository.list_contracts_summary",
                self._format_query_log(query, None),
                str(e),
                traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                conn.close()

    # ==========================================================
    # 4) INSERT com reaproveitamento de VAGO
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:

        if not data:
            raise ValueError("Dados são obrigatórios.")

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            query_vago = """
                SELECT MIN(vendorasset_id)
                FROM tbContractVendorAsset
                WHERE vendorasset_vendor_id=0
                  AND vendorasset_customer_id=0
                  AND vendorasset_asset_id=0
            """

            cursor.execute(query_vago)
            result = cursor.fetchone()
            vago_id = result[0] if result and result[0] else None

            if vago_id:
                set_clause = ", ".join([f"{col}=%s" for col in data])
                values = tuple(data.values())

                query_update = f"""
                    UPDATE tbContractVendorAsset
                    SET {set_clause}
                    WHERE vendorasset_id=%s
                """

                cursor.execute(query_update, values + (vago_id,))
                conn.commit()
                return int(vago_id)

            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = tuple(data.values())

            query_insert = f"""
                INSERT INTO tbContractVendorAsset ({columns})
                VALUES ({placeholders})
            """

            cursor.execute(query_insert, values)
            conn.commit()
            return int(cursor.lastrowid)

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "ContractVendorAssetRepository.insert",
                self._format_query_log(
                    query_update if 'query_update' in locals() else query_insert,
                    values if 'values' in locals() else None
                ),
                str(e),
                traceback.format_exc()
            )
            return 0

        finally:
            conn.close()

    # ==========================================================
    # 5) UPDATE dinâmico com retorno inteligente
    # ==========================================================
    def update(
        self,
        data: Dict[str, Any],
        where: Dict[str, Any]
    ) -> int:

        if not data or not where:
            raise ValueError("Data e WHERE são obrigatórios.")

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            # 1) Verifica existência
            where_clause = " AND ".join([f"{col}=%s" for col in where])
            where_values = tuple(where.values())

            query_check = f"""
                SELECT 1
                FROM tbContractVendorAsset
                WHERE {where_clause}
                LIMIT 1
            """

            cursor.execute(query_check, where_values)

            if not cursor.fetchone():
                return -1

            # 2) Executa UPDATE
            set_clause = ", ".join([f"{col}=%s" for col in data])
            values = tuple(data.values()) + where_values

            query_update = f"""
                UPDATE tbContractVendorAsset
                SET {set_clause}
                WHERE {where_clause}
            """

            cursor.execute(query_update, values)
            conn.commit()

            return 1

        except Exception as e:
            conn.rollback()

            self.error_repo.log_error(
                "ContractVendorAssetRepository.update",
                self._format_query_log(
                    query_update if 'query_update' in locals() else "UPDATE tbContractVendorAsset",
                    values if 'values' in locals() else None
                ),
                str(e),
                traceback.format_exc()
            )

            return 0

        finally:
            conn.close()
