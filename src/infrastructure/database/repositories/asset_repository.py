"""
AssetRepository

Responsável por operações relacionadas à tabela tbAsset
e consultas auxiliares de contratos e clientes com ativos.

Objetivos:
- Centralizar acesso à tbAsset
- Permitir SELECT dinâmico
- Permitir INSERT e UPDATE dinâmicos
- Permitir WHERE livre (com parâmetros)
- Registrar erros via ErrorRepository
- Retornar dados como lista de dict ou DataFrame
"""

#from __future__ import annotations

from typing import Optional, List, Dict, Union, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class AssetRepository:

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # SELECT asset_id baseado em dicionário
    # ==========================================================
    def find_ids_by(
        self,
        where: Dict[str, Any],
        as_df: bool = False
    ) -> Union[List[int], pd.DataFrame]:
        """
        Retorna lista de asset_id com base em filtros dinâmicos.

        Exemplo:
            repo.find_ids_by({
                "asset_product_id": 100,
                "asset_serial_number": "ABC123"
            })
        """

        if not where:
            raise ValueError("WHERE é obrigatório.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT asset_id
            FROM tbAsset
            WHERE {where_clause}
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=values)

            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, values)
            return [row[0] for row in cursor.fetchall()]

        except Exception as e:
            self.error_repo.log_error(
                error_function="AssetRepository.find_ids_by",
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
    # SELECT * WHERE asset_id = %s
    # ==========================================================
    def find_by_id(
        self,
        asset_id: int,
        as_df: bool = False
    ) -> Union[Dict, pd.DataFrame, None]:
        """
        Retorna um asset pelo ID.

        Exemplo:
            repo.find_by_id(100)
        """

        query = """
            SELECT *
            FROM tbAsset
            WHERE asset_id = %s
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(asset_id,))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (asset_id,))
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                error_function="AssetRepository.find_by_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT com WHERE livre
    # ==========================================================
    def find_by_custom_where(
        self,
        where_clause: str,
        params: Optional[tuple] = None,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Permite WHERE livre (AND, OR, LIKE).

        IMPORTANTE:
        Sempre usar parâmetros para evitar SQL Injection.

        Exemplo:
            repo.find_by_custom_where(
                "asset_serial_number LIKE %s AND asset_product_id = %s",
                params=("%ABC%", 100)
            )
        """

        if not where_clause:
            raise ValueError("WHERE clause é obrigatória.")

        query = f"""
            SELECT *
            FROM tbAsset
            WHERE {where_clause}
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="AssetRepository.find_by_custom_where",
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
    # INSERT com reaproveitamento de VAGO (versão concorrência segura)
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere novo asset com reaproveitamento de registro VAGO,
        de forma segura contra concorrência.

        Segurança:
        - Usa SELECT ... FOR UPDATE
        - Bloqueia o registro VAGO até commit
        - Evita que dois processos reutilizem o mesmo asset_id

        Regra:
        1) Procura o menor asset_id VAGO
        2) Se existir → UPDATE nesse registro
        3) Se não existir → INSERT novo
        """

        if not data:
            raise ValueError("Dados para INSERT não podem ser vazios.")

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            # ---------------------------------------------
            # Inicia transação explícita
            # ---------------------------------------------
            conn.start_transaction()

            # ---------------------------------------------
            # 1) Buscar VAGO com bloqueio
            # ---------------------------------------------
            query_vago = """
                SELECT asset_id
                FROM tbAsset
                WHERE asset_serial_number LIKE 'VAGO %'
                   OR asset_instance_number LIKE 'VAGO %'
                ORDER BY asset_id ASC
                LIMIT 1
                FOR UPDATE
            """

            cursor.execute(query_vago)
            result = cursor.fetchone()

            # ---------------------------------------------
            # 2) Se existir VAGO → UPDATE
            # ---------------------------------------------
            if result:

                vago_id = result[0]

                set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
                values = tuple(data.values())

                query_update = f"""
                    UPDATE tbAsset
                    SET {set_clause}
                    WHERE asset_id = %s
                """

                cursor.execute(query_update, values + (vago_id,))

                conn.commit()
                return int(vago_id)

            # ---------------------------------------------
            # 3) Caso não exista VAGO → INSERT
            # ---------------------------------------------
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = tuple(data.values())

            query_insert = f"""
                INSERT INTO tbAsset ({columns})
                VALUES ({placeholders})
            """

            cursor.execute(query_insert, values)

            new_id = cursor.lastrowid

            conn.commit()
            return int(new_id)

        except Exception as e:
            conn.rollback()

            self.error_repo.log_error(
                error_function="AssetRepository.insert (safe)",
                error_command="INSERT/UPDATE tbAsset com FOR UPDATE",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )

            raise

        finally:
            conn.close()

    # ==========================================================
    # UPDATE dinâmico
    # ==========================================================
    def update(
        self,
        data: Dict[str, Any],
        where: Dict[str, Any]
    ) -> int:
        """
        Atualiza assets com base em filtros.

        Proteção:
        WHERE é obrigatório para evitar UPDATE global.

        Exemplo:
            repo.update(
                data={"asset_price": 1200.00},
                where={"asset_id": 100}
            )

        Retorna:
            Número de linhas afetadas
        """

        if not data:
            raise ValueError("Dados de atualização não podem ser vazios.")

        if not where:
            raise ValueError("WHERE é obrigatório.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbAsset
            SET {set_clause}
            WHERE {where_clause}
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="AssetRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            conn.close()

    # ==========================================================
    # SELECT único asset_id com controle de ambiguidade
    # ==========================================================
    def find_id_by_custom_where(
        self,
        where_clause: str,
        params: Optional[tuple] = None,
        strict: bool = False,
        enforce_unique_logic: bool = False
    ) -> int:
        """
        Retorna o menor asset_id baseado em WHERE livre.

        Parâmetros:
            where_clause -> condição SQL (AND, OR, LIKE, etc.)
            params -> parâmetros da query
            strict -> se True, lança exceção se houver ambiguidade
            enforce_unique_logic -> se True, valida unicidade lógica via COUNT(*)

        Regras:
        - Nenhum registro → retorna 0
        - 1 registro → retorna asset_id
        - >1 registro:
            - strict=False → retorna menor asset_id
            - strict=True → lança ValueError

        Performance:
        - Usa ORDER BY asset_id ASC
        - Usa LIMIT 2 para detectar ambiguidade rapidamente
        """

        if not where_clause:
            raise ValueError("WHERE clause é obrigatória.")

        query = f"""
            SELECT asset_id
            FROM tbAsset
            WHERE {where_clause}
            ORDER BY asset_id ASC
            LIMIT 2
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            results = cursor.fetchall()

            # -----------------------------------------
            # Nenhum registro
            # -----------------------------------------
            if not results:
                return 0

            # -----------------------------------------
            # Ambiguidade detectada
            # -----------------------------------------
            if len(results) > 1:
                if strict:
                    raise ValueError(
                        "Ambiguidade detectada: múltiplos asset_id encontrados."
                    )
                # retorna automaticamente o menor
                return int(results[0][0])

            asset_id = int(results[0][0])

            # -----------------------------------------
            # Validação lógica opcional de unicidade
            # -----------------------------------------
            if enforce_unique_logic:
                count_query = f"""
                    SELECT COUNT(*)
                    FROM tbAsset
                    WHERE {where_clause}
                """
                cursor.execute(count_query, params or ())
                total = cursor.fetchone()[0]

                if total > 1:
                    if strict:
                        raise ValueError(
                            "Violação de unicidade lógica detectada."
                        )
                    # retorna menor mesmo assim
                    return asset_id

            return asset_id

        except Exception as e:
            self.error_repo.log_error(
                error_function="AssetRepository.find_id_by_custom_where",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )

            if strict:
                raise

            return 0

        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # SELECT coluna específica por asset_id
    # ==========================================================
    def find_field_by_id(
        self,
        field_name: str,
        asset_id: int
    ) -> Optional[Any]:
        """
        Retorna o valor de uma coluna específica da tbAsset
        com base no asset_id.

        Parâmetros:
        ----------
        field_name : nome da coluna a ser retornada
        asset_id   : ID do asset

        Retorno:
        --------
        Valor da coluna (qualquer tipo) ou None se não encontrado.

        Segurança:
        ----------
        O nome da coluna não pode ser passado como parâmetro SQL (%s).
        Portanto, é feita validação contra lista branca (whitelist)
        de colunas permitidas para evitar SQL Injection.

        Exemplo de uso:

            repo = AssetRepository()

            serial = repo.find_field_by_id(
                field_name="asset_serial_number",
                asset_id=100
            )

        Exemplo de SQL gerado:

            SELECT asset_serial_number
            FROM tbAsset
            WHERE asset_id = %s
        """

        # Lista branca de colunas permitidas
        allowed_fields = {
            "asset_id",
            "asset_product_id",
            "asset_ponumber",
            "asset_sonumber",
            "asset_type",
            "asset_subscription_id",
            "asset_serial_number",
            "asset_parent_serial_number",
            "asset_instance_number",
            "asset_parent_instance_number",
            "asset_parent_level",
            "asset_sales_order",
            "asset_web_order_id",
            "asset_deal_id",
            "asset_price",
            "asset_rfid",
            "asset_ov",
            "asset_warehouse",
        }

        if field_name not in allowed_fields:
            raise ValueError(f"Campo inválido: {field_name}")

        query = f"""
            SELECT {field_name}
            FROM tbAsset
            WHERE asset_id = %s
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, (asset_id,))
            result = cursor.fetchone()

            if not result:
                return None

            return result[0]

        except Exception as e:
            self.error_repo.log_error(
                "AssetRepository.find_field_by_id",
                query,
                str(e),
                traceback.format_exc()
            )
            return None

        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # SELECT clientes com assets
    # ==========================================================
    def filter_asset_clients(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna lista de clientes que possuem assets.

        Retorno:
            - Lista de dicionários (default)
            - DataFrame (se as_df=True)

        Estrutura retornada:
            client_id
            client_name
        """

        query = """
            SELECT 
                customer_id AS client_id,
                customer_name AS client_name
            FROM tbAssetContractSummaryByCustomer
        """

        try:
            # ---------------------------------------------
            # Retorno como DataFrame
            # ---------------------------------------------
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            # ---------------------------------------------
            # Retorno como lista de dicionários
            # ---------------------------------------------
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)

            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="AssetRepository.filter_asset_clients",
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
    # SELECT contratos de assets por cliente
    # ==========================================================
    def get_asset_contracts(
        self,
        client_id: Optional[int],
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna contratos de assets para um cliente específico.

        Parâmetros:
            client_id : ID do cliente
            as_df     : Se True retorna DataFrame, senão lista de dict

        Regras:
            - client_id inválido ou None → retorna vazio
        """

        # ------------------------------------------------------
        # Validação básica
        # ------------------------------------------------------
        if not client_id:
            return [] if not as_df else pd.DataFrame()

        try:
            client_id = int(client_id)
        except (TypeError, ValueError):
            return [] if not as_df else pd.DataFrame()

        query = """
            SELECT
                asset_id,
                asset_serial_number,
                asset_instance_number,
                asset_subscription_id,
                asset_parent_level,
                asset_parent_serial_number,
                asset_parent_instance_number,
                product_id,
                product_name,
                product_manufacturer_id,
                product_manufacturer_name,
                product_family,
                product_group,
                product_subtype,
                vendorasset_contract_num,
                vendorasset_customer_id,
                vendorasset_customer_name,
                nttasset_contract_number,
                nttasset_entitlement_id,
                nttasset_entitlement_contract,
                nttasset_customer_id,
                nttasset_customer_name,
                vendorasset_vendor_id,
                vendorasset_vendor_name,
                vendorasset_start,
                vendorasset_end,
                nttasset_contract_start,
                nttasset_contract_end,
                end_date_diff_days,
                start_date_diff_days,
                customer_mismatch_flag,
                status_consolidated,
                alert_reason,
                product_eos,
                product_ldos,
                eos_status,
                ldos_status
            FROM tbAssetContractEndMismatch
            WHERE (
                vendorasset_customer_id = %s
                OR nttasset_customer_id = %s
            )
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
                    params=(client_id, client_id)
                )

            # --------------------------------------------------
            # Retorno como lista de dicionários
            # --------------------------------------------------
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (client_id, client_id))

            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="AssetRepository.get_asset_contracts",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )

            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()
