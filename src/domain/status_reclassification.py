from datetime import date, datetime
from typing import Optional

import pandas as pd

from src.domain.i18n.status_translation import translate_status_by_name


STATUS_CLOSED = {4, 5, 6, 10}

def reclassify_status(
    df: pd.DataFrame,
    type_df: str = "task",
    lang: str = "en-US"
) -> Optional[pd.DataFrame]:
    """
    Reclassifica o status de tarefas ou atividades com base na data de término.

    Regra:
    - Se o registro estiver em status final, mantém o status original.
    - Se a data de término estiver vazia, mantém o status original.
    - Se a data de término for menor que hoje, reclassifica para "DELAYED"
      no idioma informado.
    - Caso contrário, mantém o status original.

    Parâmetros:
        df:
            DataFrame com os registros a serem analisados.

        type_df:
            Tipo do DataFrame:
            - "task"
            - "activity"

        lang:
            Idioma de saída da reclassificação.
            Exemplos:
            - "en-US"
            - "pt-BR"
            - "es-ES"

    Retorno:
        O mesmo DataFrame com uma nova coluna:
        - "task_status_reclassified"
        ou
        - "activity_status_reclassified"

        Retorna None se o df for None.
    """

    # ---------------------------------------------------------
    # Definição das colunas conforme o tipo de DataFrame
    # ---------------------------------------------------------
    if type_df == "task":
        new_col = "task_status_reclassified"
        col_status_name = "task_status_name"
        col_end_date = "task_end_performed"
        col_status_id = "task_status_id"

    elif type_df == "activity":
        new_col = "activity_status_reclassified"
        col_status_name = "activity_status_name"
        col_end_date = "activity_end_performed"
        col_status_id = "activity_status_id"

    else:
        raise ValueError("type_df deve ser 'task' ou 'activity'.")

    # ---------------------------------------------------------
    # Segurança de entrada
    # ---------------------------------------------------------
    if df is None:
        return None

    if df.empty:
        df[new_col] = None
        return df

    # ---------------------------------------------------------
    # Regra de negócio
    # ---------------------------------------------------------
    today = date.today()

    # IDs de status finais/encerrados
    STATUS_CLOSED = [4, 5, 6, 10]

    delayed_label = translate_status_by_name(lang, "DELAYED")

    def check_status(row):
        status_original = row.get(col_status_name)
        end_date = row.get(col_end_date)
        status_id = row.get(col_status_id)

        # Se já está encerrado/final, mantém status original
        if pd.notna(status_id) and int(status_id) in STATUS_CLOSED:
            return status_original

        # Se não há data de término, mantém status original
        if pd.isna(end_date):
            return status_original

        # Normaliza datetime/timestamp para date
        if isinstance(end_date, pd.Timestamp):
            end_date = end_date.date()
        elif isinstance(end_date, datetime):
            end_date = end_date.date()
        elif hasattr(end_date, "date") and not isinstance(end_date, date):
            end_date = end_date.date()

        # Se está atrasado, reclassifica no idioma informado
        if isinstance(end_date, date) and end_date < today:
            return delayed_label

        return status_original

    df[new_col] = df.apply(check_status, axis=1)

    return df
