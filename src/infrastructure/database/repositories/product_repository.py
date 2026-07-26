"""
ProductRepository

Responsável por operações CRUD da tabela tbProduct.

Objetivos:
- Centralizar acesso à tbProduct
- Permitir SELECT dinâmico via dicionário
- Permitir WHERE livre (AND, OR, LIKE)
- Permitir INSERT e UPDATE dinâmicos
- Retornar lista ou DataFrame
- Registrar TODOS os erros via ErrorRepository
"""

from typing import Any, Dict, List, Union, Optional
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class ProductRepository:
    """
    Repository da tabela tbProduct.

    Uso típico:

        repo = ProductRepository()

        # Buscar por vendor
        produtos = repo.find_by_vendor(10)

        # Inserir produto
        repo.insert({
            "product_vendor_id": 10,
            "product_name": "Router X"
        })
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # SELECT product_id baseado em dicionário
    # ==========================================================
    def find_ids_by(
        self,
        where: Dict[str, Any],
        as_df: bool = False
    ) -> Union[List[int], pd.DataFrame]:
        """
        Retorna lista de product_id com base em filtros dinâmicos.

        Parâmetros:
            where -> {"coluna": valor}
            as_df -> se True retorna DataFrame

        Exemplo:
            repo.find_ids_by({
                "product_vendor_id": 10,
                "product_name": "Router X"
            })

        SQL gerado:
            SELECT product_id FROM tbProduct
            WHERE product_vendor_id=%s AND product_name=%s
        """

        if not where:
            error_msg = "WHERE é obrigatório."
            self.error_repo.log_error(
                error_function="ProductRepository.find_ids_by",
                error_command="SELECT product_id FROM tbProduct WHERE ...",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT product_id
            FROM tbProduct
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
                error_function="ProductRepository.find_ids_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT * WHERE product_vendor_id=%s
    # ==========================================================
    def find_by_vendor(
        self,
        vendor_id: int,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Retorna todos os produtos de um vendor.

        Exemplo:
            repo.find_by_vendor(10)

        SQL:
            SELECT * FROM tbProduct
            WHERE product_vendor_id=%s
        """

        query = """
            SELECT *
            FROM tbProduct
            WHERE product_vendor_id = %s
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(vendor_id,))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (vendor_id,))
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="ProductRepository.find_by_vendor",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

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
        Permite WHERE livre (AND, OR, LIKE, etc).

        IMPORTANTE:
        Sempre usar parâmetros para evitar SQL Injection.

        Exemplo:
            repo.find_by_custom_where(
                "product_name LIKE %s AND product_vendor_id = %s",
                params=("%Router%", 10)
            )
        """

        if not where_clause:
            error_msg = "WHERE clause é obrigatória."
            self.error_repo.log_error(
                error_function="ProductRepository.find_by_custom_where",
                error_command="SELECT * FROM tbProduct WHERE ...",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        query = f"""
            SELECT *
            FROM tbProduct
            WHERE {where_clause}
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="ProductRepository.find_by_custom_where",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
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
        Atualiza registros com base em filtros.

        Proteção:
            WHERE é obrigatório para evitar UPDATE global.

        Exemplo:
            repo.update(
                data={"product_family": "Networking"},
                where={"product_id": 100}
            )

        Retorna:
            Número de linhas afetadas
        """

        if not data:
            error_msg = "Dados de atualização não podem ser vazios."
            self.error_repo.log_error(
                error_function="ProductRepository.update",
                error_command="UPDATE tbProduct SET ...",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        if not where:
            error_msg = "WHERE é obrigatório para evitar UPDATE global."
            self.error_repo.log_error(
                error_function="ProductRepository.update",
                error_command="UPDATE tbProduct SET ... WHERE ...",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbProduct
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
                error_function="ProductRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            conn.close()


    # ==========================================================
    # INSERT dinâmico com reaproveitamento de registro VAGO
    # =============================================

    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere novo produto com proteção contra duplicidade.

        Ordem da lógica:
        1) Verifica se já existe produto com:
           - product_vendor_id + product_name
           - OU product_vendor_id + product_part_number
        2) Se existir → retorna product_id existente
        3) Se não existir → tenta reaproveitar VAGO
        4) Se não houver VAGO → insere novo

        Retorna:
            product_id existente, reutilizado ou novo
        """

        if not data:
            error_msg = "Dados para INSERT não podem ser vazios."
            self.error_repo.log_error(
                error_function="ProductRepository.insert",
                error_command="INSERT/UPDATE tbProduct",
                error_description=error_msg,
                error_traceback=""
            )
            raise ValueError(error_msg)

        if "product_vendor_id" not in data:
            raise ValueError("product_vendor_id é obrigatório.")

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            vendor_id = data.get("product_vendor_id")
            product_name = data.get("product_name")
            product_part_number = data.get("product_part_number")

            # --------------------------------------------------
            # 1) VERIFICAR SE PRODUTO JÁ EXISTE
            # --------------------------------------------------
            conditions = []
            params = [vendor_id]

            if product_name:
                conditions.append("product_name = %s")
                params.append(product_name)

            if product_part_number:
                conditions.append("product_part_number = %s")
                params.append(product_part_number)

            existing_id = None

            if conditions:
                where_duplicates = " OR ".join(conditions)

                query_check = f"""
                    SELECT product_id
                    FROM tbProduct
                    WHERE product_vendor_id = %s
                      AND ({where_duplicates})
                    LIMIT 1
                """

                cursor.execute(query_check, tuple(params))
                result = cursor.fetchone()

                if result:
                    return result[0]  # Produto já existe ✅

            # --------------------------------------------------
            # 2) VERIFICAR SE EXISTE VAGO
            # --------------------------------------------------
            query_vago = """
                SELECT MIN(product_id)
                FROM tbProduct
                WHERE product_name LIKE 'VAGO %'
                   OR product_part_number LIKE 'VAGO %'
            """

            cursor.execute(query_vago)
            result = cursor.fetchone()
            vago_id = result[0] if result and result[0] else None

            # --------------------------------------------------
            # 3) SE EXISTIR VAGO → UPDATE
            # --------------------------------------------------
            if vago_id:
                set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
                values = tuple(data.values())

                query_update = f"""
                    UPDATE tbProduct
                    SET {set_clause}
                    WHERE product_id = %s
                """

                cursor.execute(query_update, values + (vago_id,))
                conn.commit()

                return vago_id

            # --------------------------------------------------
            # 4) CASO NÃO EXISTA VAGO → INSERT NORMAL
            # --------------------------------------------------
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = tuple(data.values())

            query_insert = f"""
                INSERT INTO tbProduct ({columns})
                VALUES ({placeholders})
            """

            cursor.execute(query_insert, values)
            conn.commit()

            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="ProductRepository.insert",
                error_command="INSERT/UPDATE tbProduct com verificação duplicidade + VAGO",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            conn.close()

    # ==========================================================
    # SELECT colunas específicas por product_id
    # ==========================================================
    def find_columns_by_id(
        self,
        columns: Union[str, List[str]],
        product_id: int,
        as_df: bool = False
    ) -> Union[Any, Dict[str, Any], pd.DataFrame, None]:
        """
        Retorna coluna(s) específicas da tbProduct baseado em product_id.

        Parâmetros:
            columns -> string ou lista de colunas
            product_id -> ID do produto
            as_df -> se True retorna DataFrame

        Exemplos:

            # Uma única coluna
            repo.find_columns_by_id("product_name", 100)

            # Múltiplas colunas
            repo.find_columns_by_id(
                ["product_name", "product_family"],
                100
            )

        Retorno:
            - Se 1 coluna → retorna valor direto
            - Se múltiplas colunas → retorna dict
            - Se as_df=True → retorna DataFrame
            - Se não encontrar → None
        """

        if not columns:
            raise ValueError("Colunas devem ser informadas.")

        # -----------------------------------------
        # Normalizar colunas
        # -----------------------------------------
        if isinstance(columns, str):
            column_list = [columns]
            single_column = True
        else:
            column_list = columns
            single_column = False

        # -----------------------------------------
        # Validação básica contra SQL Injection
        # (somente letras, números e underscore)
        # -----------------------------------------
        for col in column_list:
            if not col.replace("_", "").isalnum():
                raise ValueError(f"Nome de coluna inválido: {col}")

        column_sql = ", ".join(column_list)

        query = f"""
            SELECT {column_sql}
            FROM tbProduct
            WHERE product_id = %s
            LIMIT 1
        """

        try:
            # -----------------------------------------
            # Retorno como DataFrame
            # -----------------------------------------
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=(product_id,))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (product_id,))
            result = cursor.fetchone()

            if not result:
                return None

            # -----------------------------------------
            # Se for uma única coluna → retorna valor
            # -----------------------------------------
            if single_column:
                return result[column_list[0]]

            # -----------------------------------------
            # Múltiplas colunas → retorna dict
            # -----------------------------------------
            return result

        except Exception as e:
            self.error_repo.log_error(
                error_function="ProductRepository.find_columns_by_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()
