# src/domain/i18n/priority_translation.py

from typing import Dict, Optional


# =========================================================
# MAPAS CANÔNICOS DE PRIORIDADE
# =========================================================
# Regra:
# - a chave canônica é sempre HIGH / MEDIUM / LOW
# - os valores são os rótulos exibidos por idioma
# - isso permite:
#   1) traduzir chave -> label
#   2) fazer tradução reversa label -> chave
#   3) traduzir de um idioma para outro via chave canônica
_PRIORITY_MAPPING: Dict[str, Dict[str, str]] = {
    "pt-BR": {
        "HIGH": "ALTA",
        "MEDIUM": "MÉDIA",
        "LOW": "BAIXA",
    },
    "es-ES": {
        "HIGH": "ALTA",
        "MEDIUM": "MEDIA",
        "LOW": "BAJA",
    },
    "en-US": {
        "HIGH": "HIGH",
        "MEDIUM": "MEDIUM",
        "LOW": "LOW",
    },
}


# =========================================================
# HELPERS INTERNOS
# =========================================================
def _normalize_priority_key(value: Optional[str]) -> str:
    """
    Normaliza possíveis entradas para a chave canônica de prioridade.

    Exemplos:
    - "high"   -> "HIGH"
    - " High " -> "HIGH"
    - None     -> ""

    Observação:
    Esta função não traduz labels. Ela apenas normaliza a string
    para facilitar comparações por chave canônica.

    Exemplo de uso:
    >>> _normalize_priority_key(" low ")
    'LOW'
    """
    if value is None:
        return ""
    return str(value).strip().upper()


def _build_reverse_mapping(lang: str) -> Dict[str, str]:
    """
    Monta o mapa reverso de um idioma:
    label traduzido -> chave canônica

    Exemplo em es-ES:
    {
        "ALTA": "HIGH",
        "MEDIA": "MEDIUM",
        "BAJA": "LOW",
    }

    Exemplo de uso:
    >>> _build_reverse_mapping("es-ES")
    {'ALTA': 'HIGH', 'MEDIA': 'MEDIUM', 'BAJA': 'LOW'}
    """
    mapping = _PRIORITY_MAPPING.get(lang, _PRIORITY_MAPPING["en-US"])
    return {str(label).strip().upper(): key for key, label in mapping.items()}


# =========================================================
# API PÚBLICA
# =========================================================
def get_priority_mapping_by_language(lang: str = "en-US") -> Dict[str, str]:
    """
    Retorna o mapa de prioridades do idioma informado.

    Exemplo:
    get_priority_mapping_by_language("pt-BR")
    -> {"HIGH": "ALTA", "MEDIUM": "MÉDIA", "LOW": "BAIXA"}

    Exemplo de uso:
    >>> get_priority_mapping_by_language("en-US")
    {'HIGH': 'HIGH', 'MEDIUM': 'MEDIUM', 'LOW': 'LOW'}
    """
    return _PRIORITY_MAPPING.get(lang, _PRIORITY_MAPPING["en-US"]).copy()


def get_all_priority_mappings() -> Dict[str, Dict[str, str]]:
    """
    Retorna todos os mapas de prioridade disponíveis.
    Útil para debug, testes e cenários de apoio.

    Exemplo de uso:
    >>> get_all_priority_mappings()["es-ES"]["LOW"]
    'BAJA'
    """
    return {lang: mapping.copy() for lang, mapping in _PRIORITY_MAPPING.items()}


def get_priority_canonical_key(value: Optional[str], source_lang: str = "en-US") -> Optional[str]:
    """
    Retorna a chave canônica da prioridade a partir de:
    - uma chave já canônica (HIGH, MEDIUM, LOW), ou
    - um label traduzido no idioma de origem.

    Exemplos:
    get_priority_canonical_key("BAJA", "es-ES")   -> "LOW"
    get_priority_canonical_key("MÉDIA", "pt-BR")  -> "MEDIUM"
    get_priority_canonical_key("LOW", "en-US")    -> "LOW"
    get_priority_canonical_key("low", "en-US")    -> "LOW"

    Exemplo de uso:
    >>> get_priority_canonical_key("BAIXA", source_lang="pt-BR")
    'LOW'
    >>> get_priority_canonical_key("MEDIA", source_lang="es-ES")
    'MEDIUM'
    """
    normalized = _normalize_priority_key(value)
    if not normalized:
        return None

    # 1) Se já for chave canônica, retorna direto
    if normalized in {"HIGH", "MEDIUM", "LOW"}:
        return normalized

    # 2) Tenta resolver via mapa reverso do idioma de origem
    reverse_map = _build_reverse_mapping(source_lang)
    return reverse_map.get(normalized)


