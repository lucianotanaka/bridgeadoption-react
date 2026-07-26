"""
Validador genérico de colunas de arquivos de importação.

Este módulo faz a ponte entre:
- os contratos de colunas definidos em `IMPORT_SCHEMAS`
  (ver `src.domain.import_schemas`); e
- o arquivo efetivamente enviado pelo usuário (lista de cabeçalhos).

Exemplo de uso típico (em uma tela de importação Streamlit):

    import pandas as pd
    from src.domain.import_validator import validate_import_columns

    df = pd.read_excel(uploaded_file)

    validation = validate_import_columns(
        import_type="CiscoSubscriptionCCW",
        file_columns=df.columns.tolist(),
    )

    if validation["missing_required"]:
        st.error(f"Colunas obrigatórias ausentes: {validation['missing_required']}")
        st.stop()

    st.success("Arquivo válido para importação.")

A função principal exposta é `validate_import_columns`, que NÃO lê o arquivo.
Ela apenas recebe a lista de colunas já extraída por quem chamou.
"""

from typing import List, Dict
from src.domain.import_schemas import IMPORT_SCHEMAS


def validate_import_columns(
    import_type: str,
    file_columns: List[str],
    case_sensitive: bool = False
) -> Dict[str, List[str]]:
    """
    Valida se o arquivo contém todas as colunas obrigatórias
    para determinado tipo de importação.

    Retorna:
    {
        "missing_required": [...],
        "unexpected_columns": [...]
    }
    """

    if import_type not in IMPORT_SCHEMAS:
        raise ValueError(f"Tipo de importação inválido: {import_type}")

    schema = IMPORT_SCHEMAS[import_type]

    required_columns = schema.get("required", [])
    optional_columns = schema.get("optional", [])

    # ---------------------------------------------------------
    # Normalização opcional (case insensitive)
    # ---------------------------------------------------------
    if not case_sensitive:
        file_columns_normalized = [c.strip().lower() for c in file_columns]
        required_normalized = [c.lower() for c in required_columns]
        optional_normalized = [c.lower() for c in optional_columns]
    else:
        file_columns_normalized = file_columns
        required_normalized = required_columns
        optional_normalized = optional_columns

    # ---------------------------------------------------------
    # Verificar obrigatórias faltantes
    # ---------------------------------------------------------
    missing_required = [
        required_columns[i]
        for i, col in enumerate(required_normalized)
        if col not in file_columns_normalized
    ]

    # ---------------------------------------------------------
    # Colunas inesperadas (opcional)
    # ---------------------------------------------------------
    allowed_columns = set(required_normalized + optional_normalized)

    unexpected_columns = [
        file_columns[i]
        for i, col in enumerate(file_columns_normalized)
        if col not in allowed_columns
    ]

    return {
        "missing_required": missing_required,
        "unexpected_columns": unexpected_columns,
    }
