
"""
Runner executado via crontab para processar importações agendadas.

Este script é um *entrypoint* bem fino:
- configura logging básico;
- chama `src.services.import_scheduling.run()`, que contém a lógica
  de agendamento / concorrência / consulta ao banco;
- traduz o resultado em um código de saída para o sistema operacional.

Execução recomendada no cron:
    /caminho/venv/bin/python -m src.app.import_scheduling_runner

Onde:
- o módulo `src.services.import_scheduling` é responsável por:
    - limpar jobs "presos" em estado RUNNING há muitas horas;
    - respeitar o limite de jobs simultâneos (dependendo do horário/dia);
    - buscar jobs PENDING e disparar os importadores corretos.
"""

import logging
import sys

from src.services.import_scheduling import run


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )


def main() -> int:
    setup_logging()

    logging.info("Iniciando scheduler de importações (cron).")

    try:
        processed = run()
        logging.info("Scheduler finalizado. Total de jobs processados: %s", processed)
        return 0
    except Exception:
        logging.exception("Falha crítica no scheduler de importações.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
