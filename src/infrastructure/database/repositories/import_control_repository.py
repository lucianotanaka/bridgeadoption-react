"""
    Exemplo de como usar no import_company_name_from_xls.py
    repo = ImportControlRepository()

    import_id = repo.get_id_by_file("companies.xlsx")

    if not import_id:
        raise RuntimeError("Registro de controle não encontrado.")

    try:
        repo.start_import(import_id, message="Iniciando processamento do arquivo.")

        # processamento aqui...

        repo.finish_import(import_id, message="Importação concluída com sucesso.")

    except Exception as e:
        repo.fail_import(import_id, message=str(e))
        raise
"""

from enum import Enum
from typing import Optional

from src.infrastructure.database.connection import get_db_connection


# ======================================================
# ENUM DE STATUS
# ======================================================

class ImportStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"


# ======================================================
# REPOSITORY
# ======================================================

class ImportControlRepository:
    """
    Repository responsável pela tabela tbImportControl.
    """

    # --------------------------------------------------
    # SELECT ID PELO ARQUIVO
    # --------------------------------------------------
    def get_id_by_file(self, importctrl_file: str) -> Optional[int]:

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco.")

        try:
            cursor = conn.cursor(dictionary=True)

            query = """
                SELECT importctrl_id
                FROM tbImportControl
                WHERE importctrl_file = %s
                LIMIT 1
            """

            cursor.execute(query, (importctrl_file,))
            result = cursor.fetchone()

            return result["importctrl_id"] if result else None

        finally:
            cursor.close()
            conn.close()

    # --------------------------------------------------
    # UPDATE STATUS GENÉRICO
    # --------------------------------------------------
    def update_status(
        self,
        importctrl_id: int,
        status: ImportStatus,
        message: Optional[str] = None,
    ) -> None:

        if not isinstance(status, ImportStatus):
            raise ValueError("Status inválido para importação.")

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco.")

        try:
            cursor = conn.cursor()

            # Se for FINISHED ou FAILED, atualizar importctrl_ended
            if status in (ImportStatus.FINISHED, ImportStatus.FAILED):

                query = """
                    UPDATE tbImportControl
                    SET importctrl_status = %s,
                        importctrl_message = %s,
                        importctrl_ended = NOW()
                    WHERE importctrl_id = %s
                """

                cursor.execute(query, (status.value, message, importctrl_id))

            else:
                query = """
                    UPDATE tbImportControl
                    SET importctrl_status = %s,
                        importctrl_message = %s
                    WHERE importctrl_id = %s
                """

                cursor.execute(query, (status.value, message, importctrl_id))

            conn.commit()

        except Exception:
            conn.rollback()
            raise

        finally:
            cursor.close()
            conn.close()

    # --------------------------------------------------
    # START IMPORT
    # --------------------------------------------------
    def start_import(self, importctrl_id: int, message: Optional[str] = None) -> None:
        """
        Marca importação como RUNNING.
        """

        self.update_status(
            importctrl_id=importctrl_id,
            status=ImportStatus.RUNNING,
            message=message,
        )

    # --------------------------------------------------
    # FINISH IMPORT (SUCESSO)
    # --------------------------------------------------
    def finish_import(
        self,
        importctrl_id: int,
        message: Optional[str] = None,
    ) -> None:
        """
        Marca importação como FINISHED e define importctrl_ended automaticamente.
        """

        self.update_status(
            importctrl_id=importctrl_id,
            status=ImportStatus.FINISHED,
            message=message,
        )

    # --------------------------------------------------
    # FAIL IMPORT
    # --------------------------------------------------
    def fail_import(
        self,
        importctrl_id: int,
        message: Optional[str] = None,
    ) -> None:
        """
        Marca importação como FAILED e define importctrl_ended automaticamente.
        """

        self.update_status(
            importctrl_id=importctrl_id,
            status=ImportStatus.FAILED,
            message=message,
        )

