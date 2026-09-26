"""
PersonListNameRepository

Responsável por operações relacionadas à tabela tbPersonListName.

Objetivos:
-----------
- Centralizar acesso a aliases/variações de nomes de pessoas
- Resolver person_id a partir do nome vindo de importadores
- Manter consistência com o padrão dos demais repositories

Padrão de retorno:
-------------------
- Métodos SELECT → retornam List[Dict] ou valores escalares
- Métodos INSERT/UPDATE → retornam int

Tratamento de erro:
--------------------
- Registra erro via ErrorRepository
- Evita quebrar o fluxo dos importadores com retorno seguro
"""

from typing import Optional, List, Dict, Any
import traceback

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class PersonListNameRepository:
    """
    Repository responsável pela tabela tbPersonListName.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    def get_person_id_by_name(self, personlistname_name: str) -> Optional[int]:
        """
        Resolve o person_id a partir do alias exato informado.

        Usa comparação binária para evitar ambiguidades por case/acento
        quando o alias do Excel precisa bater exatamente com a biblioteca
        de nomes mantida em tbPersonListName.
        """

        query = """
            SELECT personlistname_person_id
            FROM tbPersonListName
            WHERE personlistname_name COLLATE utf8_bin = %s
            LIMIT 1
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (personlistname_name,))
            row = cursor.fetchone()
            return row["personlistname_person_id"] if row else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="PersonListNameRepository.get_person_id_by_name",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()

    def list_aliases_by_person_id(self, person_id: int) -> List[Dict[str, Any]]:
        """
        Retorna aliases cadastrados para uma pessoa.
        """

        query = """
            SELECT *
            FROM tbPersonListName
            WHERE personlistname_person_id = %s
            ORDER BY personlistname_name
        """

        conn = get_db_connection()
        if not conn:
            return []

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (person_id,))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="PersonListNameRepository.list_aliases_by_person_id",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return []

        finally:
            if "cursor" in locals() and cursor is not None:
                cursor.close()
            conn.close()
