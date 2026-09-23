from typing import Any, Optional


def parse_decimal(value: Any) -> Optional[float]:
    """
    Normaliza números vindos do Excel/CSV para float Python, adequados
    para gravação em colunas DECIMAL/NUMERIC no MariaDB.

    Suporta:
    - Valores numéricos (int, float) já convertidos pelo openpyxl.
    - Strings nos formatos:
        * "1234.56"   (padrão US)
        * "1,234.56"  (US com separador de milhar)
        * "1234,56"   (padrão BR)
        * "1.234,56"  (BR com separador de milhar)
        * "1234"      (inteiro)

    Regras:
    - Se value é None ou string vazia → retorna None.
    - Se value já é int/float → retorna float(value) sem manipular separadores.
    - Se é string:
        * Remove espaços.
        * Se contém vírgula:
            - Se também contém ponto → assume formato BR "1.234,56":
              remove pontos (milhar) e troca vírgula por ponto.
            - Se só vírgula → assume decimal "1234,56": troca vírgula por ponto.
        * Se não contém vírgula:
            - Deixa como está: "1234.56" ou "1234" já são válidos para float().

    Qualquer erro de conversão retorna None.
    """
    if value is None:
        return None

    # Se o openpyxl já converteu para número, não mexemos no formato
    if isinstance(value, (int, float)):
        try:
            return float(value)
        except Exception:
            return None

    text = str(value).strip()
    if not text:
        return None

    # Remove espaços internos, ex: " 6 774,77" -> "6774,77"
    text = text.replace(" ", "")

    has_comma = "," in text
    has_dot = "." in text

    try:
        if has_comma:
            if has_dot:
                # Ex.: "1.234,56" (BR) -> "1234.56"
                text = text.replace(".", "").replace(",", ".")
            else:
                # Ex.: "1234,56" (BR) -> "1234.56"
                text = text.replace(",", ".")
        # Se não tem vírgula:
        # - "1234.56" (US) continua igual
        # - "1234" continua igual

        return float(text)
    except Exception:
        return None
