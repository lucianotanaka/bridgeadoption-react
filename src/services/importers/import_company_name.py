"""
===============================================================================
Import Company Name Service
===============================================================================

OBJETIVO
-----------
Este módulo é responsável por importar uma lista de nomes de empresas
a partir de um arquivo XLSX e realizar:

1) Validação estrutural do arquivo
2) Match exato contra tbCompanyListName
3) Remoção dos nomes já cadastrados
4) Matching inteligente (fuzzy matching)
5) Geração de sugestões automáticas
6) Atualização do arquivo mantendo apenas pendências

-------------------------------------------------------------------------------

FLUXO COMPLETO

XLS
   ↓
Validação extensão
   ↓
Leitura primeira coluna
   ↓
Match exato em tbCompanyListName
   ↓
Remove encontrados do arquivo
   ↓
Matching inteligente (token_set_ratio)
   ↓
Grava em tbCompanyNameSuggestion
   ↓
Salva XLS atualizado

-------------------------------------------------------------------------------

COMPORTAMENTO FINAL ESPERADO

Se o arquivo tiver 100 empresas:

Situação                    Resultado
-------------------------------------------------
60 já cadastradas           Removidas do XLS
25 com match forte          Sugestão gravada
15 sem match                Permanecem no XLS

O XLS final conterá apenas as 40 pendentes.

-------------------------------------------------------------------------------

EXEMPLO DE USO

from src.services.import_company_name import run_import

resultado = run_import(
    file_name="empresas.xlsx",
    user="import_batch_01"
)

print(resultado)

-------------------------------------------------------------------------------

ARQUIVO ESPERADO

- Formato: .xlsx
- Primeira coluna: nomes das empresas
- Cabeçalho obrigatório

===============================================================================
"""

import logging
from pathlib import Path
from typing import List, Set, Optional, Dict
from datetime import datetime

import pandas as pd

from src.infrastructure.database.connection import get_db_connection
from src.services.matching.company_name_matching import (
    generate_and_store_suggestions,
)

logger = logging.getLogger(__name__)

# Diretório padrão onde os arquivos XLS devem estar
BASE_INPUT_PATH = Path("/home/bridgeadoption/storage/input")


# =============================================================================
# MATCH EXATO
# =============================================================================

def load_existing_company_names(names: List[str]) -> Set[str]:
    """
    Verifica quais nomes já existem exatamente na tbCompanyListName.

    Estratégia:
    - Remove duplicados
    - Remove vazios
    - Executa SELECT ... IN (...)
    - Retorna conjunto com nomes encontrados

    Retorno:
        Set[str] → nomes já cadastrados

    Exemplo:

        encontrados = load_existing_company_names(
            ["Itau SA", "XP Investimentos"]
        )
    """

    # Limpeza inicial
    clean_names = sorted(set((n or "").strip() for n in names if (n or "").strip()))
    if not clean_names:
        return set()

    conn = get_db_connection()
    if not conn:
        raise ConnectionError("Erro ao conectar ao banco.")

    try:
        cur = conn.cursor()

        placeholders = ", ".join(["%s"] * len(clean_names))
        sql = f"""
            SELECT DISTINCT companylistname_name
            FROM tbCompanyListName
            WHERE companylistname_name IN ({placeholders})
        """

        cur.execute(sql, clean_names)
        rows = cur.fetchall() or []

        encontrados = {str(r[0]).strip() for r in rows if r[0]}

        logger.info("Match exato encontrado para %s empresas.", len(encontrados))

        return encontrados

    finally:
        cur.close()
        conn.close()


# =============================================================================
# FUNÇÃO PRINCIPAL
# =============================================================================

def run_import(file_name: str, user: Optional[str] = None) -> Dict[str, str]:
    """
    Executa o processo completo de importação de nomes.

    Parâmetros:
        file_name → nome do arquivo XLSX
        user → usuário responsável pela importação

    Retorno:
        Dict com status e mensagem final

    Status possíveis:
        FINISHED → Nenhuma pendência
        PENDING  → Ainda há nomes não resolvidos
    """

    logger.info("Iniciando import_company_name para arquivo: %s", file_name)

    start_time = datetime.now()

    path = BASE_INPUT_PATH / file_name

    # -------------------------------------------------------------------------
    # Validação de existência e extensão
    # -------------------------------------------------------------------------

    if not path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {path}")

    if path.suffix.lower() != ".xlsx":
        raise ValueError("Arquivo deve possuir extensão .xlsx")

    # -------------------------------------------------------------------------
    # Leitura do arquivo
    # -------------------------------------------------------------------------

    df = pd.read_excel(path, header=0)

    if df.shape[1] == 0:
        raise RuntimeError("Arquivo não possui colunas.")

    # Primeira coluna é considerada coluna de nomes
    first_col = df.columns[0]

    # -------------------------------------------------------------------------
    # Limpeza de dados
    # -------------------------------------------------------------------------

    df[first_col] = df[first_col].astype(str).str.strip()
    df = df[df[first_col].notna()]
    df = df[df[first_col] != ""]
    df = df[df[first_col].str.lower() != "nan"]

    nomes = df[first_col].tolist()

    if not nomes:
        return {
            "status": "FINISHED",
            "message": "Nenhum nome válido encontrado no arquivo.",
        }

    total = len(nomes)
    logger.info("Total de registros lidos: %s", total)

    # -------------------------------------------------------------------------
    # MATCH EXATO
    # -------------------------------------------------------------------------

    encontrados = load_existing_company_names(nomes)
    qtd_encontrados = len(encontrados)

    # Remove do dataframe os nomes já cadastrados
    df_filtrado = df[~df[first_col].isin(encontrados)]
    nao_encontrados = df_filtrado[first_col].tolist()
    qtd_pendentes = len(nao_encontrados)

    logger.info("Empresas não encontradas: %s", qtd_pendentes)

    # -------------------------------------------------------------------------
    # MATCH INTELIGENTE (FUZZY)
    # -------------------------------------------------------------------------

    sugestoes_geradas = 0

    if nao_encontrados:
        sugestoes_geradas = generate_and_store_suggestions(
            input_names=nao_encontrados,
            user=user,
        )

    # -------------------------------------------------------------------------
    # Atualiza o XLS removendo os já encontrados
    # -------------------------------------------------------------------------

    df_filtrado.to_excel(path, index=False)

    tempo_execucao = (datetime.now() - start_time).total_seconds()

    # -------------------------------------------------------------------------
    # Retorno final
    # -------------------------------------------------------------------------

    if qtd_pendentes > 0:
        return {
            "status": "PENDING",
            "message": (
                f"Importação concluída com pendências. "
                f"Total: {total}, "
                f"Encontradas: {qtd_encontrados}, "
                f"Pendentes: {qtd_pendentes}, "
                f"Sugestões geradas: {sugestoes_geradas}, "
                f"Tempo: {tempo_execucao:.2f}s."
            ),
        }

    return {
        "status": "FINISHED",
        "message": (
            f"Importação concluída com sucesso. "
            f"Total processado: {total}. "
            f"Tempo: {tempo_execucao:.2f}s."
        ),
    }
