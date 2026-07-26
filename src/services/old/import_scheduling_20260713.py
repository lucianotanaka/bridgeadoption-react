import datetime as dt
import logging
from typing import List, Dict, Callable, Optional

from src.infrastructure.database.connection import get_db_connection
from src.services.importers.import_company_name import run_import as run_import_company
from src.services.importers.cisco_subscription_ccw import run_import as run_import_ccw
from src.services.importers.cisco_ready import run_import as run_import_cisco_ready
from src.services.importers.pxp_import_task_6702 import run_import as run_import_cisco_lci_task
from src.services.importers.pxp_import_activity_5890 import run_import as run_import_cisco_lci_activity
from src.services.importers.cisco_smart_account_usage_fetcher import run_import as run_cisco_smart_account_usage_fetcher
from src.services.importers.cisco_enterprise_agreement_usage_fetcher import run_import as run_cisco_enterprise_agreement_usage_fetcher

# ==========================================================
# DISPATCHER DE IMPORTADORES (EXTENSÍVEL)
# ==========================================================
# Mapeia o "tipo de importação" (campo importctrl_source na tbImportControl)
# para a função Python responsável por executar a importação.
#
# A assinatura esperada de cada função é:
#     run_import(file_name: str, user_id: Optional[str]) -> Dict[str, str]
#
# O retorno deve conter pelo menos:
#     {"status": "...", "message": "..."}
#
# Para adicionar um novo importador:
#   1) Implementar o módulo em src/services/importers/...
#   2) Importar a função aqui.
#   3) Registrar uma nova entrada neste dicionário.
IMPORT_DISPATCHER: Dict[str, Callable[[str, Optional[str]], None]] = {
    "CiscoSubscriptionCCW": run_import_ccw,
    "ImportCompany": run_import_company,
    "CiscoReady": run_import_cisco_ready,
    #"NTTOracle": run_import_ntt_oracle,
    "CiscoLCITask": run_import_cisco_lci_task,
    "CiscoLCIActivity": run_import_cisco_lci_activity,
    "CiscoSmartAccountUsageFetcher": run_cisco_smart_account_usage_fetcher,
    "CiscoEnterpriseAgreementUsageFetcher": run_cisco_enterprise_agreement_usage_fetcher,
}


# ==========================================================
# CONTROLE DE PARALELISMO
# ==========================================================

def get_max_running_now() -> int:
    now = dt.datetime.now()
    weekday = now.weekday()
    hour = now.hour

    if weekday >= 5:  # sábado/domingo
        return 4

    if hour < 6 or hour >= 19:
        return 4

    return 1


# ==========================================================
# BANCO
# ==========================================================

def get_connection():
    conn = get_db_connection()
    if not conn:
        raise ConnectionError("Não foi possível obter conexão com o banco.")
    return conn


# ==========================================================
# LIMPEZA DE JOBS PRESOS
# ==========================================================

def cleanup_stuck_jobs(conn) -> None:
    """
    Marca como FAILED jobs RUNNING há mais de 6 horas.
    Deixa claro no log que o encerramento foi feito pelo scheduler
    (e não pelo importador em si).
    """
    sql = """
        UPDATE tbImportControl
        SET importctrl_status = 'FAILED',
            importctrl_message = CONCAT(
                'Job RUNNING desde ',
                DATE_FORMAT(importctrl_started, '%Y-%m-%d %H:%i:%s'),
                ' foi encerrado pelo scheduler após mais de 6 horas. ',
                'Possível falha do servidor, kill do processo ou travamento da importação.'
            ),
            importctrl_ended = NOW()
        WHERE importctrl_status = 'RUNNING'
          AND importctrl_started < NOW() - INTERVAL 6 HOUR
    """
    cur = conn.cursor()
    cur.execute(sql)
    affected = cur.rowcount
    conn.commit()
    cur.close()

    if affected:
        logging.warning("Jobs RUNNING presos corrigidos pelo scheduler: %s", affected)


# ==========================================================
# CONSULTAS
# ==========================================================

