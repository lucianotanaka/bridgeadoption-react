from typing import Any, Dict, Optional
from src.infrastructure.database.connection import get_db_connection


class CompanyNameSuggestionRepository:
    """
    Repository responsável pela tabela tbCompanyNameSuggestion.
    """

    # ==========================================================
    # INSERT com verificação de duplicidade
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> Optional[int]:
        """
        Insere registro baseado em dicionário.

        Regra:
            - Se já existir sugestão com mesmo suggestion_input_name
              (case-insensitive), não insere novo registro.
            - Retorna o suggestion_id existente.
            - Caso não exista, insere e retorna o novo suggestion_id.
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        input_name = (data.get("suggestion_input_name") or "").strip()

        if not input_name:
            raise ValueError("suggestion_input_name é obrigatório.")

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco.")

        try:
            cursor = conn.cursor(dictionary=True)

            # --------------------------------------------------
            # 1️⃣ Verificar se já existe sugestão semelhante
            # Comparação case-insensitive e trim
            # --------------------------------------------------
            check_query = """
                SELECT suggestion_id
                FROM tbCompanyNameSuggestion
                WHERE LOWER(TRIM(suggestion_input_name)) = LOWER(TRIM(%s))
                LIMIT 1
            """

            cursor.execute(check_query, (input_name,))
            existing = cursor.fetchone()

            if existing:
                # Já existe → não insere novamente
                return existing["suggestion_id"]

            # --------------------------------------------------
            # 2️⃣ Inserir novo registro
            # --------------------------------------------------
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = tuple(data.values())

            insert_query = f"""
                INSERT INTO tbCompanyNameSuggestion ({columns})
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

    # ==========================================================
    # UPDATE suggestion_action pelo suggestion_id
    # ==========================================================
    def update_action(self, suggestion_id: int, suggestion_action: str) -> int:
        """
        Atualiza suggestion_action pelo suggestion_id.
        Retorna número de linhas afetadas.
        """

        query = """
            UPDATE tbCompanyNameSuggestion
            SET suggestion_action = %s
            WHERE suggestion_id = %s
        """

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco.")

        try:
            cursor = conn.cursor()
            cursor.execute(query, (suggestion_action, suggestion_id))
            conn.commit()
            return cursor.rowcount
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()
