import pandas as pd
from datetime import date, datetime


def sync_dataframes(old_df, new_df, key_column=None):
    """
    Compara dois DataFrames e adiciona os registros de 'new_df'
    que são diferentes ou novos ao 'old_df'.

    Args:
        old_df (pd.DataFrame): DataFrame principal.
        new_df (pd.DataFrame): DataFrame com novos registros.
        key_column (str): Coluna usada para unicidade.

    Returns:
        pd.DataFrame: DataFrame atualizado e sem duplicatas.
    """
    if old_df is None or old_df.empty:
        return new_df.copy() if new_df is not None else pd.DataFrame()

    if new_df is None or new_df.empty:
        return old_df

    if key_column is None:
        return old_df

    combined_df = pd.concat([old_df, new_df], ignore_index=True)
    updated_df = combined_df.drop_duplicates(subset=[key_column], keep="last")

    return updated_df


def _is_date_like_column(column_name, series=None, new_value=None):
    """
    Determina se a coluna deve ser tratada como data.

    Critérios:
        - dtype datetime no DataFrame
        - novo valor é date/datetime
        - nome da coluna sugere data
    """
    if series is not None and pd.api.types.is_datetime64_any_dtype(series):
        return True

    if isinstance(new_value, (date, datetime)):
        return True

    if isinstance(column_name, str):
        lowered = column_name.lower()
        if any(token in lowered for token in ["date", "start", "end"]):
            return True

    return False


def _normalize_value_for_dataframe(column_name, series, new_value):
    """
    Normaliza o valor para uso em DataFrame de interface.

    Regras:
        - campos de data tentam conversão com pandas
        - se a conversão falhar, mantém valor original
        - campos não-data mantêm atribuição direta
    """
    is_date_field = _is_date_like_column(
        column_name=column_name,
        series=series,
        new_value=new_value
    )

    if not is_date_field:
        return new_value

    if new_value in [None, ""]:
        return pd.NaT if series is not None and pd.api.types.is_datetime64_any_dtype(series) else None

    try:
        return pd.to_datetime(new_value)
    except Exception:
        return new_value


def _update_value_in_dataframe(df, id_column, record_id, column, new_value):
    """
    Função interna genérica para atualizar uma coluna em uma linha específica do DataFrame.

    Args:
        df (pd.DataFrame): DataFrame alvo.
        id_column (str): Nome da coluna identificadora.
        record_id: Valor do identificador do registro.
        column (str): Coluna a atualizar.
        new_value: Novo valor.

    Returns:
        pd.DataFrame: O próprio DataFrame atualizado.
    """
    if df is None or df.empty:
        return df

    if id_column not in df.columns:
        return df

    if column not in df.columns:
        return df

    try:
        record_id = int(record_id)
    except (ValueError, TypeError):
        return df

    if record_id not in df[id_column].values:
        return df

    final_val = _normalize_value_for_dataframe(
        column_name=column,
        series=df[column],
        new_value=new_value
    )

    df.loc[df[id_column] == record_id, column] = final_val
    return df


def update_task_in_dataframe(df, task_id, column, new_value):
    """
    Atualiza o valor de uma coluna específica para uma tarefa no DataFrame.

    Args:
        df (pd.DataFrame): DataFrame contendo tarefas.
        task_id (int): ID da tarefa.
        column (str): Nome da coluna a ser alterada.
        new_value: Novo valor.

    Returns:
        pd.DataFrame: DataFrame atualizado.
    """
    return _update_value_in_dataframe(
        df=df,
        id_column="task_id",
        record_id=task_id,
        column=column,
        new_value=new_value
    )


def update_activity_in_dataframe(df, activity_id, column, new_value):
    """
    Atualiza o valor de uma coluna específica para uma atividade no DataFrame.

    Args:
        df (pd.DataFrame): DataFrame contendo atividades.
        activity_id (int): ID da atividade.
        column (str): Nome da coluna a ser alterada.
        new_value: Novo valor.

    Returns:
        pd.DataFrame: DataFrame atualizado.
    """
    return _update_value_in_dataframe(
        df=df,
        id_column="activity_id",
        record_id=activity_id,
        column=column,
        new_value=new_value
    )