def fetch_running_count(conn) -> int:
    sql = """
        SELECT COUNT(*) AS qtd
        FROM tbImportControl
        WHERE importctrl_status = 'RUNNING'
    """
    cur = conn.cursor(dictionary=True)
    cur.execute(sql)
    row = cur.fetchone()
    cur.close()
    return int(row["qtd"]) if row else 0


def fetch_pending_jobs(conn, limit: int) -> List[dict]:
    sql = """
        SELECT
            importctrl_id,
            importctrl_source,
            importctrl_file,
            importctrl_started_by
        FROM tbImportControl
        WHERE importctrl_status = 'PENDING'
          AND importctrl_started <= NOW()
        ORDER BY importctrl_started
        LIMIT %s
    """
    cur = conn.cursor(dictionary=True)
    cur.execute(sql, (limit,))
    rows = cur.fetchall()
    cur.close()
    return rows or []


def mark_job_running(conn, job_id: int) -> bool:
    sql = """
        UPDATE tbImportControl
        SET importctrl_status = 'RUNNING',
            importctrl_message = 'Importação iniciada pelo scheduler.',
            importctrl_started = NOW()
        WHERE importctrl_id = %s
          AND importctrl_status = 'PENDING'
    """
    cur = conn.cursor()
    cur.execute(sql, (job_id,))
    affected = cur.rowcount
    conn.commit()
    cur.close()
    return affected > 0


def mark_job_finished(conn, job_id: int, success: bool, message: str) -> None:
    status = "FINISHED" if success else "FAILED"

    sql = """
        UPDATE tbImportControl
        SET importctrl_status = %s,
            importctrl_message = %s,
            importctrl_ended = NOW()
        WHERE importctrl_id = %s
    """
    cur = conn.cursor()
    cur.execute(sql, (status, message, job_id))
    conn.commit()
    cur.close()


# ==========================================================
# PROCESSAMENTO DE JOB
# ==========================================================

def process_single_job(job: dict) -> None:
    job_id = job["importctrl_id"]
    source = job["importctrl_source"]
    file_name = job["importctrl_file"]
    user_id = job.get("importctrl_started_by")

    logging.info("Processando job id=%s source=%s file=%s", job_id, source, file_name)

    conn = get_connection()

    try:
        if not mark_job_running(conn, job_id):
            logging.warning("Job id=%s não pôde ser marcado como RUNNING.", job_id)
            return
    finally:
        conn.close()

    try:
        importer = IMPORT_DISPATCHER.get(source)

        if not importer:
            raise RuntimeError(f"Tipo de importação não suportado: {source}")

        result = importer(file_name, user_id)

        status = result["status"]
        message = result["message"]

        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE tbImportControl
                SET importctrl_status = %s,
                    importctrl_message = %s,
                    importctrl_ended = NOW()
                WHERE importctrl_id = %s
                """,
                (status, message, job_id),
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()

        logging.info("Job id=%s finalizado com status=%s", job_id, status)

    except Exception as e:
        logging.exception("Erro no job id=%s: %s", job_id, e)

        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE tbImportControl
                SET importctrl_status = 'FAILED',
                    importctrl_message = %s,
                    importctrl_ended = NOW()
                WHERE importctrl_id = %s
                """,
                (f"Erro na importação: {e}", job_id),
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()


# ==========================================================
# FUNÇÃO PRINCIPAL (CHAMADA PELO RUNNER)
# ==========================================================

def run() -> int:
    logging.info("Scheduler de importação iniciado.")

    conn = get_connection()

    try:
        cleanup_stuck_jobs(conn)

        max_running = get_max_running_now()
        running_count = fetch_running_count(conn)

        if running_count >= max_running:
            logging.info(
                "Limite de imports simultâneos atingido (%s/%s).",
                running_count,
                max_running,
            )
            return 0

        slots = max_running - running_count
        jobs = fetch_pending_jobs(conn, slots)

    finally:
        conn.close()

    if not jobs:
        logging.info("Nenhum job pendente para execução.")
        return 0

    for job in jobs:
        process_single_job(job)

    logging.info("Scheduler finalizado.")
    return len(jobs)