def translate_priority_by_key(priority_key: Optional[str], target_lang: str = "en-US") -> str:
    """
    Traduz uma prioridade a partir da chave canônica.

    Exemplos:
    translate_priority_by_key("LOW", "es-ES")    -> "BAJA"
    translate_priority_by_key("MEDIUM", "pt-BR") -> "MÉDIA"

    Regra de fallback:
    - se a chave não for válida, devolve o valor original como string
      ou string vazia se vier None.

    Exemplo de uso:
    >>> translate_priority_by_key("HIGH", target_lang="pt-BR")
    'ALTA'
    >>> translate_priority_by_key("LOW", target_lang="es-ES")
    'BAJA'
    """
    if priority_key is None:
        return ""

    normalized_key = _normalize_priority_key(priority_key)
    mapping = _PRIORITY_MAPPING.get(target_lang, _PRIORITY_MAPPING["en-US"])

    return mapping.get(normalized_key, str(priority_key))


def translate_priority_by_value(
    priority_value: Optional[str],
    source_lang: str = "en-US",
    target_lang: str = "en-US",
) -> str:
    """
    Traduz uma prioridade a partir do valor exibido no idioma de origem.

    Fluxo:
    1) converte o valor recebido para a chave canônica
    2) traduz essa chave para o idioma de destino

    Exemplos:
    translate_priority_by_value("BAJA", "es-ES", "en-US")   -> "LOW"
    translate_priority_by_value("ALTA", "pt-BR", "en-US")   -> "HIGH"
    translate_priority_by_value("MEDIUM", "en-US", "pt-BR") -> "MÉDIA"

    Fallback:
    - se não conseguir identificar a chave canônica, retorna o valor original.

    Exemplo de uso:
    >>> translate_priority_by_value("BAJA", source_lang="es-ES", target_lang="en-US")
    'LOW'
    >>> translate_priority_by_value("MÉDIA", source_lang="pt-BR", target_lang="es-ES")
    'MEDIA'
    """
    canonical_key = get_priority_canonical_key(priority_value, source_lang=source_lang)
    if canonical_key is None:
        return "" if priority_value is None else str(priority_value)

    return translate_priority_by_key(canonical_key, target_lang=target_lang)


def is_valid_priority(value: Optional[str], source_lang: str = "en-US") -> bool:
    """
    Verifica se o valor representa uma prioridade válida,
    seja como chave canônica ou como label traduzido.

    Exemplo de uso:
    >>> is_valid_priority("BAJA", source_lang="es-ES")
    True
    >>> is_valid_priority("URGENTE", source_lang="pt-BR")
    False
    """
    return get_priority_canonical_key(value, source_lang=source_lang) is not None


def list_priority_keys() -> list[str]:
    """
    Retorna a lista de chaves canônicas suportadas.

    Exemplo de uso:
    >>> list_priority_keys()
    ['HIGH', 'MEDIUM', 'LOW']
    """
    return ["HIGH", "MEDIUM", "LOW"]


def get_priority_options(lang: str = "en-US") -> list[str]:
    """
    Retorna a lista de prioridades traduzidas no idioma informado,
    preservando a ordem canônica de exibição:

    1) HIGH
    2) MEDIUM
    3) LOW

    Exemplos:
    >>> get_priority_options("en-US")
    ['HIGH', 'MEDIUM', 'LOW']

    >>> get_priority_options("pt-BR")
    ['ALTA', 'MÉDIA', 'BAIXA']

    >>> get_priority_options("es-ES")
    ['ALTA', 'MEDIA', 'BAJA']
    """
    mapping = _PRIORITY_MAPPING.get(lang, _PRIORITY_MAPPING["en-US"])

    return [
        mapping["HIGH"],
        mapping["MEDIUM"],
        mapping["LOW"],
    ]


# =========================================================
# EXEMPLOS PRÁTICOS DE USO
# =========================================================
# 1) Traduzir um valor vindo da interface em espanhol para inglês
# selected_task_priority = "BAJA"
# priority_en = translate_priority_by_value(
#     selected_task_priority,
#     source_lang="es-ES",
#     target_lang="en-US",
# )
# # resultado: "LOW"
#
# 2) Obter a chave canônica antes de aplicar cores, filtros ou ordenação
# selected_task_priority = "MÉDIA"
# canonical_priority = get_priority_canonical_key(
#     selected_task_priority,
#     source_lang="pt-BR",
# )
# # resultado: "MEDIUM"
#
# 3) Traduzir uma chave canônica para exibição em outro idioma
# priority_label = translate_priority_by_key("LOW", target_lang="pt-BR")
# # resultado: "BAIXA"
#
# 4) Validar se um valor recebido representa uma prioridade conhecida
# valid = is_valid_priority("ALTA", source_lang="es-ES")
# # resultado: True
#
# 5) Obter o mapa completo do idioma atual para popular selects ou labels
# priority_map = get_priority_mapping_by_language("pt-BR")
# # resultado:
# # {
# #     "HIGH": "ALTA",
# #     "MEDIUM": "MÉDIA",
# #     "LOW": "BAIXA",
# # }
