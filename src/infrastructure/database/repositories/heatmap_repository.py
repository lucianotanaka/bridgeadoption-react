"""
    Exemplos de uso
    1) Buscar todos
        repo = HeatmapRepository()
        heatmaps = repo.find_all()
    2) Buscar IDs com filtro
        ids = repo.find_ids_by({
        "heatmap_customer_id": 10,
        "heatmap_sales_status": "Sold by NTT"
        })
    3) Inserir
        repo.insert({
            "heatmap_customer_id": 10,
            "heatmap_vendor_id": 5,
            "heatmap_sales_status": "In Proposal",
            "heatmap_technology_domain": "Cloud",
            "heatmap_competitor_present": "AWS"
        })
    4) Atualizar
        repo.update(
            data={"heatmap_sales_status": "Sold by NTT"},
            where={"heatmap_id": 15}
        )
"""
from typing import Any, Dict, List, Union
import logging
import pandas as pd
import traceback

from src.infrastructure.database.connection import get_db_connection, get_sqlalchemy_engine
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class HeatmapRepository:
    """
    Repository responsável pela tbHeatmap e vwHeatmap.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ---------------------------------------------------------
    # SELECT * FROM vwHeatmap
    # ---------------------------------------------------------
    def find_all(self, as_df: bool = False):
        query = "SELECT * FROM vwHeatmap"

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="HeatmapRepository.find_all",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                try:
                    cursor.close()
                    conn.close()
                except Exception:
                    pass

    # ---------------------------------------------------------
    # SELECT heatmap_id FROM vwHeatmap WHERE (dinâmico)
    # ---------------------------------------------------------
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        if not where:
            raise ValueError("WHERE é obrigatório.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT heatmap_id
            FROM vwHeatmap
            WHERE {where_clause}
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            results = cursor.fetchall() or []
            return [row["heatmap_id"] for row in results]

        except Exception as e:
            self.error_repo.log_error(
                error_function="HeatmapRepository.find_ids_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return []

        finally:
            try:
                cursor.close()
                conn.close()
            except Exception:
                pass

    # ---------------------------------------------------------
    # INSERT dinâmico em tbHeatmap
    # ---------------------------------------------------------
    def insert(self, data: Dict[str, Any]) -> int:
        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        # ---------------------------------------------------------
        # Converter tipos numpy para tipos nativos do Python
        # ---------------------------------------------------------
        def normalize_value(value):
            # Converte numpy types (int64, float64, etc.)
            if hasattr(value, "item"):
                return value.item()
            return value

        normalized_data = {
            key: normalize_value(value)
            for key, value in data.items()
        }

        columns = ", ".join(normalized_data.keys())
        placeholders = ", ".join(["%s"] * len(normalized_data))
        values = tuple(normalized_data.values())

        query = f"""
            INSERT INTO tbHeatmap ({columns})
            VALUES ({placeholders})
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="HeatmapRepository.insert",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            try:
                cursor.close()
                conn.close()
            except Exception:
                pass

    # ---------------------------------------------------------
    # UPDATE dinâmico em tbHeatmap
    # ---------------------------------------------------------
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório para evitar UPDATE global.")

        # ---------------------------------------------------------
        # Converter tipos numpy para tipos nativos do Python
        # ---------------------------------------------------------
        def normalize_value(value):
            # Converte numpy types (int64, float64, etc.)
            if hasattr(value, "item"):
                return value.item()
            return value

        normalized_data = {
            key: normalize_value(value)
            for key, value in data.items()
        }

        normalized_where = {
            key: normalize_value(value)
            for key, value in where.items()
        }

        set_clause = ", ".join([f"{col} = %s" for col in normalized_data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in normalized_where.keys()])

        values = tuple(normalized_data.values()) + tuple(normalized_where.values())

        query = f"""
            UPDATE tbHeatmap
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
                error_function="HeatmapRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            try:
                cursor.close()
                conn.close()
            except Exception:
                pass

    # ---------------------------------------------------------
    # PROCURAR um registro
    # ---------------------------------------------------------

    def find_by(
        self,
        where: Dict[str, Any],
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        SELECT * FROM tbHeatmap com WHERE dinâmico.

        Exemplo:
            repo.find_by({"heatmap_customer_id": 10})
            repo.find_by({"heatmap_customer_id": 10, "heatmap_vendor_id": 3})

            repo.find_by(
                {"heatmap_customer_id": 5, "heatmap_sales_status": "In Proposal"},
                as_df=True
            )
        """

        if not where:
            raise ValueError("WHERE é obrigatório para evitar SELECT global.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT *
            FROM tbHeatmap
            WHERE {where_clause}
        """

        try:
            if as_df:
                from src.infrastructure.database.connection import get_sqlalchemy_engine
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=values)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="HeatmapRepository.find_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                try:
                    cursor.close()
                    conn.close()
                except Exception:
                    pass


    # ---------------------------------------------------------
    # LISTAR CLIENTES DISPONÍVEIS
    # ---------------------------------------------------------
    def list_available_clients_for_heatmap(
        self,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:

        query = """
            SELECT
                c.group_id AS client_id,
                c.group_name AS client_name
            FROM tbCompanyEconomicGroup c
            WHERE NOT EXISTS (
                SELECT 1
                FROM tbHeatmap h
                WHERE h.heatmap_customer_id = c.group_id
            )
            ORDER BY c.group_name
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="HeatmapRepository.list_available_clients_for_heatmap",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                try:
                    cursor.close()
                    conn.close()
                except Exception:
                    pass

    # ---------------------------------------------------------
    # LISTAR TECHNOLOGY DOMAINS
    # ---------------------------------------------------------
    def list_technology_domains(
        self,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:

        query = """
            SELECT
                heatmap_technology_domain AS technology_domain
            FROM tbHeatmap
            WHERE heatmap_technology_domain IS NOT NULL
            GROUP BY heatmap_technology_domain
            ORDER BY heatmap_technology_domain
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="HeatmapRepository.list_technology_domains",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                try:
                    cursor.close()
                    conn.close()
                except Exception:
                    pass

    # ---------------------------------------------------------
    # INSERIR HISTÓRICO (LOG)
    # ---------------------------------------------------------

    def insert_log(self, data: Dict[str, Any]) -> int:
        """
        Insere um registro na tbHeatmapHistory.

        Campos obrigatórios:
        - history_customer_id
        - history_technology_domain
        - history_created_by
        - history_remark
        """

        required_fields = [
            "history_customer_id",
            "history_technology_domain",
            "history_created_by",
            "history_remark",
        ]

        # ---------------------------------------------------------
        # Validação de campos obrigatórios
        # ---------------------------------------------------------
        for field in required_fields:
            if field not in data or data[field] in (None, ""):
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # ---------------------------------------------------------
        # Converter tipos numpy para tipos nativos Python
        # ---------------------------------------------------------
        def normalize_value(value):
            if hasattr(value, "item"):
                return value.item()
            return value

        normalized_data = {
            key: normalize_value(value)
            for key, value in data.items()
        }

        columns = ", ".join(normalized_data.keys())
        placeholders = ", ".join(["%s"] * len(normalized_data))
        values = tuple(normalized_data.values())

        query = f"""
            INSERT INTO tbHeatmapHistory ({columns})
            VALUES ({placeholders})
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="HeatmapRepository.insert_log",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            try:
                cursor.close()
                conn.close()
            except Exception:
                pass


    # ---------------------------------------------------------
    # LISTAR HISTÓRICO (LOG)
    # ---------------------------------------------------------

    def get_history_all(
        self,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        SELECT * FROM tbHeatmapHistory
        ORDER BY history_created_at DESC
        """

        query = """
            SELECT
                h.history_id,
                h.history_customer_id,
                c.group_name AS history_customer_name,
                h.history_technology_domain,
                h.history_created_by,
                h.history_created_at,
                h.history_remark
            FROM tbHeatmapHistory h
            JOIN tbCompanyEconomicGroup c ON
                c.group_id = h.history_customer_id
            ORDER BY h.history_created_at DESC
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="HeatmapRepository.find_history_by_customer",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                try:
                    cursor.close()
                    conn.close()
                except Exception:
                    pass


    def find_history_by_customer(
        self,
        history_customer_id: Union[int, List[int]],
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        SELECT histórico por:
        - Um único history_customer_id (int)
        - Lista de history_customer_id (List[int])

        ORDER BY history_created_at DESC
        """

        if history_customer_id is None:
            raise ValueError("history_customer_id é obrigatório.")

        # ---------------------------------------------------------
        # Definir condição WHERE dinamicamente
        # ---------------------------------------------------------
        if isinstance(history_customer_id, (list, tuple, set)):
            ids = list(history_customer_id)

            if not ids:
                return pd.DataFrame() if as_df else []

            placeholders = ", ".join(["%s"] * len(ids))
            where_clause = f"h.history_customer_id IN ({placeholders})"
            params = tuple(ids)

        else:
            where_clause = "h.history_customer_id = %s"
            params = (history_customer_id,)

        query = f"""
            SELECT
                h.history_id,
                h.history_customer_id,
                c.group_name AS history_customer_name,
                h.history_technology_domain,
                h.history_created_by,
                h.history_created_at,
                h.history_remark
            FROM tbHeatmapHistory h
            JOIN tbCompanyEconomicGroup c
                ON c.group_id = h.history_customer_id
            WHERE {where_clause}
            ORDER BY h.history_created_at DESC
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="HeatmapRepository.find_history_by_customer",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                try:
                    cursor.close()
                    conn.close()
                except Exception:
                    pass
