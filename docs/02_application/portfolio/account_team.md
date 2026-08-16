# Módulo Account Team — Portfolio

> **Rota:** `/portfolio/account-team`
> **resource_key:** `portfolio.account_team`
> **Arquivo frontend:** `frontend/src/pages/portfolio/AccountTeamPage.tsx`
> **Migrado de:** `webapp/pages/portfolio/account_team.py` (Streamlit)
> **Última atualização:** 2026-08-16

---

## 1. Propósito

Exibe a **matriz de Account Team** por empresa cliente — todos os profissionais NTT Data alocados na relação com cada cliente, agrupados por tipo (AM, CDM, CSM, DIR, etc.), incluindo o **Cisco Domain** associado a cada empresa.

Usuários com permissão de edição podem:
- Ativar / desativar a alocação de membros por empresa
- Adicionar novos membros ao Account Team de uma empresa

---

## 2. Visão Geral da Tela

```
┌──────────────────────────────────────────────────────────────┐
│  Portfolio — Account Team            [Edit Mode] [Export] [↺] │
├──────────────────────────────────────────────────────────────┤
│  Filters: [Client ▾] [DIR ▾] [AM ▾] [CDM ▾] [CSM ▾]        │
├──────────────────────────────────────────────────────────────┤
│  42 record(s) found                                           │
│  ┌─────┬──────────────────┬──────────────┬────┬────┬────┐   │
│  │  #  │ Client           │ Cisco Domain │ AM │CDM │CSM │   │
│  ├─────┼──────────────────┼──────────────┼────┼────┼────┤   │
│  │  1  │ Acme Corp        │ acme.com     │...│... │... │   │
│  └─────┴──────────────────┴──────────────┴────┴────┴────┘   │
│  [Showing 1–10 of 42]  [Per page: 10▾]  [« ‹ 1 2 3 4 5 › »] │
└──────────────────────────────────────────────────────────────┘
```

**Edit Mode** (apenas para ADMINs/MANAGERs):

```
┌──────────────────────────────────────────────────────────────┐
│  [< Anterior]    Acme Corp (1/42)    [Próximo >]             │
│                                                               │
│  Edit Allocations                                             │
│  Member              Type    Allocated                       │
│  João Silva          CSM     ☑                               │
│  Maria Lima          AM      ☑                               │
│  Pedro Costa         CDM     ☐                               │
│                                                               │
│  Add Member                                                   │
│  [Select member ▾]  [Select type ▾]  [Save]                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Funcionalidades

### 3.1 Matriz (View)

- **Pivot client-side**: constrói a matriz empresa × user_type a partir dos dados brutos da API
- **Colunas dinâmicas**: AM, CDM, CSM, DIR (preferidas) + outros tipos ordenados alfabeticamente
- **Cisco Domain**: coluna adicional, preenchida via join com `CiscoDomainRepository` no backend
- **Numeração `#`**: sequencial sobre o resultado filtrado

### 3.2 Filtros

Todos os filtros são **multi-select** com dropdown:

| Filtro | Coluna filtrada | Comportamento |
|--------|-----------------|---------------|
| Client | `company` | Correspondência exata (isin) |
| DIR | `DIR` | Split por vírgula + includes |
| AM | `AM` | Split por vírgula + includes |
| CDM | `CDM` | Split por vírgula + includes |
| CSM | `CSM` | Split por vírgula + includes |

> **Nota**: AM/CDM/CSM/DIR podem conter múltiplos nomes separados por vírgula na mesma célula. O filtro usa split + includes (mais preciso que o regex do Streamlit original).

### 3.3 Paginação

- **Default**: 10 registros por página
- **Opções**: 10 / 25 / 50 / 100
- Página reinicia ao `1` quando qualquer filtro muda
- O **Export TSV** exporta **todos** os registros filtrados (não apenas a página visível)

### 3.4 Export TSV

- Formato: Tab-Separated Values (`.tsv`) — abre no Excel
- Nome do arquivo: `YYYYMMDD_account_team.tsv`
- Inclui colunas: `#`, `Client`, `Cisco Domain`, + tipos dinâmicos

### 3.5 Edit Mode (permissão required)

Habilitado para usuários ADMIN ou com role contendo "MANAGER" ou "FULL".

