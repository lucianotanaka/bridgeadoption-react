"""
NotaFiscalAssetRepository

Responsável por operações relacionadas à tabela:

    - tbNotaFiscalAsset

DDL de referência:
    CREATE TABLE `tbNotaFiscalAsset` (
      `nfasset_id`            int(11)        NOT NULL AUTO_INCREMENT,
      `nfasset_notafiscal_id` int(11)        DEFAULT NULL,
      `nfasset_asset_id`      int(11)        DEFAULT 0,
      `nfasset_price`         decimal(18,4)  DEFAULT NULL,
      `nfasset_ov`            varchar(10)    DEFAULT NULL,
      PRIMARY KEY (`nfasset_id`),
      UNIQUE KEY `tbnfasset_nfasset_notafiscal_id_IDX`
          (`nfasset_notafiscal_id`, `nfasset_asset_id`) USING BTREE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

Objetivos:
    1) Centralizar todo acesso a tbNotaFiscalAsset.
    2) Permitir SELECT por nfasset_id, por notafiscal_id e por asset_id.
    3) Reaproveitar registros VAGO antes de inserir novos.
    4) Registrar erros estruturados via ErrorRepository.

Retornos padrão:
    - SELECT  → Dict | List[Dict] | pd.DataFrame | None
    - INSERT  → int  (nfasset_id inserido/reutilizado, 0 em caso de erro)
    - UPDATE  → int  (1 = sucesso, -1 = não encontrado, 0 = erro)
"""

