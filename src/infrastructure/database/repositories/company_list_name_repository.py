from typing import Any, Dict, Optional
from src.infrastructure.database.connection import get_db_connection


class CompanyListNameRepository:
    """
    Repository responsável pela tabela tbCompanyListName.
    """

    # SELECT companylistname_company_id pelo nome
    def get_company_id_by_name(self, companylistname_name: str) -> Optional[int]:
        query = """
            SELECT companylistname_company_id
            FROM tbCompanyListName
            WHERE companylistname_name COLLATE utf8_bin = %s
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (companylistname_name,))
            result = cursor.fetchone()
            return result["companylistname_company_id"] if result else None
        finally:
            cursor.close()
            conn.close()

    # UPDATE dinâmico
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registro.
        data  -> colunas a alterar
        where -> condição WHERE obrigatória

        Retorna número de linhas afetadas.
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório para evitar UPDATE global.")

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbCompanyListName
            SET {set_clause}
            WHERE {where_clause}
        """

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # INSERT com reaproveitamento de VAGO %
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere registro.
        Se existir companylistname_name LIKE 'VAGO %',
        reutiliza o menor companylistname_id disponível.
        Retorna o companylistname_id utilizado.
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco.")

        try:
            cursor = conn.cursor(dictionary=True)

            # 1 + 2) Buscar menor ID com nome VAGO
            cursor.execute("""
                SELECT MIN(companylistname_id) AS companylistname_id
                FROM tbCompanyListName
                WHERE companylistname_name LIKE 'VAGO %'
            """)
            result = cursor.fetchone()

            vago_id = result["companylistname_id"] if result and result["companylistname_id"] else None

            # 3) Se houver VAGO → UPDATE
            if vago_id:
                set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
                values = tuple(data.values()) + (vago_id,)

                update_query = f"""
                    UPDATE tbCompanyListName
                    SET {set_clause}
                    WHERE companylistname_id = %s
                """

                cursor.execute(update_query, values)
                conn.commit()
                return vago_id

            # 4) Se não houver VAGO → INSERT novo
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = tuple(data.values())

            insert_query = f"""
                INSERT INTO tbCompanyListName ({columns})
                VALUES ({placeholders})
            """

            cursor.execute(insert_query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()
