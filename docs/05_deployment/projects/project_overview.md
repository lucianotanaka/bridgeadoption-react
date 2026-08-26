# Deploy — Módulo Projects (v4)

> **Última atualização:** 2026-08-26 (v5: OV Search, direct SQL, Account Team em modo OV, service name corrigido)  
> **Versão:** v5 — CRUD completo + busca por OV  
> **Audiência:** Time de implementação e sustentação

---

## Visão geral

O módulo Projects v4 introduziu as seguintes funcionalidades que requerem deploy coordenado:

| Funcionalidade | Arquivo(s) alterado(s) | Impacto |
|---|---|---|
| **v5** OV Search global (texto + botão) | `frontend/src/pages/projects/ProjectsPage.tsx` | Frontend |
| **v5** OV Filter (select por cliente) | `frontend/src/pages/projects/ProjectsPage.tsx` | Frontend |
| **v5** Account Team em modo OV (derivedCustomerId) | `frontend/src/pages/projects/ProjectsPage.tsx` | Frontend |
| **v5** `get_projects(ov_search)` direct SQL | `backend/app/modules/sections_service.py` | Backend React |
| CUSTOMER dropdown — todos os clientes | `frontend/src/pages/projects/ProjectsPage.tsx` | Frontend |
| STATUS filtro dentro do PROJECT DETAIL | `frontend/src/pages/projects/ProjectsPage.tsx` | Frontend |
| Formulário Editar/Adicionar Projeto | `frontend/src/pages/projects/ProjectsPage.tsx` | Frontend |
| Normalização de OV + sync tbProjectOV | `src/.../project_repository.py` | Backend Legado |
| GET /departments — direct SQL | `backend/app/modules/sections_service.py` | Backend React |
| GET /levels — direct SQL | `backend/app/modules/sections_service.py` | Backend React |
| GET /persons, GET /{id}/detail | `backend/app/modules/sections_service.py` + router | Backend React |
| POST/PUT /projects | `backend/app/modules/sections_service.py` + router | Backend React |
| POST/PUT/DELETE /team-member | `backend/app/modules/sections_service.py` + router | Backend React |
| i18n: 16 novas chaves | `frontend/src/i18n/locales/{en,pt,es}.json` | Frontend |

---

## Pré-requisitos

### Banco de dados

Verificar que as seguintes tabelas/views existem:

```sql
-- Verificar tabelas
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'bridgeadoption'
  AND TABLE_NAME IN ('tbProject', 'tbProjectOV', 'tbProjectTeam',
                     'tbDepartment', 'tbResourceLevel', 'tbPerson');

-- Verificar views
SHOW TABLES LIKE 'vwProject%';
-- Deve retornar: vwProject, vwProjectTeam

-- Verificar dados em tbDepartment
SELECT COUNT(*) FROM tbDepartment;
-- Esperado: > 0 (≈40 registros conforme AUTO_INCREMENT=40)

-- Verificar dados em tbResourceLevel
SELECT COUNT(*) FROM tbResourceLevel;
-- Esperado: > 0 (≈67 registros conforme AUTO_INCREMENT=68)
```

### Permissão ADMIN

Os endpoints de criação/edição de membros verificam role ADMIN. Confirmar que o usuário testador tem role ADMIN:

```sql
SELECT u.user_name, r.role_name
FROM tbUser u
JOIN tbUserRole ur ON ur.userrole_user_id = u.user_id
JOIN tbRole r ON r.role_id = ur.userrole_role_id
WHERE u.user_email = 'usuario@nttdata.com'
  AND r.role_name = 'ADMIN';
```

---

## Arquivos a deployar

### 1. Backend React (`sections_service.py` + `sections_router.py`)

**Origem (repositório):**
```
backend/app/modules/sections_service.py
backend/app/modules/sections_router.py
```

