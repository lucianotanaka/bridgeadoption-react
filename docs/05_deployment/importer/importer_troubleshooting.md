# Importer — Guia de Troubleshooting

> **Para:** Time de Sustentação / Operações
> **Última atualização:** 2026-08-16

---

## Árvore de diagnóstico rápido

```
Importação com problema?
│
├─ Status PENDING há > 10 min?
│   └─ → Cron não está rodando (seção 1)
│
├─ Status RUNNING há > 1 hora?
│   └─ → Script travado (seção 2)
│
├─ Status FAILED?
│   └─ → Consultar log na Tab 4 ou seção 3
│
├─ Arquivo não aparece na Tab 3?
│   └─ → Arquivo já foi usado em agendamento anterior (seção 4)
│
├─ Erro "Não foi possível carregar o histórico" na Tab 1?
│   └─ → Backend indisponível ou token expirado (seção 5)
│
└─ Upload falha?
    └─ → Verificar tamanho do arquivo e config do Nginx (seção 6)
```

---

## 1. Importação fica em PENDING

**Sintoma:** Status permanece `PENDING` por mais de 10 minutos após a data/hora agendada.

**Causas e soluções:**

### 1.1 Cron não está rodando

```bash
# Verificar se o cron do usuário bridgeadoption existe
crontab -u bridgeadoption -l

# Verificar se o cron daemon está ativo
systemctl status cron   # Ubuntu/Debian
systemctl status crond  # CentOS/RHEL

# Verificar logs do cron
grep "import_scheduler" /var/log/syslog | tail -20
# ou
journalctl -t CRON | tail -20
```

### 1.2 Cron rodando mas com erro no script

```bash
# Verificar log do scheduler
tail -50 /var/log/bridgeadoption/cron_scheduler.log

# Executar manualmente para ver o erro
sudo -u bridgeadoption /opt/bridgeadoption/venv/bin/python \
    /opt/bridgeadoption/scripts/import_scheduler.py
```

### 1.3 Data/hora agendada ainda não chegou

Verificar o valor de `importctrl_started` em relação ao horário atual do servidor:

```sql
SELECT
    importctrl_id,
    importctrl_source,
    importctrl_file,
    importctrl_status,
    importctrl_started,
    NOW() AS hora_atual_servidor,
    TIMEDIFF(importctrl_started, NOW()) AS diferenca
FROM tbImportControl
WHERE importctrl_status = 'PENDING'
ORDER BY importctrl_started;
```

> **Atenção:** Se `importctrl_started` for no futuro, a importação aguarda. Verifique se o timezone do servidor está configurado corretamente.

### 1.4 Arquivo não encontrado pelo script

```bash
# Verificar se o arquivo existe na pasta de input
ls -la /home/bridgeadoption/storage/input/
```

---

## 2. Importação travada em RUNNING

**Sintoma:** Status permanece `RUNNING` por mais de 1 hora.

### 2.1 Verificar processo ativo

```bash
# Verificar processos Python rodando
ps aux | grep import_scheduler

# Verificar logs em tempo real
tail -f /home/bridgeadoption/storage/logs/<nome_do_arquivo>.log
```

### 2.2 Forçar reset manual (emergência)

```sql
-- ATENÇÃO: só executar se tiver certeza que o processo não está ativo
UPDATE tbImportControl
SET importctrl_status = 'FAILED',
    importctrl_message = 'Reset manual por sustentação - processo travado',
    importctrl_ended   = NOW()
WHERE importctrl_id = <ID_DA_IMPORTACAO>
  AND importctrl_status = 'RUNNING';
```

Após o reset, o usuário poderá fazer novo upload e agendamento.

---

## 3. Importação com status FAILED

### 3.1 Consultar mensagem de erro via UI

1. Acessar o sistema: **Menu → Public → Importer**
2. Ir para **Tab 4 — Detalhes / arquivos de erro**
3. Selecionar a importação com falha no dropdown
4. Clicar em **📄 Log (.log)** para ver o log completo
5. Clicar em **⚠️ Linhas com falha (.xlsx)** para ver as linhas problemáticas

### 3.2 Consultar diretamente no servidor

```bash
# Log da importação (substituir pelo stem do arquivo)
cat /home/bridgeadoption/storage/logs/<nome_sem_extensao>.log

# Arquivo de falhas
ls -la /home/bridgeadoption/storage/output/<nome_sem_extensao>_failed_rows.xlsx
```

### 3.3 Erros comuns e soluções

| Mensagem no Log | Causa | Solução |
|-----------------|-------|---------|
| `Connection refused` / `Unable to connect` | API Cisco indisponível | Aguardar disponibilidade e reagendar |
| `Invalid file format` / `xlrd error` | Arquivo xlsx corrompido ou formato incorreto | Solicitar novo arquivo ao solicitante |
| `Column not found: <COLUNA>` | Arquivo com colunas diferentes do esperado | Verificar template correto com o fornecedor |
| `Database error` / `MySQL error` | Problema no banco de dados | Verificar conexão do banco (`journalctl -u bridgeadoption-backend`) |
| `File not found: /home/bridgeadoption/storage/input/<arquivo>` | Arquivo foi removido antes da execução | Fazer novo upload e reagendar |
| `Permission denied` | Problema de permissão no diretório de storage | `chown -R bridgeadoption:bridgeadoption /home/bridgeadoption/storage` |

