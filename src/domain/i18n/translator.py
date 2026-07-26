import json
from pathlib import Path
from functools import lru_cache

BASE_PATH = Path("/home/bridgeadoption/src/domain/i18n")


@lru_cache(maxsize=10)
def load_language(lang: str) -> dict:
    file_path = BASE_PATH / f"{lang}.json"

    if not file_path.exists():
        raise ValueError(f"Idioma não suportado: {lang}")

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def translate(lang: str, key: str) -> str:
    """
    Tradução usando notação ponto.
    Ex: contract.title
    """
    data = load_language(lang)

    parts = key.split(".")
    value = data

    for part in parts:
        value = value.get(part)
        if value is None:
            return key

    return value
