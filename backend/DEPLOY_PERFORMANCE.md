# Deploy — Otimizações de Performance

## Pré-requisitos

```bash
# No servidor Linux (CentOS), dentro do diretório do backend:
cd /opt/bridgeadoption-react/backend   # ajustar para o path real
source venv/bin/activate
```

---

## 1. Instalar dependências novas

```bash
pip install cachetools==5.5.0 gunicorn==22.0.0
# ou via requirements:
pip install -r requirements.txt
```

---

## 2. Aplicar índices no MariaDB

> **Atenção:** executar em janela de manutenção (pode haver lock breve nas tabelas).

```bash
mysql -u <user> -p <database> < migrations/performance_indexes.sql
```

---

## 3. Reiniciar o backend com Gunicorn (múltiplos workers)

### Opção A — Substituição direta do processo Uvicorn

```bash
# Parar o processo atual (verificar como está sendo executado):
# ps aux | grep uvicorn
# kill -TERM <PID>

# Iniciar com Gunicorn + múltiplos workers:
gunicorn app.main:app -c gunicorn.conf.py
```

### Opção B — Se usar systemd

Editar o arquivo de serviço (ex: `/etc/systemd/system/bridgeadoption-api.service`):

```ini
[Unit]
Description=Bridge Adoption API
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/bridgeadoption-react/backend
Environment=PATH=/opt/bridgeadoption-react/backend/venv/bin
ExecStart=/opt/bridgeadoption-react/backend/venv/bin/gunicorn app.main:app -c gunicorn.conf.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl restart bridgeadoption-api
systemctl status bridgeadoption-api
```

### Opção C — Se usar Apache mod_proxy (atual)

O Apache já lida com múltiplos requests — garantir que o ProxyPass aponta para 8000
e que o Gunicorn está ouvindo em `0.0.0.0:8000`.

```apache
ProxyPass /api http://127.0.0.1:8000/api
ProxyPassReverse /api http://127.0.0.1:8000/api
```

---

## 4. Verificar workers ativos

```bash
ps aux | grep gunicorn
# Deve mostrar N+1 processos (1 master + N workers)
```

---

## 5. Build e deploy do frontend

```bash
cd /opt/bridgeadoption-react/frontend
npm run build
# Copiar dist/ para o DocumentRoot do Apache
```

---

## 6. Monitorar após deploy

```bash
# Consumo de memória (deve cair significativamente com o cache):
watch -n 5 'ps aux | grep -E "gunicorn|uvicorn" | grep -v grep'

# I/O wait (deve cair de 23% para < 5%):
watch -n 2 'vmstat 1 3'

# Slow queries MariaDB:
mysql -u root -p -e "SHOW GLOBAL STATUS LIKE 'Slow_queries';"

# Logs da API:
journalctl -u bridgeadoption-api -f
```

---

## O que foi alterado

| Arquivo | Mudança |
|---|---|
| `src/infrastructure/database/connection.py` | Connection pool MySQL (pool_size=10) |
| `backend/app/core/database.py` | Connection pool MySQL (pool_size=10) |
| `backend/requirements.txt` | Adicionado `cachetools==5.5.0` |
| `backend/app/tasks/service.py` | Cache TTL 2min + endpoint unificado `/dashboard` + fix `_serialize_row` |
| `backend/app/tasks/router.py` | Novo endpoint `GET /api/tasks/dashboard` |
| `frontend/src/api/tasks.ts` | Novo método `getDashboard()` |
| `frontend/src/pages/tasks/TaskPage.tsx` | 3 queries → 1 query unificada |
| `backend/app/adoption/cisco_lci_service.py` | Cache TTL 5min + vectorização pandas + endpoint unificado |
| `backend/app/adoption/cisco_lci_router.py` | Novo endpoint `GET /api/adoption/cisco-lci/report-data` |
| `frontend/src/api/ciscoLci.ts` | Novo método `getReportData()` |
| `frontend/src/pages/ciscoLci/CiscoLCIReportPage.tsx` | 7 queries → 1 query unificada |
| `backend/migrations/performance_indexes.sql` | Índices nas tabelas tbTask e tbTaskActivity |
| `backend/gunicorn.conf.py` | Configuração Gunicorn com múltiplos workers |

---

## Impacto esperado

| Métrica | Antes | Após Fase 1+2 |
|---|---|---|
| Queries DB por abertura de Tasks | 6 | 2 (cache hit: 0) |
| Queries DB por abertura Cisco LCI | ~13 | 2 (cache hit: 0) |
| Conexões TCP ao MariaDB por request | 6-13 novas | Pool reutiliza |
| Tempo de resposta (2ª+ request) | segundos | < 50ms (cache) |
| RAM do processo Python | ~12GB | ~2-4GB |
| I/O Wait CPU | ~23% | < 5% |
