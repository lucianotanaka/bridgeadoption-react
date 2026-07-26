from src.domain.i18n.translator import translate, load_language

"""
Módulo de tradução e normalização de status.

Objetivo
--------
Centralizar a conversão entre:
- status_id do banco
- status_name canônico do banco
- label traduzida exibida na interface

Estratégia
----------
1. O valor canônico do domínio continua sendo o status do banco.
2. A interface exibe o status traduzido com base no idioma do usuário.
3. O módulo suporta aliases para permitir compatibilidade com valores legados.
4. O status "COMPLETED/CLOSED" foi mantido como canônico no momento,
   mas a estrutura já deixa o código preparado para futura separação.

Exemplos de uso
---------------
1) Se a consulta traz status_id:
    status_label = translate_status_by_id(lang, row["status_id"])

2) Se a consulta traz status_name:
    status_label = translate_status_by_name(lang, row["status_name"])

3) Se o usuário escolheu "CANCELADO" e você quer o id:
    status_id = normalize_status_label_to_id("CANCELADO", "pt-BR")

   Resultado esperado:
    4

4) Se o usuário escolheu "CANCELADO" e você quer o nome canônico do banco:
    status_name = normalize_status_label_to_name("CANCELADO", "pt-BR")

   Resultado esperado:
    "CANCELLED"

Observação importante
---------------------
Se no futuro o status "COMPLETED/CLOSED" for dividido em dois status reais
(ex.: COMPLETED e CLOSED), o ideal é que o banco passe a ter IDs distintos.
Enquanto isso não ocorre, aliases podem ser usados para compatibilidade.
"""

# =========================================================
# DEFINIÇÃO CANÔNICA DOS STATUS
# =========================================================
#
# Cada item possui:
# - id: identificador do status no banco
# - db_name: nome canônico persistido/esperado no banco
# - aliases: nomes alternativos aceitos como entrada
#
# Recomendação:
# - manter um único db_name canônico por status
# - usar aliases apenas para compatibilidade e migração
#
STATUS_DEFINITION = {
    "status.open": {
        "id": 1,
        "db_name": "OPEN",
        "aliases": [],
    },
    "status.in_progress": {
        "id": 2,
        "db_name": "IN PROGRESS",
        "aliases": [],
    },
    "status.on_hold": {
        "id": 3,
        "db_name": "ON HOLD",
        "aliases": [],
    },
    "status.cancelled": {
        "id": 4,
        "db_name": "CANCELLED",
        "aliases": [],
    },
    "status.declined": {
        "id": 5,
        "db_name": "DECLINED",
        "aliases": [],
    },
    "status.expired": {
        "id": 6,
        "db_name": "EXPIRED",
        "aliases": [],
    },
    "status.submitted_to_approval": {
        "id": 7,
        "db_name": "SUBMITTED TO APPROVAL",
        "aliases": [],
    },
    "status.resubmitted_to_approval": {
        "id": 8,
        "db_name": "RESUBMITTED TO APPROVAL",
        "aliases": [],
    },
    "status.approved_to_close": {
        "id": 9,
        "db_name": "APPROVED TO CLOSE",
        "aliases": [],
    },
    "status.completed_closed": {
        "id": 10,
        "db_name": "COMPLETED/CLOSED",
        "aliases": ["COMPLETED", "CLOSED"],
    },
    "status.delayed": {
        "id": 0,
        "db_name": "DELAYED",
        "aliases": [],
    },
}

# =========================================================
# VALIDAÇÃO DE CONSISTÊNCIA
# =========================================================
#
# Garante que não existam IDs duplicados na definição.
# Isso é importante porque o mapa status_id -> chave precisa ser unívoco.
#
_status_ids = [meta["id"] for meta in STATUS_DEFINITION.values()]
if len(_status_ids) != len(set(_status_ids)):
    raise ValueError("Existem IDs de status duplicados em STATUS_DEFINITION")

# =========================================================
# MAPAS DERIVADOS
# =========================================================
#
# Estes mapas são gerados automaticamente a partir de STATUS_DEFINITION
# para evitar duplicação manual e reduzir risco de inconsistência.
#

# Mapa: status_id -> chave de tradução
STATUS_ID_KEY_MAP = {
    meta["id"]: key
    for key, meta in STATUS_DEFINITION.items()
}

# Mapa: nome canônico/alias em maiúsculas -> chave de tradução
STATUS_NAME_KEY_MAP = {}

for key, meta in STATUS_DEFINITION.items():
    STATUS_NAME_KEY_MAP[meta["db_name"].strip().upper()] = key

    for alias in meta.get("aliases", []):
        STATUS_NAME_KEY_MAP[alias.strip().upper()] = key

# Mapa: chave de tradução -> status_id
KEY_TO_STATUS_ID = {
    key: meta["id"]
    for key, meta in STATUS_DEFINITION.items()
}

# Mapa: chave de tradução -> nome canônico do banco
KEY_TO_CANONICAL_STATUS_NAME = {
    key: meta["db_name"]
    for key, meta in STATUS_DEFINITION.items()
}


# =========================================================
# FUNÇÕES AUXILIARES INTERNAS
# =========================================================

