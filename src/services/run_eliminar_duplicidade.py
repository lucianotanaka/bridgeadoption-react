"""
Runner oficial do processo:
Eliminação de duplicidade de serial de asset.

Responsabilidades:
- Registrar início e fim no ImportControl (id=1)
- Executar o service principal
- Capturar erros globais
- Permitir execução via CLI, cron ou systemd
"""

from datetime import datetime
import traceback

from src.services.maintenance.eliminar_duplicidade_serial_asset import (
    eliminar_duplicidade_serial_asset,
)
from src.infrastructure.database.repositories.import_control_repository import (
    ImportControlRepository,
)

IMPORT_ID = 1


def main() -> None:

    repo = ImportControlRepository()

    try:
        # Marca como RUNNING
        repo.start_import(
            IMPORT_ID,
            message=f"Iniciado em {datetime.now()}",
        )

        eliminar_duplicidade_serial_asset()

        # Marca como FINISHED
        repo.finish_import(
            IMPORT_ID,
            message=f"Finalizado com sucesso em {datetime.now()}",
        )

    except Exception as e:

        # Marca como FAILED
        repo.fail_import(
            IMPORT_ID,
            message=f"Erro em {datetime.now()} - {str(e)}",
        )

        print("Erro crítico:")
        print(traceback.format_exc())

        raise


if __name__ == "__main__":
    main()