**Navegação por empresa:**
- Lista de empresas derivada dos filtros aplicados
- Navegação Anterior / Próximo
- Índice reseta automaticamente ao mudar filtros

**Edit Allocations:**
- Mostra **todos** os membros da empresa (incluindo não alocados)
- Checkbox `allocated` — auto-salva ao mudar (PUT imediato)
- Ao desalocar: define `accountteam_allocation_end_date = hoje`
- Registra `accountteam_changed_in` e `accountteam_changed_by`

**Add Member:**
- Lista de pessoas NTT (`tbPerson WHERE person_company_id IS NULL AND person_enabled = 1`)
- Exclui pessoas já vinculadas à empresa atual (`accountteam_person_id` existente)
- Ambos os campos (membro + tipo) são obrigatórios
- Ao inserir: sets `accountteam_allocated = 1`, `accountteam_allocation_start_date = hoje`

---

## 4. Fontes de Dados

| Fonte | Uso |
|-------|-----|
| `vwAccountTeam` via `AccountTeamRepository.find_all_df()` | Dados principais (matrix + edit panel) |
| `tbPerson WHERE person_company_id IS NULL` via `PersonRepository.get_ntt_persons()` | Lista de membros NTT para Add Member form |
| `CiscoDomainRepository.get_domain_all()` | Cisco Domain por empresa (join no backend) |

### Tabelas envolvidas

**`tbAccountTeam`**
```sql
accountteam_id           INT  PK AUTO_INCREMENT
accountteam_company_id   INT  FK tbCompany.company_id
accountteam_person_id    INT  FK tbPerson.person_id
accountteam_person_type  VARCHAR(15)   -- AM, CDM, CSM, DIR, etc.
accountteam_allocation_start_date  DATE
accountteam_allocation_end_date    DATE
accountteam_allocated    TINYINT(1)   -- 1=alocado, 0=desalocado
accountteam_changed_in   DATE
accountteam_changed_by   INT          -- user_id do solicitante
```

**`tbPerson`** (fonte para Add Member)
```sql
person_id           INT  PK
person_name         VARCHAR(150)
person_email        VARCHAR(150)
person_company_id   INT NULL    -- NULL = interno NTT
person_department_id INT
person_job_title    VARCHAR(150)
person_type         VARCHAR(30)
person_enabled      TINYINT(1)  -- 1 = ativo
```

---

## 5. Regras de Negócio

| # | Regra |
|---|-------|
| RN-01 | A matriz exibe apenas registros com `accountteam_allocated != 0` (e não nulo) |
| RN-02 | O painel de edição exibe **todos** os membros da empresa (alocados + não alocados) |
| RN-03 | Ao desalocar (`allocated` → `0`), registra `accountteam_allocation_end_date = hoje` |
| RN-04 | `accountteam_changed_in` e `accountteam_changed_by` são sempre atualizados no PUT |
| RN-05 | Add Member: só lista pessoas com `person_company_id IS NULL AND person_enabled = 1` |
| RN-06 | Add Member: exclui pessoas já vinculadas à empresa (por `accountteam_person_id`) |
| RN-07 | Add Member: validação client-side — ambos membro E tipo são obrigatórios |
| RN-08 | Ao inserir: `accountteam_person_type = tipo`, `accountteam_allocated = 1`, `accountteam_allocation_start_date = hoje` |
| RN-09 | O índice de navegação do edit panel reinicia ao `0` quando os filtros mudam |
| RN-10 | Cisco Domain: múltiplos domínios por empresa são concatenados com `, ` |
| RN-11 | Nomes na mesma célula de tipo (ex: "João, Maria" em CSM) são sorted e deduplicados |

---

## 6. Arquitetura Backend