**Destino (servidor):**
```
/opt/bridge-adoption-react/backend/app/modules/sections_service.py
/opt/bridge-adoption-react/backend/app/modules/sections_router.py
```

**Por que é necessário:**
- `sections_service.py`: Novas funções `get_resource_levels()`, `search_project_persons()`, `save_project_team_member()`, `delete_project_team_member()`, e reescrita de `get_departments()` / `get_resource_levels()` com direct SQL
- `sections_router.py`: 9 novos endpoints registrados

### 2. ProjectRepository (`project_repository.py`)

**Origem (repositório):**
```
z:\bridgeadoption\src\infrastructure\database\repositories\project_repository.py
```

**Destino (servidor):**
```
/opt/bridgeadoption/src/infrastructure/database/repositories/project_repository.py
```

**Por que é necessário:**
- Novos métodos: `get_resource_levels()`, `add_project_team_member()`, `update_project_team_member()`, `remove_project_team_member()`
- `create_project()` passa a delegar para `insert()` (normalização OV + sync tbProjectOV)
- `update_project()` agora normaliza OV e sincroniza `tbProjectOV`

> **Nota de segurança:** `get_departments()` e `get_resource_levels()` em `sections_service.py` usam direct SQL e **não dependem** deste arquivo. Funcionam imediatamente após o restart do Gunicorn sem necessitar do `project_repository.py` atualizado. Os endpoints de CRUD de projeto e equipe, porém, dependem.

### 3. Frontend (build + static files)

**Arquivos alterados:**
```
frontend/src/pages/projects/ProjectsPage.tsx
frontend/src/i18n/locales/en.json
frontend/src/i18n/locales/pt.json
frontend/src/i18n/locales/es.json
```

**Processo:**
```bash
cd frontend
npm run build
# Resultado em: frontend/dist/ ou frontend/build/
# Copiar para o diretório estático do servidor
```

---

## Procedimento de deploy

### Passo 1 — Deploy do backend

```bash
# No servidor de produção

# 1a. Backup dos arquivos atuais
cp /opt/bridge-adoption-react/backend/app/modules/sections_service.py \
   /opt/bridge-adoption-react/backend/app/modules/sections_service.py.bak.$(date +%Y%m%d)

cp /opt/bridge-adoption-react/backend/app/modules/sections_router.py \
   /opt/bridge-adoption-react/backend/app/modules/sections_router.py.bak.$(date +%Y%m%d)

cp /opt/bridgeadoption/src/infrastructure/database/repositories/project_repository.py \
   /opt/bridgeadoption/src/infrastructure/database/repositories/project_repository.py.bak.$(date +%Y%m%d)

# 1b. Copiar novos arquivos
cp sections_service.py /opt/bridge-adoption-react/backend/app/modules/
cp sections_router.py  /opt/bridge-adoption-react/backend/app/modules/
cp project_repository.py /opt/bridgeadoption/src/infrastructure/database/repositories/

# 1c. Reiniciar Gunicorn
sudo systemctl restart bridgeadoption-backend.service

# 1d. Aguardar inicialização (≈5s) e verificar
sudo systemctl status bridgeadoption-backend.service
sudo journalctl -u bridgeadoption-backend.service -n 50
```

### Passo 2 — Verificar endpoints

```bash
TOKEN="seu_jwt_token_aqui"
BASE="http://172.30.100.3/bridgeadoption/api"

# departments (deve retornar lista não vazia)
curl -s "$BASE/projects/departments" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} departments')"

# levels (deve retornar ≈67)
curl -s "$BASE/projects/levels" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} levels')"

# persons search
curl -s "$BASE/projects/persons?search=joao" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} persons')"

# projects de um cliente
curl -s "$BASE/projects?customer_id=213" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} projects')"
```

### Passo 3 — Deploy do frontend

```bash
# Build local
cd frontend
npm run build

# Copiar para servidor (ajustar conforme configuração do servidor)
rsync -av dist/ usuario@servidor:/var/www/bridgeadoption/
# ou
scp -r dist/* usuario@servidor:/var/www/bridgeadoption/
```

