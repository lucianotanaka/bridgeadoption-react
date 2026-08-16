# Importer — Visão Geral de Implantação

> **Para:** Time de Implantação / DevOps
> **Última atualização:** 2026-08-16

---

## 1. Arquitetura

O sistema de importação é composto de três camadas:

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                        │
│  ImporterPage.tsx → apiClient → /api/public/importer/*  │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP (JWT)
┌──────────────────────▼───────────────────────────────────┐
│  BACKEND (FastAPI)                                       │
│  public_router.py + importer_router.py                  │
│  public_service.py                                       │
│  → lê/escreve em tbImportControl (MySQL)                │
│  → salva uploads em /home/bridgeadoption/storage/input/ │
└──────────────────────┬───────────────────────────────────┘
                       │ lê tbImportControl
┌──────────────────────▼───────────────────────────────────┐
│  CRON (Linux)                                            │
│  Script Python executado periodicamente                  │
│  → lê registros PENDING, executa importação             │
│  → grava logs em storage/logs/                          │
│  → grava falhas em storage/output/                      │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Pré-requisitos

### 2.1 Diretórios de storage

Criar e configurar os diretórios de armazenamento no servidor Linux:

```bash
# Criar diretórios
mkdir -p /home/bridgeadoption/storage/input
mkdir -p /home/bridgeadoption/storage/logs
mkdir -p /home/bridgeadoption/storage/output

# Definir owner (usuário do processo backend)
chown -R bridgeadoption:bridgeadoption /home/bridgeadoption/storage

# Permissões dos diretórios
chmod 750 /home/bridgeadoption/storage
chmod 750 /home/bridgeadoption/storage/input
chmod 750 /home/bridgeadoption/storage/logs
chmod 750 /home/bridgeadoption/storage/output
```

### 2.2 Tabela do banco de dados

Executar o DDL abaixo no banco MySQL/MariaDB `bridgeadoption`:

```sql
CREATE TABLE IF NOT EXISTS tbImportControl (
    importctrl_id        INT AUTO_INCREMENT PRIMARY KEY,
    importctrl_source    VARCHAR(100)  NOT NULL,
    importctrl_file      VARCHAR(255)  NOT NULL,
    importctrl_status    ENUM('PENDING','RUNNING','FINISHED','FAILED','CANCELLED')
                         NOT NULL DEFAULT 'PENDING',
    importctrl_message   TEXT          NULL,
    importctrl_started   DATETIME      NULL,
    importctrl_ended     DATETIME      NULL,
    importctrl_started_by VARCHAR(100) NULL,
    INDEX idx_status     (importctrl_status),
    INDEX idx_source     (importctrl_source),
    INDEX idx_started    (importctrl_started)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.3 Permissão de acesso na RBAC

Cadastrar a permissão `public.importer` no sistema:

```sql
-- 1. Inserir resource (se não existir)
INSERT IGNORE INTO tbAuthResource (resource_key, resource_name, resource_icon, resource_active)
VALUES ('public.importer', 'Public - Importer', 'Upload', 1);

-- 2. Inserir action (se não existir)
INSERT IGNORE INTO tbAuthAction (action_key, action_name)
VALUES ('view', 'Visualizar');

-- 3. Atribuir à role desejada (ex.: role_id = ID da role OPERATION)
INSERT INTO tbAuthPermission (user_role_id, resource_id, action_id)
SELECT <role_id>,
       (SELECT resource_id FROM tbAuthResource WHERE resource_key = 'public.importer'),
       (SELECT action_id   FROM tbAuthAction   WHERE action_key   = 'view');
```

---

## 3. Configuração do backend

### 3.1 Routers registrados em `main.py`

Confirmar que os seguintes imports e includes estão presentes em `backend/app/main.py`:

```python
from app.modules.public_router import public_router, importer_router

app.include_router(public_router)
app.include_router(importer_router)
```

### 3.2 Arquivo de serviço

O serviço do backend é registrado como systemd unit:

```bash
# Verificar status
systemctl status bridgeadoption-backend

# Reiniciar após deploy
systemctl restart bridgeadoption-backend

# Ver logs
journalctl -u bridgeadoption-backend -f
```

---

## 4. Configuração do Cron

O cron é responsável por processar os registros `PENDING` da `tbImportControl`.

### 4.1 Entrada no crontab

```bash
# Editar crontab do usuário bridgeadoption
crontab -u bridgeadoption -e

# Executar o scheduler a cada 5 minutos
*/5 * * * * /opt/bridgeadoption/venv/bin/python /opt/bridgeadoption/scripts/import_scheduler.py >> /var/log/bridgeadoption/cron_scheduler.log 2>&1
```

### 4.2 Comportamento do script de cron

O script `import_scheduler.py` deve:

1. Consultar `tbImportControl` por registros com `status = 'PENDING'` e `importctrl_started <= NOW()`
2. Para cada registro encontrado:
   - Atualizar `status` para `RUNNING`
   - Executar o importador correspondente ao `importctrl_source`
   - Ao concluir: atualizar `status` para `FINISHED` ou `FAILED`
   - Gravar `importctrl_message` com resumo/erro
   - Gravar `importctrl_ended` com o timestamp de conclusão
3. Gravar log em `/home/bridgeadoption/storage/logs/{importctrl_file_stem}.log`
4. Em caso de linhas com erro: salvar em `/home/bridgeadoption/storage/output/{importctrl_file_stem}_failed_rows.xlsx`

### 4.3 Proteção contra execuções paralelas

Para evitar que múltiplas instâncias do cron processem o mesmo registro:

```sql
-- O script deve usar UPDATE com WHERE status='PENDING' para "reservar" o registro atomicamente
UPDATE tbImportControl
SET importctrl_status = 'RUNNING',
    importctrl_started = NOW()
