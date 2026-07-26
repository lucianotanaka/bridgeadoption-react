from typing import Any, Dict, Optional
from src.infrastructure.database.connection import get_db_connection


class CiscoSARepository:
    """
    Repository responsável pela tabela tbCiscoSmartAccountMetering.
    """

    # MAX(mcsa_end_date)
    def get_max_end_date(self) -> Optional[str]:
        query = """
            SELECT MAX(mcsa_end_date) AS max_date
            FROM tbCiscoSmartAccountMetering
            WHERE mcsa_end_date IS NOT NULL
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            result = cursor.fetchone()
            return result["max_date"] if result else None
        finally:
            cursor.close()
            conn.close()

    # MIN(mcsa_end_date)
    def get_min_end_date(self) -> Optional[str]:
        query = """
            SELECT MIN(mcsa_end_date) AS min_date
            FROM tbCiscoSmartAccountMetering
            WHERE mcsa_end_date IS NOT NULL
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            result = cursor.fetchone()
            return result["min_date"] if result else None
        finally:
            cursor.close()
            conn.close()

    # INSERT dinâmico
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere registro baseado em dicionário.
        Colunas não informadas assumem DEFAULT do banco.
        Retorna o ID inserido.
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco de dados.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbCiscoSmartAccountMetering ({columns})
            VALUES ({placeholders})
        """

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # UPDATE dinâmico
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros com base em:
        - data  -> colunas a alterar
        - where -> condição WHERE obrigatória

        Retorna número de linhas afetadas.
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório para evitar UPDATE global.")

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco de dados.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])

        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbCiscoSmartAccountMetering
            SET {set_clause}
            WHERE {where_clause}
        """

        try:
            cursor = conn.cursor()
            affected_rows = cursor.execute(query, values)
            conn.commit()
            return affected_rows
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()