### Passo 4 — Smoke test funcional

1. Acessar `http://172.30.100.3/bridgeadoption/projects`
2. Verificar que o CUSTOMER dropdown carrega (deve mostrar **todos** os clientes, não só os com projetos)
3. **Testar OV Search (sem cliente):**
   - Digitar `81822` no campo OV Search
   - Clicar no botão **Search**
   - Deve retornar o projeto "Cotação Horizon" do BANCO BRADESCO
   - Account Team do BANCO BRADESCO deve aparecer automaticamente
4. Selecionar um cliente → verificar Account Team panel
5. Verificar que o **OV Filter** (select) aparece com as OVs do cliente
6. Verificar que o STATUS está no header do PROJECT DETAIL (não no painel superior)
7. Clicar em ✏️ em um projeto → verificar que o formulário abre com os dados preenchidos
8. Clicar em uma linha → selecionar projeto → verificar botão "+ Add Member" no header do PROJECT TEAM
9. Clicar em ✏️ em um membro → verificar que:
   - Nome aparece **uma vez** como read-only
   - Select Level tem opções carregadas
10. Testar criação de novo projeto (botão "+ Add Project")

### Diagnóstico OV Search

```bash
# Testar busca por OV diretamente na API
curl -s "http://172.30.100.3/bridgeadoption/api/projects?ov_search=81822" \
  -H "Authorization: Bearer {TOKEN}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} projects, first={d[0][\"project_ov\"] if d else None}')"

# Verificar no banco
mysql -u user -p bridgeadoption -e "SELECT ov_project_id, ov_project_ov FROM tbProjectOV WHERE ov_project_ov = '81822';"
```

---

## Rollback

```bash
# Restaurar backups
cp /opt/bridge-adoption-react/backend/app/modules/sections_service.py.bak.YYYYMMDD \
   /opt/bridge-adoption-react/backend/app/modules/sections_service.py

cp /opt/bridge-adoption-react/backend/app/modules/sections_router.py.bak.YYYYMMDD \
   /opt/bridge-adoption-react/backend/app/modules/sections_router.py

cp /opt/bridgeadoption/src/infrastructure/database/repositories/project_repository.py.bak.YYYYMMDD \
   /opt/bridgeadoption/src/infrastructure/database/repositories/project_repository.py

# Reiniciar
sudo systemctl restart bridgeadoption-backend.service

# Restaurar frontend anterior (se houver backup do dist/)
```

---

## Troubleshooting pós-deploy

| Sintoma | Causa provável | Ação |
|---|---|---|
| OWNER select vazio | Gunicorn não reiniciado | `sudo systemctl restart bridgeadoption-backend.service` |
| LEVEL select vazio | Idem | Idem |
| Formulário não abre dados ao editar | Cache do browser | Limpar cache ou aguardar `staleTime` (5 min) |
| "ADMIN role required" ao salvar membro | Role ADMIN não atribuída ao usuário | Verificar `tbUserRole` + `tbRole` |
| `_PROJ_OK = False` no log | `project_repository.py` não deployado | Verificar `/opt/bridgeadoption/src/...` |
| Erro 500 ao criar projeto | Repositório com erro | Ver `sudo journalctl -u bridgeadoption-backend.service -n 100` |
| Nome do membro aparece duas vezes | Frontend antigo no cache do browser | Hard refresh (Ctrl+Shift+R) ou limpar cache |

### Verificar logs do Gunicorn

```bash
# Últimas 100 linhas
sudo journalctl -u bridgeadoption-backend.service -n 100

# Logs em tempo real
sudo journalctl -u bridgeadoption-backend.service -f

# Erros de import do ProjectRepository
sudo journalctl -u bridgeadoption-backend.service -n 100 | grep -i "project_repository\|_PROJ_OK"