def _normalize_text(value: str) -> str:
    """
    Normaliza texto para comparação.

    Regras:
    - converte para string
    - remove espaços nas extremidades
    - converte para maiúsculas

    Exemplo:
        " cancelado " -> "CANCELADO"
    """
    return str(value).strip().upper()


# =========================================================
# TRADUÇÃO DE STATUS
# =========================================================

def translate_status_by_id(lang: str, status_id: int) -> str:
    """
    Traduz um status a partir do seu ID.

    Parâmetros:
        lang: idioma de destino, ex. "pt-BR"
        status_id: ID do status no banco

    Retorno:
        Label traduzida se encontrar o ID;
        caso contrário, retorna o próprio ID em formato texto.

    Exemplo:
        translate_status_by_id("pt-BR", 4) -> "CANCELADO"
    """
    key = STATUS_ID_KEY_MAP.get(status_id)

    if not key:
        return str(status_id)

    return translate(lang, key)


def translate_status_by_name(lang: str, status_name: str) -> str:
    """
    Traduz um status a partir do nome canônico do banco
    ou de um alias conhecido.

    Parâmetros:
        lang: idioma de destino, ex. "pt-BR"
        status_name: nome do status, ex. "CANCELLED"

    Retorno:
        Label traduzida se encontrar correspondência;
        caso contrário, retorna o valor original.

    Exemplo:
        translate_status_by_name("pt-BR", "CANCELLED") -> "CANCELADO"
    """
    if not status_name:
        return ""

    normalized_name = _normalize_text(status_name)
    key = STATUS_NAME_KEY_MAP.get(normalized_name)

    if not key:
        return status_name

    return translate(lang, key)


def translate_status(lang: str, status_id: int = None, status_name: str = None) -> str:
    """
    Função utilitária principal para tradução de status.

    Prioridade:
    1. Se status_id for informado, usa status_id
    2. Caso contrário, tenta status_name
    3. Se nada for informado, retorna string vazia

    Exemplo:
        translate_status("pt-BR", status_id=4) -> "CANCELADO"
        translate_status("pt-BR", status_name="CANCELLED") -> "CANCELADO"
    """
    if status_id is not None:
        return translate_status_by_id(lang, status_id)

    if status_name:
        return translate_status_by_name(lang, status_name)

    return ""


# =========================================================
# NORMALIZAÇÃO DE LABEL TRADUZIDA -> VALOR CANÔNICO
# =========================================================

def normalize_status_label_to_id(status_label: str, source_lang: str):
    """
    Converte uma label traduzida exibida na interface para o status_id.

    Parâmetros:
        status_label: texto traduzido selecionado pelo usuário
        source_lang: idioma da label recebida, ex. "pt-BR"

    Retorno:
        status_id correspondente, se encontrado;
        caso contrário, retorna None.

    Exemplo:
        normalize_status_label_to_id("CANCELADO", "pt-BR") -> 4
    """
    if not status_label:
        return None

    lang_data = load_language(source_lang)
    status_dict = lang_data.get("status", {})
    normalized_label = _normalize_text(status_label)

    for subkey, translated_value in status_dict.items():
        if _normalize_text(translated_value) == normalized_label:
            full_key = f"status.{subkey}"
            return KEY_TO_STATUS_ID.get(full_key)

    return None


def normalize_status_label_to_name(status_label: str, source_lang: str) -> str:
    """
    Converte uma label traduzida exibida na interface para o nome canônico do banco.

    Parâmetros:
        status_label: texto traduzido selecionado pelo usuário
        source_lang: idioma da label recebida, ex. "pt-BR"

    Retorno:
        nome canônico do banco, se encontrado;
        caso contrário, retorna o valor original recebido.

    Exemplo:
        normalize_status_label_to_name("CANCELADO", "pt-BR") -> "CANCELLED"
    """
    if not status_label:
        return ""

    lang_data = load_language(source_lang)
    status_dict = lang_data.get("status", {})
    normalized_label = _normalize_text(status_label)

    for subkey, translated_value in status_dict.items():
        if _normalize_text(translated_value) == normalized_label:
            full_key = f"status.{subkey}"
            return KEY_TO_CANONICAL_STATUS_NAME.get(full_key, status_label)

    return status_label


def get_status_mapping_by_language() -> dict:
    """
    Cria um dicionário bidirecional de mapeamento de status por idioma.

    Estrutura retornada:
        {
            "en-US": {
                "OPEN": "OPEN"
            },
            "pt-BR": {
                "ABERTO": "OPEN",
                "OPEN": "ABERTO"
            },
            "es-ES": {
                "ABIERTO": "OPEN",
                "OPEN": "ABIERTO"
            }
        }

    Regras:
    - O nome canônico do banco em inglês é a referência.
    - Em "en-US", o mapeamento é identidade.
    - Em "pt-BR" e "es-ES", o mapeamento é bidirecional.
    """
    supported_languages = ["en-US", "pt-BR", "es-ES"]
    mapping = {lang: {} for lang in supported_languages}

    for translation_key, meta in STATUS_DEFINITION.items():
        canonical_name = _normalize_text(meta["db_name"])

        for lang in supported_languages:
            translated_label = _normalize_text(translate(lang, translation_key))

            if lang == "en-US":
                mapping[lang][canonical_name] = canonical_name
            else:
                mapping[lang][translated_label] = canonical_name
                mapping[lang][canonical_name] = translated_label

    return mapping
