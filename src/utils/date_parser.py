"""
date_parser.py

Funções utilitárias para normalizar datas em múltiplos formatos
e converter valores para formatos compatíveis com MariaDB.

Este módulo centraliza conversões comuns de datas, incluindo:
- datas vindas do Excel;
- strings em formatos variados;
- objetos date, datetime e pandas.Timestamp;
- números seriais do Excel.

Funções disponíveis:
- parse_excel_date:
    Converte um valor de data para string formatada para MariaDB.
- to_date_safe:
    Converte um valor para datetime.date de forma segura.
- format_date_for_mariadb:
    Normaliza um valor para date ou datetime, conforme o tipo desejado.

Observações:
- Em caso de erro de conversão, as funções retornam None.
- O módulo não depende de Streamlit nem escreve mensagens de erro em interface.
- Para números seriais do Excel, é usada a base 1899-12-30.
"""

from typing import Optional, Union, Literal
from datetime import date, datetime, timedelta, time
import pandas as pd


def parse_excel_date(
    value: Union[str, int, float, datetime],
    output_format: str = "date"
) -> Optional[str]:
    """
    Converte um valor de data para string compatível com MariaDB.

    Aceita:
    - datetime
    - string de data
    - número serial do Excel

    Parâmetros:
        value:
            Valor a ser convertido.

        output_format:
            Define o formato de saída:
            - "date"      -> YYYY-MM-DD
            - "datetime"  -> YYYY-MM-DD HH:MM:SS
            - "timestamp" -> YYYY-MM-DD HH:MM:SS

    Retorna:
        - str formatada para MariaDB
        - None, se não for possível converter

    Exemplos:
        parse_excel_date("4/9/2021 12:00:00 AM", "datetime")
        parse_excel_date("02/Fev/22", "date")
        parse_excel_date(45332, "date")
    """

    if value is None or value == "":
        return None

    try:
        # ---------------------------------------------------------
        # 1) Se já for datetime
        # ---------------------------------------------------------
        if isinstance(value, datetime):
            dt = value

        # ---------------------------------------------------------
        # 2) Se for número serial do Excel
        # Excel base date = 1899-12-30
        # ---------------------------------------------------------
        elif isinstance(value, (int, float)):
            excel_base_date = datetime(1899, 12, 30)
            dt = excel_base_date + timedelta(days=float(value))

        # ---------------------------------------------------------
        # 3) Se for string → usar pandas para conversão robusta
        # ---------------------------------------------------------
        else:
            dt = pd.to_datetime(
                value,
                dayfirst=False,
                errors="coerce"
            )

            if pd.isna(dt):
                return None

            dt = dt.to_pydatetime()

        # ---------------------------------------------------------
        # 4) Retornar no formato solicitado
        # ---------------------------------------------------------
        if output_format.lower() == "date":
            return dt.strftime("%Y-%m-%d")

        if output_format.lower() in ("datetime", "timestamp"):
            return dt.strftime("%Y-%m-%d %H:%M:%S")

        raise ValueError("output_format deve ser: date, datetime ou timestamp")

    except Exception:
        return None


def to_date_safe(
    value: Union[str, int, float, datetime, date, pd.Timestamp]
) -> Optional[date]:
    """
    Converte um valor para datetime.date de forma segura.

    Aceita:
    - datetime.date
    - datetime.datetime
    - pandas.Timestamp
    - string de data
    - número serial do Excel

    Parâmetros:
        value:
            Valor a ser convertido.

    Retorna:
        - datetime.date
        - None, se não for possível converter

    Regras:
    - datetime -> retorna apenas a parte da data
    - pandas.Timestamp -> retorna apenas a parte da data
    - string -> tenta converter com pandas.to_datetime
    - número -> interpreta como serial date do Excel
    """

    if value is None or value == "":
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    try:
        if isinstance(value, pd.Timestamp):
            return value.date()

        if isinstance(value, datetime):
            return value.date()

        if isinstance(value, date):
            return value

        if isinstance(value, (int, float)):
            excel_base_date = datetime(1899, 12, 30)
            return (excel_base_date + timedelta(days=float(value))).date()

        if isinstance(value, str):
            dt = pd.to_datetime(value, dayfirst=False, errors="coerce")
            if pd.isna(dt):
                return None
            return dt.date()

    except Exception:
        return None

    return None


def format_date_for_mariadb(
    value: Union[str, int, float, datetime, date, pd.Timestamp],
    return_type: Literal["auto", "date", "datetime"] = "auto"
) -> Optional[Union[date, datetime]]:
    """
    Normaliza um valor de data para uso com MariaDB.

    Esta função reaproveita `to_date_safe()` para centralizar a lógica
    de conversão e padronização de datas.

    Aceita:
    - datetime.date
    - datetime.datetime
    - pandas.Timestamp
    - string de data
    - número serial do Excel

    Parâmetros:
        value:
            Valor a ser convertido.

        return_type:
            Define o tipo de retorno:
            - "auto":
                * datetime -> mantém datetime
                * date -> mantém date
                * pandas.Timestamp -> retorna date
                * string/número -> retorna date
            - "date":
                * sempre retorna datetime.date
            - "datetime":
                * sempre retorna datetime.datetime
                * quando a entrada não tiver hora, usa 00:00:00

    Retorna:
        - datetime.date
        - datetime.datetime
        - None, se não for possível converter

    Exemplos:
        format_date_for_mariadb("2024-01-10")
        format_date_for_mariadb("2024-01-10", return_type="datetime")
        format_date_for_mariadb(datetime.now())
        format_date_for_mariadb(date.today(), return_type="date")
    """

    if value is None or value == "":
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    try:
        # ---------------------------------------------------------
        # 1) pandas.Timestamp
        # ---------------------------------------------------------
        if isinstance(value, pd.Timestamp):
            if return_type == "date":
                return value.date()

            if return_type == "datetime":
                return value.to_pydatetime()

            return value.date()

        # ---------------------------------------------------------
        # 2) datetime
        # ---------------------------------------------------------
        if isinstance(value, datetime):
            if return_type == "date":
                return value.date()

            return value

        # ---------------------------------------------------------
        # 3) date
        # ---------------------------------------------------------
        if isinstance(value, date):
            if return_type == "datetime":
                return datetime.combine(value, time.min)

            return value

        # ---------------------------------------------------------
        # 4) string / número / outros suportados por to_date_safe
        # ---------------------------------------------------------
        parsed_date = to_date_safe(value)

        if parsed_date is None:
            return None

        if return_type == "datetime":
            return datetime.combine(parsed_date, time.min)

        return parsed_date

    except Exception:
        return None
