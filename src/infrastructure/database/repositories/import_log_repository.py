"""
ImportLogRepository

Responsável por registrar e atualizar eventos na tabela tbImportLog.

Objetivo
--------
Centralizar o controle de erros, inconsistências e ocorrências
durante processos de importação (XLS, integrações externas, ETL).

Esta tabela funciona como trilha de auditoria operacional
para rastrear problemas linha a linha em arquivos importados.

Casos típicos de uso:
- Erro de validação em coluna obrigatória
- Valor inválido em determinado campo
- Empresa não encontrada
- Falha de conversão de tipo
- Registro processado manualmente após revisão

Fluxo típico:

Processo de Importação
    ↓
Validação de linha
    ↓
Erro detectado
    ↓
ImportLogRepository.create(...)
    ↓
Registro gravado em tbImportLog
    ↓
Correção manual
    ↓
ImportLogRepository.mark_as_resolved(...)
"""

from typing import Optional
from datetime import datetime
from src.infrastructure.database.connection import get_db_connection


class ImportLogRepository:
    """
    Repository responsável por operações na tabela tbImportLog.

    A classe encapsula:

    - Criação de logs de importação
    - Marcação de logs como resolvidos
    - Controle transacional (commit/rollback)

    Não contém lógica de negócio.
    Apenas persiste e atualiza registros.
    """

    # ==========================================================
    # CREATE
    # ==========================================================
    def create(
        self,
        source: str,
        file: str,
        row: int,
        message: str,
        column: Optional[str] = None,
        value: Optional[str] = None,
    ) -> int:
        """
        Insere um novo registro na tbImportLog evitando duplicidade.

        Critério de duplicidade:
            Um log é considerado já existente quando possuir:
                - importlog_source igual
                - importlog_file igual
                - importlog_row igual
                - importlog_message igual
                - importlog_column igual (comparação NULL-safe)
                - importlog_value igual (comparação NULL-safe)
                - importlog_resolved = 0

        Se já existir:
            - Não insere novo registro
            - Retorna o importlog_id existente

        Se não existir:
            - Insere novo registro
            - Retorna o novo importlog_id

        Parâmetros:
        ----------
        source : origem do processo (ex: "IMPORT_COMPANY_XLS")
        file   : nome do arquivo processado
        row    : número da linha do arquivo
        message: descrição do problema
        column : coluna envolvida (opcional)
        value  : valor que causou o problema (opcional)

        Retorna:
        --------
        importlog_id existente ou recém-criado.

        Observação técnica:
        -------------------
        Utiliza operador NULL-safe (<=>) do MySQL para comparar
        campos que podem ser NULL (column e value).
        """

        with get_db_connection() as conn:
            try:
                with conn.cursor() as cursor:

                    # --------------------------------------------------
                    # 1) Verificar se já existe log idêntico (não resolvido)
                    # --------------------------------------------------
                    # O operador <=> é NULL-safe no MySQL:
                    # NULL <=> NULL retorna TRUE.
                    # Isso garante comparação correta de campos opcionais.
                    # --------------------------------------------------

                    query_check = """
                        SELECT importlog_id
                        FROM tbImportLog
                        WHERE importlog_source = %s
                          AND importlog_file = %s
                          AND importlog_row = %s
                          AND importlog_message = %s
                          AND (importlog_column <=> %s)
                          AND (importlog_value <=> %s)
                          AND importlog_resolved = 0
                        LIMIT 1
                    """

                    cursor.execute(
                        query_check,
                        (source, file, row, message, column, value),
                    )

                    existing = cursor.fetchone()

                    # Se já existir log idêntico → retorna ID existente
                    if existing:
                        return existing[0]

                    # --------------------------------------------------
                    # 2) Inserir novo registro
                    # --------------------------------------------------

                    query_insert = """
                        INSERT INTO tbImportLog (
                            importlog_source,
                            importlog_file,
                            importlog_row,
                            importlog_message,
                            importlog_column,
                            importlog_value                
                        )
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """

                    cursor.execute(
                        query_insert,
                        (source, file, row, message, column, value),
                    )

                    inserted_id = cursor.lastrowid

                conn.commit()

                # Garantia adicional de integridade
                if not inserted_id:
                    raise RuntimeError("Falha ao obter importlog_id inserido.")

                return inserted_id

            except Exception:
                conn.rollback()
                raise


    # ==========================================================
    # MARK AS RESOLVED
    # ==========================================================
    def mark_as_resolved(
        self,
        importlog_id: int,
        resolved_by: str,
        resolution_note: Optional[str] = None,
    ) -> None:
        """
        Marca um registro como resolvido.

        Atualiza os seguintes campos:
        - importlog_resolved = 1
        - importlog_resolved_at = data/hora atual
        - importlog_resolved_by = usuário responsável
        - importlog_resolution_note = observação opcional

        Parâmetros:
        ----------
        importlog_id   : ID do log
        resolved_by    : usuário que resolveu
        resolution_note: descrição opcional da resolução

        Exemplo:

            repo.mark_as_resolved(
                importlog_id=100,
                resolved_by="admin",
                resolution_note="Empresa cadastrada manualmente"
            )

        Lógica:
        -------
        - Atualiza o registro específico.
        - Usa datetime.now() para registrar momento da resolução.
        - Executa commit.
        - Em caso de erro, executa rollback.
        """

        query = """
            UPDATE tbImportLog
            SET
                importlog_resolved = 1,
                importlog_resolved_at = %s,
                importlog_resolved_by = %s,
                importlog_resolution_note = %s
            WHERE importlog_id = %s
        """

        with get_db_connection() as conn:
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        query,
                        (
                            datetime.now(),
                            resolved_by,
                            resolution_note,
                            importlog_id,
                        ),
                    )

                conn.commit()

            except Exception:
                conn.rollback()
                raise
