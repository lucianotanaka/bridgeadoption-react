import json
from pathlib import Path
from functools import lru_cache

BASE_PATH = Path(__file__).resolve().parent


@lru_cache(maxsize=10)
def load_language(lang: str) -> dict:
    normalized = str(lang or "").strip()
    candidates = []

    if normalized:
        candidates.append(normalized)

        short = normalized.split("-")[0].split("_")[0].strip()
        if short and short not in candidates:
            candidates.append(short)

    if "en" not in candidates:
        candidates.append("en")

    for candidate in candidates:
        file_path = BASE_PATH / f"{candidate}.json"
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)

    raise ValueError(f"Idioma não suportado: {lang}")


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
