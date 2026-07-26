from typing import Optional, Dict, Any
import traceback

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class SubscriptionIgnoredRepository:
    """
    Repository responsável pela tabela tbSubscriptionIgnored.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # SELECT ID POR CUSTOMER + NUMBER
    # ==========================================================
    def get_id(
        self,
        subscriptionignored_customer_id: int,
        subscriptionignored_number: str
    ) -> Optional[int]:
        """
        Retorna subscriptionignored_id baseado
        em customer_id + subscription_number.
        """

        query = """
            SELECT subscriptionignored_id
            FROM tbSubscriptionIgnored
            WHERE subscriptionignored_customer_id = %s
              AND subscriptionignored_number = %s
            LIMIT 1
        """

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute(
                query,
                (int(subscriptionignored_customer_id), subscriptionignored_number)
            )

            result = cursor.fetchone()
            return result["subscriptionignored_id"] if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="SubscriptionIgnoredRepository.get_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # INSERT
    # ==========================================================
    def insert(
        self,
        subscriptionignored_customer_id: int,
        subscriptionignored_number: str,
        subscriptionignored_add_by: Optional[str] = None
    ) -> Optional[int]:
        """
        Insere novo registro na tbSubscriptionIgnored.

        Retorna:
            subscriptionignored_id inserido
        """

        query = """
            INSERT INTO tbSubscriptionIgnored (
                subscriptionignored_customer_id,
                subscriptionignored_number,
                subscriptionignored_add_by
            )
            VALUES (%s, %s, %s)
        """

        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                query,
                (
                    int(subscriptionignored_customer_id),
                    subscriptionignored_number,
                    subscriptionignored_add_by
                )
            )

            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="SubscriptionIgnoredRepository.insert",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # UPDATE DINÂMICO POR ID
    # ==========================================================
    def update(
        self,
        subscriptionignored_id: int,
        data: Dict[str, Any]
    ) -> bool:
        """
        Atualiza campos dinamicamente baseado no ID.

        Parâmetros:
            subscriptionignored_id : int
            data : Dict com colunas e valores a atualizar

        Retorna:
            True se atualizado com sucesso
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        # Validação simples de segurança das colunas
        safe_columns = []
        for col in data.keys():
            if not col.replace("_", "").isalnum():
                raise ValueError(f"Coluna inválida: {col}")
            safe_columns.append(col)

        set_clause = ", ".join([f"{col} = %s" for col in safe_columns])
        values = list(data.values())
        values.append(int(subscriptionignored_id))

        query = f"""
            UPDATE tbSubscriptionIgnored
            SET {set_clause}
            WHERE subscriptionignored_id = %s
        """

        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute(query, tuple(values))
            conn.commit()

            return cursor.rowcount > 0

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="SubscriptionIgnoredRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return False

        finally:
            if "conn" in locals():
                cursor.close()
                conn.close()
