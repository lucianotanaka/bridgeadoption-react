"""
Gunicorn configuration for Bridge Adoption API (CentOS/Linux)
Replaces: uvicorn app.main:app --host 0.0.0.0 --port 8000
Use:      gunicorn app.main:app -c gunicorn.conf.py

Workers = (2 * CPU_cores) + 1
  - Servidor com 2 CPUs  → 5 workers
  - Servidor com 4 CPUs  → 9 workers
  Ajuste conforme: nproc --all
"""
import multiprocessing

# ─── Workers ─────────────────────────────────────────────────
# Múltiplos workers permitem processar requisições em paralelo.
# Com blocking I/O (mysql.connector sync), cada worker fica bloqueado
# enquanto aguarda o banco — workers extras garantem que outros
# requests não fiquem na fila.
workers = (multiprocessing.cpu_count() * 2) + 1

# Uvicorn worker class — compatível com FastAPI/ASGI
worker_class = "uvicorn.workers.UvicornWorker"

# ─── Binding ─────────────────────────────────────────────────
# Mantém o mesmo host:porta do serviço Uvicorn original (127.0.0.1:8001)
bind = "127.0.0.1:8001"

# ─── Timeouts ────────────────────────────────────────────────
# 120s para endpoints pesados (LCI report, dashboard)
# Reduzir para 60s após cache ser implementado
timeout = 120
keepalive = 5

# ─── Logging ─────────────────────────────────────────────────
accesslog = "-"         # stdout
errorlog  = "-"         # stderr
loglevel  = "info"

# ─── Graceful shutdown ───────────────────────────────────────
graceful_timeout = 30
max_requests = 1000          # recicla workers após N requests (evita memory leaks)
max_requests_jitter = 100    # randomiza reciclagem para evitar reinício simultâneo