### 3.4 Reagendar após FAILED

Após identificar e resolver a causa:

1. Se o arquivo ainda está em `storage/input/` e o erro era externo (API Cisco):
   - A importação já usada **não aparecerá** no dropdown da Tab 3 (foi "consumida")
   - Fazer **novo upload** do mesmo arquivo via Tab 2
   - Agendar novamente via Tab 3

2. Se o arquivo foi corrompido ou precisa de ajuste:
   - Solicitar arquivo corrigido ao fornecedor
   - Fazer upload do novo arquivo via Tab 2
   - Agendar via Tab 3

---

## 4. Arquivo não aparece no seletor da Tab 3

**Causa:** Arquivo já foi utilizado em pelo menos um agendamento (independente do status atual).

**Verificar:**

```sql
-- Listar todos os agendamentos para um arquivo específico
SELECT *
FROM tbImportControl
WHERE importctrl_file LIKE '%nome_do_arquivo%'
ORDER BY importctrl_started DESC;
```

**Solução:** Fazer upload de um novo arquivo via Tab 2. O novo arquivo aparecerá no seletor da Tab 3.

> **Nota de design:** Esta restrição é intencional para evitar a importação duplicada do mesmo arquivo. Cada arquivo deve ser importado apenas uma vez.

---

## 5. Erro "Não foi possível carregar o histórico" (Tab 1)

### 5.1 Verificar autenticação

- Tentar fazer logout e login novamente
- Verificar se o token JWT não expirou (padrão: 8 horas)

### 5.2 Verificar backend

```bash
# Status do serviço
systemctl status bridgeadoption-backend

# Verificar se o endpoint responde
curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:8000/api/public/importer/history \
    -H "Authorization: Bearer <token>"
# Espera: 200 ou 401 (se token inválido)
# Problema: 404, 500, ou timeout

# Logs recentes
journalctl -u bridgeadoption-backend --since "30 minutes ago" | grep -i "error\|exception"
```

### 5.3 Reiniciar backend

```bash
systemctl restart bridgeadoption-backend
# Aguardar ~10 segundos e tentar novamente na UI
```

---

## 6. Upload falha

### 6.1 Erro de tamanho (413 Request Entity Too Large)

```bash
# Verificar configuração do Nginx
grep -r "client_max_body_size" /etc/nginx/

# A configuração deve ter >= 55M no bloco do API
# Se não tiver, adicionar:
# client_max_body_size 55M;

nginx -t && systemctl reload nginx
```

### 6.2 Erro de permissão no servidor

```bash
# Verificar permissões do diretório de input
ls -la /home/bridgeadoption/storage/input/

# Corrigir se necessário
chown bridgeadoption:bridgeadoption /home/bridgeadoption/storage/input
chmod 750 /home/bridgeadoption/storage/input
```

### 6.3 Disco cheio

```bash
# Verificar espaço em disco
df -h /home/bridgeadoption/storage/

# Listar arquivos grandes em storage/input
du -sh /home/bridgeadoption/storage/input/* | sort -hr | head -20

# Remover arquivos antigos (ATENÇÃO: verificar se não são necessários)
# Apenas arquivos que já foram processados (FINISHED) e não precisam mais ser mantidos
```

---

## 7. Limpeza de dados históricos

### 7.1 Remover registros antigos de tbImportControl

```sql
-- Visualizar registros candidatos à limpeza (mais de 90 dias, status FINISHED)
SELECT COUNT(*), MIN(importctrl_ended), MAX(importctrl_ended)
FROM tbImportControl
WHERE importctrl_status = 'FINISHED'
  AND importctrl_ended < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Executar limpeza (com cuidado)
DELETE FROM tbImportControl
WHERE importctrl_status IN ('FINISHED', 'CANCELLED')
  AND importctrl_ended < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### 7.2 Limpar arquivos de storage

```bash
# Arquivos de input com mais de 30 dias (verificar antes de deletar)
find /home/bridgeadoption/storage/input/ -name "*.xlsx" -mtime +30 -ls

# Arquivos de log com mais de 60 dias
find /home/bridgeadoption/storage/logs/ -name "*.log" -mtime +60 -ls

# Deletar (só após confirmar que não são necessários)
find /home/bridgeadoption/storage/logs/ -name "*.log" -mtime +60 -delete
find /home/bridgeadoption/storage/output/ -name "*_failed_rows.xlsx" -mtime +60 -delete
```

---

## 8. Contatos e escalação

| Nível | Responsável | Quando acionar |
|-------|-------------|----------------|
| L1 | Time de Sustentação | Problemas de uso, reagendamentos |
| L2 | Time de Backend | Erros de API, banco, backend down |
| L3 | Time de DevOps | Problemas de infra, cron, servidor |

---

## 9. Referências

- Documentação da funcionalidade: [`docs/02_application/public/importer.md`](../../02_application/public/importer.md)
- Referência de API: [`docs/07_api/public_endpoints.md`](../../07_api/public_endpoints.md)
- Visão geral de implantação: [`docs/05_deployment/importer/importer_overview.md`](./importer_overview.md)