WHERE importctrl_id = %s
  AND importctrl_status = 'PENDING';
-- Verificar rows_affected: se 0, outro processo já pegou o registro
```

---

## 5. Nginx — Upload multipart

O Nginx precisa permitir uploads de até 50 MB. Verificar a configuração:

```nginx
# Em /etc/nginx/sites-available/bridgeadoption (ou equivalente)
location /bridgeadoption/api/ {
    proxy_pass http://127.0.0.1:8000/;
    client_max_body_size 55M;   # ← deve ser >= 50MB (limite da aplicação)
    proxy_read_timeout 120s;
    proxy_connect_timeout 30s;
}
```

Após alterar, recarregar o Nginx:

```bash
nginx -t && systemctl reload nginx
```

---

## 6. Deploy — Checklist

Use este checklist a cada deploy que inclua mudanças no módulo Importer:

- [ ] Diretórios de storage criados e com permissões corretas
- [ ] Tabela `tbImportControl` existe no banco (executar DDL se necessário)
- [ ] Permissão `public.importer` cadastrada em `tbAuthResource` e `tbAuthPermission`
- [ ] `public_router` e `importer_router` incluídos em `main.py`
- [ ] Backend reiniciado: `systemctl restart bridgeadoption-backend`
- [ ] Nginx com `client_max_body_size 55M`
- [ ] Nginx recarregado: `systemctl reload nginx`
- [ ] Cron configurado com entrada para `import_scheduler.py`
- [ ] Testar upload de arquivo via UI (Tab 2)
- [ ] Testar agendamento via UI (Tab 3)
- [ ] Verificar histórico na Tab 1

---

## 7. Monitoramento

### 7.1 Verificar importações pendentes acumuladas

```sql
SELECT
    importctrl_source,
    COUNT(*) AS total,
    MIN(importctrl_started) AS mais_antiga
FROM tbImportControl
WHERE importctrl_status IN ('PENDING', 'RUNNING')
GROUP BY importctrl_source
ORDER BY mais_antiga;
```

### 7.2 Verificar últimas falhas

```sql
SELECT
    importctrl_id,
    importctrl_source,
    importctrl_file,
    importctrl_status,
    importctrl_message,
    importctrl_started,
    importctrl_ended,
    importctrl_started_by
FROM tbImportControl
WHERE importctrl_status = 'FAILED'
ORDER BY importctrl_ended DESC
LIMIT 20;
```

### 7.3 Logs do backend

```bash
# Logs do serviço FastAPI
journalctl -u bridgeadoption-backend --since "1 hour ago" | grep -i "importer\|public_router\|public_service"

# Logs do cron scheduler
tail -f /var/log/bridgeadoption/cron_scheduler.log

# Logs de uma importação específica (ex.: arquivo tasks_agosto.xlsx)
cat /home/bridgeadoption/storage/logs/tasks_agosto.log
```

---

## 8. Referências

- Documentação da funcionalidade: [`docs/02_application/public/importer.md`](../../02_application/public/importer.md)
- Referência de API: [`docs/07_api/public_endpoints.md`](../../07_api/public_endpoints.md)
- Guia de troubleshooting: [`docs/05_deployment/importer/importer_troubleshooting.md`](./importer_troubleshooting.md)
- Configuração Nginx: [`docs/04_infrastructure/nginx_reverse_proxy.md`](../../04_infrastructure/nginx_reverse_proxy.md)