```
sections_router.py (portfolio_router)
    GET /api/portfolio/account-team/matrix    → get_account_team_matrix()
    GET /api/portfolio/account-team/rows      → get_account_team_all_rows()
    GET /api/portfolio/account-team/users     → get_account_team_ntt_users()
    GET /api/portfolio/account-team           → get_account_team()  [legado]
    PUT /api/portfolio/account-team/{id}      → update_account_team_row()
    POST /api/portfolio/account-team          → insert_account_team_row()

sections_service.py
    get_account_team_matrix()
        → AccountTeamRepository.find_all_df()
        → filtro: accountteam_allocated != 0
        → CiscoDomainRepository.get_domain_all() + merge por company_id

    get_account_team_all_rows()
        → AccountTeamRepository.find_all_df() (sem filtro de alocação)

    get_account_team_ntt_users()
        → PersonRepository.get_ntt_persons(only_enabled=True)
        → tbPerson WHERE person_company_id IS NULL AND person_enabled = 1

    update_account_team_row(id, data)
        → AccountTeamRepository.update(data)

    insert_account_team_row(data)
        → AccountTeamRepository.insert(data)

Repositories
    AccountTeamRepository  → vwAccountTeam / tbAccountTeam
    PersonRepository       → tbPerson
    CiscoDomainRepository  → cisco_domain table
```

---

## 7. Arquitetura Frontend

```
AccountTeamPage.tsx
├── buildMatrix(rows)          — pivot client-side
├── getDynCols(matrix)         — colunas dinâmicas (AM/CDM/CSM/DIR + outros)
├── getUniq(matrix, col)       — valores únicos para filtros
├── hasVal(cell, vals)         — filtro multi-nome (split + includes)
├── exportTSV(...)             — export TSV client-side
├── MultiSelect                — dropdown multi-seleção com "Clear all"
├── PaginationBar              — paginação com janela deslizante de 5 páginas
├── MatrixTable                — tabela de matriz com scroll horizontal
└── EditPanel
    ├── company navigator      — prev/next sobre lista filtrada
    ├── allocated toggle       — PUT auto-save por checkbox
    └── add member form        — select de NttPerson + select de tipo
```

**Queries (React Query):**
| Query key | Endpoint | Quando |
|-----------|----------|--------|
| `["account-team-matrix"]` | `GET /matrix` | Sempre (página carrega) |
| `["account-team-rows"]` | `GET /rows` | Apenas quando `canEdit = true` |
| `["account-team-ntt-users"]` | `GET /users` | Lazy, dentro do EditPanel |

---

## 8. Permissões

| Nível | Comportamento |
|-------|---------------|
| Sem permissão | Redirecionado pela `PermissionRoute` |
| `view` | Visualiza matriz, filtros, paginação e export |
| `full` / `manage` | + botão Edit Mode, painel de edição e Add Member |
| ADMIN | Equivalente a `full` |

O `canEdit` é determinado no frontend:
```typescript
const canEdit = isAdmin || role.includes("MANAGER") || role.includes("FULL");
```

---

## 9. Internacionalização (i18n)

Namespace: `portfolio.accountTeam`

| Chave | EN | PT | ES |
|-------|----|----|-----|
| `title` | Portfolio — Account Team | Portfolio — Account Team | Portafolio — Equipo de Cuenta |
| `subtitle` | Customer Account Team Members | Membros do Account Team do Cliente | Miembros del Account Team del Cliente |
| `client` | Client | Cliente | Cliente |
| `member` | Member | Membro | Miembro |
| `type` | Type | Tipo | Tipo |
| `allocated` | Allocated | Alocado | Asignado |
| `titleEdit` | Edit Allocations | Editar Alocações | Editar Asignaciones |
| `titleAdd` | Add Member | Adicionar Membro | Agregar Miembro |
| `editMode` | Edit Mode | Modo Edição | Modo Edición |
| `btnSave` | Save | Salvar | Guardar |
| `warning1` | Please select a user and a type. | Por favor, selecione um usuário e um tipo. | Por favor, seleccione un usuario y un tipo. |
| `info1` | All users are already linked to this company. | Todos os usuários já estão vinculados a esta empresa. | Todos los usuarios ya están vinculados a esta empresa. |
| `recordsFound` | `{{count}} record(s) found` | `{{count}} registro(s) encontrado(s)` | `{{count}} registro(s) encontrado(s)` |

---

## 10. Referências

- **API:** `docs/07_api/account_team_endpoints.md`
- **PersonRepository:** `src/infrastructure/database/repositories/person_repository.py`
- **AccountTeamRepository:** `src/infrastructure/database/repositories/account_team_repository.py`
- **Streamlit original:** `webapp/pages/portfolio/account_team.py`
- **Módulo Portfolio (visão geral):** `docs/02_application/module_portfolio.md`
