# Cisco LCI — Guia de Implantação e Sustentação

> **Módulo:** Cisco LCI (Life Cycle Incentive)
> **Ambiente:** CentOS 9 + FastAPI + React + SQL Server
> **Última atualização:** 2026-08-16

---

## 1. Componentes do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    SERVIDOR CENTOS 9                     │
│                                                          │
│  ┌─────────────────────┐   ┌───────────────────────┐   │
│  │  Apache HTTPD        │   │  FastAPI Backend       │   │
│  │  /var/www/           │   │  :8001 (uvicorn)       │   │
│  │  bridgeadoption/     │   │                        │   │
│  │  (React dist)        │   │  bridgeadoption-       │   │
│  └──────────┬───────────┘   │  backend.service       │   │
│             │ reverse proxy │  └───────────┬──────────┘  │
│             │  /api/*       │              │              │
│             └───────────────┘              │              │
│                                            │ SQL queries  │
│                                    ┌───────▼──────────┐  │
│                                    │  SQL Server       │  │
│                                    │  (banco Pegasus)  │  │
│                                    └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Localização dos Arquivos no Servidor

| Caminho | Descrição |
|---------|-----------|
| `/opt/bridgeadoption/` | Raiz do repositório |
| `/opt/bridgeadoption/backend/` | Backend FastAPI |
| `/opt/bridgeadoption/backend/app/adoption/cisco_lci_service.py` | Lógica de negócio LCI |
| `/opt/bridgeadoption/backend/app/adoption/cisco_lci_router.py` | Endpoints FastAPI |
| `/opt/bridgeadoption/src/infrastructure/database/repositories/cisco_lci_repository.py` | Repositório DB |
| `/opt/bridgeadoption/frontend/` | Frontend React (fontes) |
| `/opt/bridgeadoption/frontend/dist/` | Build compilado (gerado pelo deploy.sh) |
| `/var/www/bridgeadoption/` | Arquivos servidos pelo Apache |
| `/opt/bridgeadoption/frontend/deploy.sh` | Script de deploy do frontend |
| `/opt/bridgeadoption/frontend/backup_github.sh` | Script de backup/push para GitHub |

---

## 3. Serviços do Sistema

### 3.1 Backend (FastAPI)
```bash
# Verificar status
systemctl status bridgeadoption-backend

# Reiniciar após alterações de backend
systemctl restart bridgeadoption-backend

# Ver logs em tempo real
journalctl -u bridgeadoption-backend -f

# Ver últimas 50 linhas de log
journalctl -u bridgeadoption-backend -n 50
```

### 3.2 Frontend (Apache)
```bash
# Verificar status
systemctl status httpd

# Reiniciar Apache
systemctl restart httpd
```

---

## 4. Deploy

### 4.1 Deploy do Frontend (após mudanças de código React/TypeScript)
```bash
cd /opt/bridgeadoption/frontend
./deploy.sh
```
O script `deploy.sh`:
1. Verifica memória disponível e calcula heap seguro para Node.js
2. Compila o React com `npm run build`
3. Copia `dist/` para `/var/www/bridgeadoption/`
4. Reinicia o Apache

> **Nota:** O build leva aproximadamente 4-5 minutos devido ao tamanho do bundle (Plotly.js ~5MB).

### 4.2 Deploy do Backend (após mudanças Python)
```bash
cd /opt/bridgeadoption
git pull origin main
systemctl restart bridgeadoption-backend
```

### 4.3 Deploy Completo
```bash
cd /opt/bridgeadoption
git pull origin main
systemctl restart bridgeadoption-backend
cd frontend && ./deploy.sh
```

### 4.4 Backup e Sync com GitHub
```bash
cd /opt/bridgeadoption/frontend
./backup_github.sh
```
O script `backup_github.sh`:
1. Faz cópia de segurança do `backend/.env`
2. Executa `git add .` e `git commit` com data/hora
3. Executa `git push origin main`

---

## 5. Configuração do Backend

### 5.1 Variáveis de Ambiente
Localização: `/opt/bridgeadoption/backend/.env`

```env
DATABASE_URL=mssql+pyodbc://user:password@server/database?driver=ODBC+Driver+18+for+SQL+Server
SECRET_KEY=<jwt_secret>
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### 5.2 Dependência do CiscoLCIRepository
O serviço `cisco_lci_service.py` importa `CiscoLCIRepository` de:
```
/opt/bridgeadoption/src/infrastructure/database/repositories/cisco_lci_repository.py
```

Se o repositório não estiver acessível (importação falha), o serviço retorna dados vazios e loga um warning:
```
WARNING: CiscoLCIRepository não disponível: [motivo]
```

---

## 6. Verificação de Saúde do Módulo LCI

### 6.1 Verificar se o backend responde
```bash
curl -s http://127.0.0.1:8001/api/adoption/cisco-lci/fiscal-years \
  -H "Authorization: Bearer <token>" | python3 -m json.tool
```

Resposta esperada: `[2025, 2026]`

### 6.2 Verificar logs de erro do LCI
```bash
journalctl -u bridgeadoption-backend -n 100 | grep -i "lci\|cisco\|repository"
```

### 6.3 Verificar se o repositório carrega corretamente
```bash
cd /opt/bridgeadoption
python3 -c "
from src.infrastructure.database.repositories.cisco_lci_repository import CiscoLCIRepository
repo = CiscoLCIRepository()
rows = repo.find_all(task_eligible='Y', as_df=False)
print(f'Estágios encontrados: {len(rows)}')
"
```

---

## 7. Troubleshooting Comum

### 7.1 Dados LCI não aparecem no painel

**Diagnóstico:**
```bash
# 1. Verificar se o serviço está rodando
systemctl status bridgeadoption-backend

# 2. Verificar logs
journalctl -u bridgeadoption-backend -n 50 | grep -i "error\|lci"

# 3. Testar endpoint direto
curl -s "http://127.0.0.1:8001/api/adoption/cisco-lci/summary?fy=2026" \
  -H "Authorization: Bearer <token>"
```

**Causas comuns:**
- Backend não reiniciado após mudança de código
- `CiscoLCIRepository` não consegue conectar ao banco
- Token expirado (verificar `ACCESS_TOKEN_EXPIRE_MINUTES`)

### 7.2 Cards KPI zerados

**Verificar:**
1. Se há dados no banco para o FY selecionado
2. Se `lci_effective_fy` está sendo calculado corretamente:
```bash
cd /opt/bridgeadoption
python3 -c "
from src.infrastructure.database.repositories.cisco_lci_repository import CiscoLCIRepository
repo = CiscoLCIRepository()
rows = repo.load_cisco_lci_all(fy=2026, as_df=False)
print(f'Tarefas FY2026: {len(rows)}')
if rows:
    print('Exemplo:', dict(rows[0]))
"
```

### 7.3 Valores inconsistentes entre abas

Se Cisco LCI Report e Portfolio Burndown mostram valores diferentes:
- **KPI cards**: devem ser iguais (ambos usam `lci_effective_fy`)
- **Gráficos temporais**: podem diferir (usam `stage_start_date` / `approval_date`)

Verificar no frontend se `fy` está sendo passado ao endpoint `/wallet-burndown`.

### 7.4 Build do Frontend falha por memória

```bash
# Verificar memória disponível
free -m

# O script deploy.sh gerencia automaticamente o heap do Node.
# Se ainda falhar, adicionar mais swap:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 7.5 Labels exibindo chave bruta (ex: `adoption.ciscoLci.portfolioBurndown`)

Indica que as chaves i18n não foram adicionadas aos arquivos de locale:
```bash
cd /opt/bridgeadoption
python3 add_i18n_keys.py
```
Depois: `cd frontend && ./deploy.sh`

---

## 8. Manutenção Regular

### 8.1 Atualizar dados LCI
Os dados vêm do banco SQL Server via `CiscoLCIRepository`. A atualização é automática a cada consulta (sem cache no backend). Se os dados não refletem o que está no banco, verificar:
1. Conexão com SQL Server
2. Se as views `vwCustomerCiscoLCIDealTrackProjectStatus` e `vwCustomerCiscoLCITrackProjectPM` estão atualizadas

### 8.2 Adicionar novo Ano Fiscal
O FY é detectado automaticamente com base nos dados disponíveis. Novos FYs aparecem automaticamente no seletor quando dados do novo período chegam ao banco.

Se necessário forçar a inclusão de um FY específico, ajustar a função `get_lci_fiscal_years()` em `cisco_lci_service.py`.

### 8.3 Cache do Frontend (React Query)
O frontend usa React Query com `staleTime: 5 minutos`. Para forçar atualização dos dados:
- Usuário pode clicar no botão **Refresh** (se disponível)
- Ou recarregar a página com `Ctrl+Shift+R` (hard refresh)

---

## 9. Histórico de Evolução do Módulo

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-08-16 | v2.5 | Documentação criada/atualizada |
| 2026-08-14 | v2.5 | KPIs do Portfolio Burndown alinhados ao Cisco LCI Report (fy_summary) |
| 2026-08-14 | v2.4 | Tabela Portfolio Burndown com Export Excel; FROM default = Abril do FY vigente |
| 2026-08-13 | v2.3 | Aba Portfolio Burndown criada com gráficos e KPIs |
| 2026-08-13 | v2.2 | Colunas "Task WS", "Activity WS", "Start Date" adicionadas à tabela de estágios |
| 2026-08-13 | v2.1 | Internacionalização (EN/PT/ES) com tooltips "?" em todos os cards e gráficos |
| 2026-08-01 | v2.0 | Migração Streamlit → React: redesign completo do módulo |

---

## 10. Referências

- **Documentação do módulo:** `docs/02_application/adoption/cisco_lci.md`
- **Regras de negócio:** `docs/02_application/adoption/cisco_lci_business_rules.md`
- **API endpoints:** `docs/07_api/cisco_lci_endpoints.md`
- **Views do banco:** `docs/03_database/vwCustomerCiscoLCIDealTrackProjectStatus.md`
- **Arquitetura geral:** `docs/01_architecture/architecture_overview.md`
- **Segurança/RBAC:** `docs/06_security/authorization_rbac.md`