from typing import Any, Dict, List, Optional, Union
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class NotaFiscalAssetRepository:

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ----------------------------------------------------------
    # HELPER
    # ----------------------------------------------------------

    def _log(self, query: str, params: Optional[tuple]) -> str:
        return f"{query.strip()} | params={params}"

    # ==========================================================
    # SELECT por nfasset_id
    # ==========================================================
    def find_by_id(
        self,
        nfasset_id: int,
        as_df: bool = False
    ) -> Union[Optional[Dict], pd.DataFrame]:
        """
        Retorna o registro completo pelo nfasset_id.

        Retorna:
            dict  se as_df=False (None se não encontrado)
            DataFrame se as_df=True
        """
        query = """
            SELECT *
            FROM tbNotaFiscalAsset
            WHERE nfasset_id = %s
        """
        params = (nfasset_id,)

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                "NotaFiscalAssetRepository.find_by_id",
                self._log(query, params),
                str(e),
                traceback.format_exc(),
            )
            return None if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT por notafiscal_id
    # ==========================================================
    def find_by_notafiscal_id(
        self,
        nfasset_notafiscal_id: int,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Retorna todos os assets vinculados a uma nota fiscal.
        """
        query = """
            SELECT *
            FROM tbNotaFiscalAsset
            WHERE nfasset_notafiscal_id = %s
            ORDER BY nfasset_id
        """
        params = (nfasset_notafiscal_id,)

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                "NotaFiscalAssetRepository.find_by_notafiscal_id",
                self._log(query, params),
                str(e),
                traceback.format_exc(),
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT por asset_id
    # ==========================================================
    def find_by_asset_id(
        self,
        nfasset_asset_id: int,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Retorna todos os registros vinculados a um asset.
        """
        query = """
            SELECT *
            FROM tbNotaFiscalAsset
            WHERE nfasset_asset_id = %s
            ORDER BY nfasset_id
        """
        params = (nfasset_asset_id,)

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                "NotaFiscalAssetRepository.find_by_asset_id",
                self._log(query, params),
                str(e),
                traceback.format_exc(),
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT com WHERE customizado
    # ==========================================================
    def find_by_custom_where(
        self,
        where_clause: str,
        params: Optional[tuple] = None,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Permite WHERE totalmente customizado.

        Exemplo:
            repo.find_by_custom_where(
                "nfasset_ov = %s AND nfasset_price > %s",
                params=("OV123", 0)
            )
        """
        if not where_clause:
            raise ValueError("WHERE clause é obrigatória.")

        query = f"""
            SELECT *
            FROM tbNotaFiscalAsset
            WHERE {where_clause}
            ORDER BY nfasset_id
        """

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                "NotaFiscalAssetRepository.find_by_custom_where",
                self._log(query, params),
                str(e),
                traceback.format_exc(),
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # INSERT com reaproveitamento de VAGO
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere registro em tbNotaFiscalAsset.

        Regras:
            1) Verifica se já existe combinação (notafiscal_id, asset_id).
               Se existir → retorna o nfasset_id existente sem inserir.
            2) Busca registro VAGO (nfasset_asset_id = 0 e nfasset_notafiscal_id IS NULL).
               Se existir → faz UPDATE nesse registro.
            3) Caso contrário → faz INSERT normal.

        Retorna:
            nfasset_id em caso de sucesso
            0          em caso de erro
        """
        if not data:
            raise ValueError("Dados são obrigatórios.")

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)

            # 1) Verifica duplicidade pela UNIQUE KEY
            notafiscal_id = data.get("nfasset_notafiscal_id")
            asset_id = data.get("nfasset_asset_id", 0)

            if notafiscal_id is not None:
                cursor.execute(
                    """
                    SELECT nfasset_id
                    FROM tbNotaFiscalAsset
                    WHERE nfasset_notafiscal_id = %s
                      AND nfasset_asset_id = %s
                    LIMIT 1
                    """,
                    (notafiscal_id, asset_id),
                )
                existing = cursor.fetchone()
                if existing:
                    return int(existing["nfasset_id"])

            # 2) Busca VAGO
            cursor.execute(
                """
                SELECT MIN(nfasset_id) AS nfasset_id
                FROM tbNotaFiscalAsset
                WHERE nfasset_asset_id = 0
                  AND nfasset_notafiscal_id IS NULL
                """
            )
            result = cursor.fetchone()
            vago_id = result["nfasset_id"] if result and result["nfasset_id"] else None

            if vago_id:
                set_clause = ", ".join([f"{col} = %s" for col in data])
                values = tuple(data.values()) + (vago_id,)
                cursor.execute(
                    f"UPDATE tbNotaFiscalAsset SET {set_clause} WHERE nfasset_id = %s",
                    values,
                )
                conn.commit()
                return int(vago_id)

            # 3) INSERT
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            cursor.execute(
                f"INSERT INTO tbNotaFiscalAsset ({columns}) VALUES ({placeholders})",
                tuple(data.values()),
            )
            conn.commit()
            return int(cursor.lastrowid)

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "NotaFiscalAssetRepository.insert",
                f"INSERT/UPDATE tbNotaFiscalAsset | data={data}",
                str(e),
                traceback.format_exc(),
            )
            return 0

        finally:
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
        Atualiza registros em tbNotaFiscalAsset.

        Parâmetros:
            data  → colunas a alterar
            where → condição WHERE obrigatória

        Retorna:
             1  → sucesso
            -1  → nenhum registro encontrado
             0  → erro
        """
        if not data or not where:
            raise ValueError("data e where são obrigatórios.")

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            # Verifica existência
            where_clause = " AND ".join([f"{col} = %s" for col in where])
            where_values = tuple(where.values())

            cursor.execute(
                f"SELECT 1 FROM tbNotaFiscalAsset WHERE {where_clause} LIMIT 1",
                where_values,
            )
            if not cursor.fetchone():
                return -1

            set_clause = ", ".join([f"{col} = %s" for col in data])
            values = tuple(data.values()) + where_values

            cursor.execute(
                f"UPDATE tbNotaFiscalAsset SET {set_clause} WHERE {where_clause}",
                values,
            )
            conn.commit()
            return 1

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "NotaFiscalAssetRepository.update",
                f"UPDATE tbNotaFiscalAsset | data={data} | where={where}",
                str(e),
                traceback.format_exc(),
            )
            return 0

        finally:
            cursor.close()
            conn.close()
