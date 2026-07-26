"""
===============================================================================
Company Name Matching Service
===============================================================================

OBJETIVO
-----------
Este módulo é responsável por realizar matching inteligente de nomes de empresas
utilizando fuzzy matching (RapidFuzz), normalização textual e controle de ambiguidade.

Ele é utilizado principalmente durante processos de importação, onde nomes de
empresas podem chegar com variações, erros ou sufixos corporativos diferentes.

-------------------------------------------------------------------------------

FLUXO ARQUITETURAL
---------------------

Importador
    ↓
Match exato (via CompanyRepository)
    ↓
Não encontrados
    ↓
company_name_matching_service.generate_and_store_suggestions()
    ↓
tbCompanyNameSuggestion

-------------------------------------------------------------------------------

O QUE ELE FAZ

1) Normaliza nomes (remove acento, pontuação, sufixos como LTDA, SA, etc)
2) Carrega catálogo oficial da tbCompanyListName
3) Executa fuzzy matching com RapidFuzz
4) Controla ambiguidade (evita match errado)
5) Persiste sugestões na tbCompanyNameSuggestion

-------------------------------------------------------------------------------

EXEMPLOS DE USO

# Exemplo 1 - Buscar melhor match unitário

match = find_best_match("Banco Itaú S.A")

if match:
    print(match.company_id)
    print(match.suggested_name)
    print(match.score)

# Exemplo 2 - Gerar sugestões para lista

generate_and_store_suggestions(
    input_names=["Itau SA", "Bradesco Ltda", "XP Investimentos"],
    user="import_script"
)

-------------------------------------------------------------------------------

DEPENDÊNCIAS
---------------
- rapidfuzz
- tbCompanyListName
- tbCompanyNameSuggestion
- CompanyNameSuggestionRepository

===============================================================================
"""

import logging
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

from rapidfuzz import fuzz, process  # type: ignore

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.repositories.company_name_suggestion_repository import (
    CompanyNameSuggestionRepository,
)

logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================

"""
CORPORATE_SUFFIXES:
Remove sufixos irrelevantes para matching.
Evita que "Itau SA" e "Itau" sejam considerados diferentes.
"""
CORPORATE_SUFFIXES = {
    "ltda", "s/a", "sa", "s.a", "me", "eireli", "epp"
}

"""
DEFAULT_SCORE_CUTOFF:
Score mínimo para considerar um match válido.
Recomendado: 85–92 dependendo do rigor desejado.
"""
DEFAULT_SCORE_CUTOFF = 90

"""
AMBIGUITY_DELTA:
Diferença mínima entre o melhor e segundo melhor match.
Evita falsos positivos quando duas empresas são parecidas.
"""
AMBIGUITY_DELTA = 5


# =============================================================================
# MODELOS
# =============================================================================

@dataclass
class CompanyNameCatalogRecord:
    """
    Representa um registro normalizado do catálogo.
    """
    company_id: int
    original_name: str
    normalized_name: str


@dataclass
class CompanyNameMatchCandidate:
    """
    Representa o resultado final de um match válido.
    """
    input_name: str
    suggested_name: str
    company_id: int
    score: float


# =============================================================================
# NORMALIZAÇÃO
# =============================================================================

def normalize_company_name(name: str) -> str:
    """
    Normaliza o nome da empresa para melhorar o matching.

    Etapas:
    1) Remove acentos
    2) Remove caracteres especiais
    3) Converte para lowercase
    4) Remove sufixos corporativos
    5) Remove múltiplos espaços

    Exemplo:
        "Banco Itaú S.A." → "banco itau"
    """

    if not name:
        return ""

    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = name.lower()
    name = re.sub(r"[^\w\s]", " ", name)

    tokens = name.split()
    tokens = [t for t in tokens if t not in CORPORATE_SUFFIXES]

    name = " ".join(tokens)
    name = re.sub(r"\s+", " ", name).strip()

    return name


# =============================================================================
# CARGA DO CATÁLOGO
# =============================================================================

