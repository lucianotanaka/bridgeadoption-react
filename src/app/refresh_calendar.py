
"""
    Como executar:
        cd /home/bridgeadoption/cron
        . venv/bin/activate
        python3 -m src.app.refresh_calendar
    
    Melhor prática:
    cd /home/bridgeadoption/cron && /home/bridgeadoption/cron/venv/bin/python -m src.app.refresh_calendar >> /var/log/refresh_calendar.log 2>&1

"""

from datetime import datetime, timedelta
from src.infrastructure.database.repositories.calendar_repository import CalendarRepository
from src.infrastructure.database.repositories.import_log_repository import ImportLogRepository
from src.infrastructure.database.repositories.measure_cisco_sa_repository import MeasureCiscoSARepository

repo_cal = CalendarRepository()
repo_log = ImportLogRepository()
repo_sa = MeasureCiscoSARepository()

c = 0

min_date = repo_sa.get_min_end_date()
max_date = repo_sa.get_max_end_date()

if min_date and max_date:

    if not repo_cal.exists(min_date) or not repo_cal.exists(max_date):

        count_days = (max_date - min_date).days

        for i in range(count_days + 1):
            current_date = min_date + timedelta(days=i)

            if not repo_cal.exists(current_date):
                repo_cal.insert(current_date)
                c += 1

# Garantir que hoje esteja no calendário
today = datetime.now().date()

if not repo_cal.exists(today):
    repo_cal.insert(today)
    c += 1

if c > 0:
    # Log
    log_message = f"[{today}] Cron Calendar :: {c} date(s) inserted in tbCalendar"

    log_id = repo_log.create(
        source="refresh_calendar.py",
        file="n/a",
        row=0,
        message=log_message,
    )

    if log_id > 0:
        repo_log.mark_as_resolved(
            importlog_id=log_id,
            resolved_by="system",
            resolution_note="Cron executed successfully",
        )
