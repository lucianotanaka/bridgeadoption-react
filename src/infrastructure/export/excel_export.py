# 1️ Standard library
import io
from decimal import Decimal

# 2️ Third-party
import pandas as pd


def convert_df_to_excel(
    df: pd.DataFrame,
    numeric_cols_2dec: list[str] = None,
    date_cols: list[str] = None
    ) -> bytes:
    """
    Converte um DataFrame em Excel na memória.
    - Aplica formato #,##0.00 nas colunas passadas em numeric_cols_2dec.
    - Aplica formato yyyy-mmm-dd nas colunas passadas em date_cols.
    - Demais colunas recebem largura padrão.
    """
    numeric_cols_2dec = numeric_cols_2dec or []
    date_cols = date_cols or []
    
    # Garante tipos corretos antes de exportar
    df_to_export = df.copy()
    
    # Força numérico nessas colunas (caso venham como texto/Decimal)
    for col in numeric_cols_2dec:
        if col in df_to_export.columns:
            df_to_export[col] = pd.to_numeric(df_to_export[col], errors='coerce')
            
    # Garante datetime real nas colunas de data (para Excel entender)
    for col in date_cols:
        if col in df_to_export.columns:
            df_to_export[col] = pd.to_datetime(df_to_export[col], errors='coerce')
        
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter', datetime_format='yyyy-mm-dd') as writer:
        sheet_name = 'Sheet1'
        df_to_export.to_excel(writer, index=False, sheet_name=sheet_name)
        
        # Obter workbook e worksheet
        workbook  = writer.book
        worksheet = writer.sheets[sheet_name]
        
        # Formatos
        fmt_2dec = workbook.add_format({'num_format': '#,##0.00'})
        fmt_date = workbook.add_format({'num_format': 'yyyy-mmm-dd'})
        
        # Aplica formatos por coluna
        cols = list(df_to_export.columns)
        for idx, col in enumerate(cols):
            # largura padrão
            width = 20

            if col in numeric_cols_2dec:
                worksheet.set_column(idx, idx, 15, fmt_2dec)
            elif col in date_cols:
                worksheet.set_column(idx, idx, 14, fmt_date)
            else:
                worksheet.set_column(idx, idx, width)
        
    return output.getvalue()