@lru_cache(maxsize=1)
def load_company_catalog() -> Tuple[List[str], Dict[str, List[int]], Dict[str, str]]:
    """
    Carrega o catálogo completo da tbCompanyListName e normaliza.

    Retorna:
        normalized_names → lista de nomes normalizados únicos
        name_to_company_ids → mapping nome_normalizado → [company_ids]
        normalized_to_original → mapping nome_normalizado → nome_original

    Usa cache (lru_cache) para evitar múltiplas consultas ao banco.
    """

    conn = get_db_connection()
    if not conn:
        raise ConnectionError("Erro ao conectar ao banco.")

    try:
        cur = conn.cursor(dictionary=True)

        sql = """
            SELECT companylistname_company_id AS company_id,
                   companylistname_name AS name
            FROM tbCompanyListName
            WHERE companylistname_name IS NOT NULL
              AND companylistname_name <> ''
        """
        cur.execute(sql)
        rows = cur.fetchall() or []

        normalized_names: List[str] = []
        name_to_company_ids: Dict[str, List[int]] = {}
        normalized_to_original: Dict[str, str] = {}

        seen = set()

        for r in rows:
            company_id = int(r["company_id"])
            original_name = str(r["name"]).strip()
            normalized = normalize_company_name(original_name)

            if not normalized:
                continue

            if normalized not in seen:
                normalized_names.append(normalized)
                seen.add(normalized)
                normalized_to_original[normalized] = original_name

            if normalized not in name_to_company_ids:
                name_to_company_ids[normalized] = []

            if company_id not in name_to_company_ids[normalized]:
                name_to_company_ids[normalized].append(company_id)

        logger.info(
            "Catálogo carregado: %s nomes únicos normalizados.",
            len(normalized_names),
        )

        return normalized_names, name_to_company_ids, normalized_to_original

    finally:
        cur.close()
        conn.close()


# =============================================================================
# MATCHING
# =============================================================================

def find_best_match(
    input_name: str,
    score_cutoff: int = DEFAULT_SCORE_CUTOFF,
) -> Optional[CompanyNameMatchCandidate]:
    """
    Retorna o melhor match válido para um nome de empresa.

    Processo:
        1) Normaliza input
        2) Executa fuzzy matching (token_set_ratio)
        3) Verifica score mínimo
        4) Verifica ambiguidade
        5) Retorna CompanyNameMatchCandidate

    Retorna None se:
        - score abaixo do mínimo
        - match ambíguo
        - empresa não encontrada

    Exemplo:
        match = find_best_match("Itau S/A")
    """

    clean_input = (input_name or "").strip()
    if not clean_input:
        return None

    normalized_input = normalize_company_name(clean_input)

    known_names, name_to_company_ids, normalized_to_original = load_company_catalog()

    matches = process.extract(
        normalized_input,
        known_names,
        scorer=fuzz.token_set_ratio,
        limit=2,
    )

    if not matches:
        return None

    best_name, best_score, _ = matches[0]

    if best_score < score_cutoff:
        return None

    # Controle de ambiguidade
    if len(matches) > 1:
        second_name, second_score, _ = matches[1]

        if best_score - second_score < AMBIGUITY_DELTA:
            first_ids = name_to_company_ids.get(best_name, [])
            second_ids = name_to_company_ids.get(second_name, [])

            if set(first_ids) != set(second_ids):
                logger.warning(
                    "Match ambíguo para '%s': %.1f vs %.1f",
                    clean_input,
                    best_score,
                    second_score,
                )
                return None

    company_ids = name_to_company_ids.get(best_name, [])
    if not company_ids:
        return None

    return CompanyNameMatchCandidate(
        input_name=clean_input,
        suggested_name=normalized_to_original[best_name],
        company_id=company_ids[0],
        score=float(best_score),
    )


# =============================================================================
# API PÚBLICA
# =============================================================================

def generate_and_store_suggestions(
    input_names: List[str],
    user: Optional[str],
    score_cutoff: int = DEFAULT_SCORE_CUTOFF,
) -> int:
    """
    Gera sugestões automáticas e persiste na tbCompanyNameSuggestion.

    Usado quando:
        - Importação não encontrou match exato
        - Queremos sugerir empresa automaticamente

    Parâmetros:
        input_names → lista de nomes a validar
        user → usuário responsável
        score_cutoff → score mínimo

    Retorna:
        Quantidade de sugestões inseridas

    Exemplo:

        generate_and_store_suggestions(
            ["Itau SA", "XP Invest."],
            user="import_batch_01"
        )
    """

    repo = CompanyNameSuggestionRepository()

    unique_input = sorted(
        set((n or "").strip() for n in input_names if (n or "").strip())
    )

    inserted = 0

    for name in unique_input:
        match = find_best_match(name, score_cutoff=score_cutoff)

        if not match:
            continue

        repo.insert({
            "suggestion_input_name": match.input_name,
            "suggestion_suggested_name": match.suggested_name,
            "suggestion_company_id": match.company_id,
            "suggestion_score": match.score,
            "suggestion_created_by": user,
        })

        inserted += 1

    logger.info("Sugestões gravadas: %s", inserted)

    return inserted
