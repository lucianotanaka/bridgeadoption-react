"""
i18n_utils.py

Módulo utilitário complementar ao translator.py.

Responsabilidades:
-------------------
- Acesso estruturado a seções do JSON de idioma
- Reverse lookup (valor traduzido → chave canônica)
- Validação de valores traduzidos
- Recuperação de chaves de enums

Importante:
-----------
As chaves canônicas (ex: HIGH, MEDIUM, LOW)
devem ser sempre utilizadas internamente no sistema.

Os valores traduzidos (ex: ALTA, MÉDIA, BAIXA)
devem ser utilizados apenas para exibição.

Este módulo NÃO contém regra de negócio.
Ele apenas fornece utilidades de internacionalização (i18n).

Localização:
------------
src/domain/i18n/i18n_utils.py
"""

from typing import Optional, Dict, List
from src.domain.i18n.translator import load_language


# ==========================================================
# FUNÇÃO INTERNA: OBTER SEÇÃO COMPLETA DO JSON
# ==========================================================
def get_section(lang: str, section: str) -> Optional[Dict[str, str]]:
    """
    Retorna uma seção inteira do JSON de idioma.

    Parâmetros:
    ----------
    lang : str
        Código do idioma (ex: "pt-BR", "en-US")

    section : str
        Nome da seção dentro do JSON (ex: "priority")

    Retorno:
    --------
    Dict[str, str] | None

        Exemplo de retorno:
            {
                "HIGH": "ALTA",
                "MEDIUM": "MÉDIA",
                "LOW": "BAIXA"
            }

        Retorna None se:
            - Idioma não existir
            - Seção não existir
            - Seção não for um dicionário
    """

    # Carrega todo o JSON do idioma (já cacheado pelo translator)
    data = load_language(lang)

    value = data.get(section)

    # Garante que a seção seja realmente um dicionário
    if isinstance(value, dict):
        return value

    return None


# ==========================================================
# REVERSE TRANSLATION
# ==========================================================
def reverse_translation(
    lang: str,
    section: str,
    translated_value: str
) -> Optional[str]:
    """
    Converte valor traduzido para chave canônica.

    Exemplo:
        reverse_translation("pt-BR", "priority", "ALTA")
        → "HIGH"

    Parâmetros:
    ----------
    lang : str
        Código do idioma

    section : str
        Nome da seção (ex: "priority")

    translated_value : str
        Valor exibido na interface

    Retorno:
    --------
    str | None

        Retorna a chave canônica correspondente.
        Retorna None se não encontrar correspondência.

    Observação:
    -----------
    A busca é exata (case-sensitive).
    """

    translations = get_section(lang, section)

    if not translations:
        return None

    # Cria mapa reverso: valor traduzido → chave
    reverse_map = {v: k for k, v in translations.items()}

    return reverse_map.get(translated_value)


# ==========================================================
# VALIDAR SE VALOR TRADUZIDO EXISTE
# ==========================================================
def is_valid_translation(
    lang: str,
    section: str,
    translated_value: str
) -> bool:
    """
    Verifica se um valor traduzido existe na seção informada.

    Exemplo:
        is_valid_translation("pt-BR", "priority", "ALTA")
        → True
    """

    translations = get_section(lang, section)

    if not translations:
        return False

    return translated_value in translations.values()


# ==========================================================
# OBTER LISTA DE CHAVES CANÔNICAS
# ==========================================================
def get_keys(lang: str, section: str) -> Optional[List[str]]:
    """
    Retorna todas as chaves canônicas de uma seção.

    Exemplo:
        get_keys("pt-BR", "priority")
        → ["HIGH", "MEDIUM", "LOW"]

    Retorno:
    --------
    List[str] | None
    """

    translations = get_section(lang, section)

    if not translations:
        return None

    return list(translations.keys())


# ==========================================================
# OBTER LISTA DE VALORES TRADUZIDOS
# ==========================================================
def get_translated_values(lang: str, section: str) -> Optional[List[str]]:
    """
    Retorna todos os valores traduzidos de uma seção.

    Exemplo:
        get_translated_values("pt-BR", "priority")
        → ["ALTA", "MÉDIA", "BAIXA"]
    """

    translations = get_section(lang, section)

    if not translations:
        return None

    return list(translations.values())
