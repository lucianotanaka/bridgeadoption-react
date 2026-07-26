"""
ErrorRepository

Responsável por registrar erros na tabela tbError.

Objetivo:
Centralizar o registro de exceções do sistema,
evitando duplicidade de erros idênticos.

Regra de controle de duplicidade:
Antes de inserir um novo erro, o sistema verifica se já existe
um erro semelhante na tabela tbError.

Critério de erro semelhante:
    - error_function igual
    - error_command igual (comparação NULL-safe)
    - error_description igual

Se já existir:
    - Não insere novo registro
    - Retorna o error_id já existente

Se não existir:
    - Insere novo registro
    - Retorna o novo error_id

Observação:
O campo error_traceback não é considerado para comparação,
pois pode variar mesmo quando o erro lógico é o mesmo.

Exemplo de uso:

    import traceback
    from src.infrastructure.database.repositories.error_repository import ErrorRepository

    repo_error = ErrorRepository()

    try:
        resultado = repo_vendor.find_all()

    except Exception as e:
        repo_error.log_error(
            error_function="VendorRepository.find_all",
            error_command="SELECT vendor_id FROM tbVendor",
            error_description=str(e),
            error_traceback=traceback.format_exc()
        )
"""

from typing import Optional
from src.infrastructure.database.connection import get_db_connection


class ErrorRepository:
    """
    Repository responsável por registrar erros na tbError,
    aplicando controle de duplicidade.
    """

    def log_error(
        self,
        error_function: str,
        error_command: Optional[str],
        error_description: str,
        error_traceback: Optional[str] = None
    ) -> int:
        """
        Registra erro na tbError apenas se ainda não existir erro semelhante.

        Parâmetros:
            error_function (str):
                Nome da função onde ocorreu o erro.
                Exemplo: "VendorRepository.find_all"

            error_command (str | None):
                Query SQL ou comando executado.

            error_description (str):
                Mensagem principal do erro (str(e)).

            error_traceback (str | None):
                Stack trace completo (opcional).

        Retorno:
            int:
                - error_id existente (se erro semelhante já estiver registrado)
                - error_id recém-criado (se for novo erro)

        Comportamento transacional:
            - Em caso de falha no INSERT, realiza rollback.
            - Se falhar durante verificação, propaga exceção.
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            # --------------------------------------------------
            # 1) Verificação de erro semelhante
            # --------------------------------------------------
            # Utilizamos o operador "<=>" do MySQL para comparação
            # NULL-safe. Isso permite comparar corretamente
            # valores NULL no campo error_command.
            #
            # Exemplo:
            #   NULL <=> NULL  -> TRUE
            #   NULL = NULL    -> NULL (não funciona para comparação direta)
            # --------------------------------------------------

            query_check = """
                SELECT error_id
                FROM tbError
                WHERE error_function = %s
                  AND (error_command <=> %s)
                  AND error_description = %s
                LIMIT 1
            """

            cursor.execute(
                query_check,
                (
                    error_function,
                    error_command,
                    error_description
                )
            )

            existing = cursor.fetchone()

            # Se já existir erro semelhante, retorna o ID existente
            if existing:
                return existing[0]

            # --------------------------------------------------
            # 2) Inserção de novo erro
            # --------------------------------------------------

            query_insert = """
                INSERT INTO tbError (
                    error_function,
                    error_command,
                    error_description,
                    error_traceback
                )
                VALUES (%s, %s, %s, %s)
            """

            cursor.execute(
                query_insert,
                (
                    error_function,
                    error_command,
                    error_description,
                    error_traceback
                )
            )

            conn.commit()

            return cursor.lastrowid

        except Exception:
            # Em caso de falha no processo de INSERT,
            # garantimos rollback para manter integridade.
            conn.rollback()
            raise

        finally:
            cursor.close()
            conn.close()
