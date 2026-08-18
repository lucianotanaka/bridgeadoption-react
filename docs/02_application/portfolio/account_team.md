# Módulo Account Team — Portfolio

> **Rota:** `/portfolio/account-team`
> **resource_key:** `portfolio.account_team`
> **Arquivo frontend:** `frontend/src/pages/portfolio/AccountTeamPage.tsx`
> **Migrado de:** `webapp/pages/portfolio/account_team.py` (Streamlit)
> **Última atualização:** 2026-08-18 (rev2)

---

## 1. Propósito

Exibe a **matriz de Account Team** por empresa cliente — todos os profissionais NTT Data alocados na relação com cada cliente, agrupados por tipo (AM, CDM, CSM, DIR, etc.), incluindo o **Cisco Domain** associado a cada empresa.

Usuários com permissão de edição podem:
- Ativar / desativar a alocação de membros por empresa (checkbox com auto-save)
- Adicionar novos membros ao Account Team de uma empresa

---

## 2. Visão Geral da Tela

```
┌──────────────────────────────────────────────────────────────┐
│  Portfolio — Account Team  [Edit Mode] [⊟ Columns] [Export]  │
├──────────────────────────────────────────────────────────────┤
│  [Client ▾] [DIR ▾] [AM ▾] [CDM ▾] [CSM ▾]  [✕ Clear all]  │
├──────────────────────────────────────────────────────────────┤
│  42 record(s) found                                           │
│  ┌────┬──────────────────┬──────────────┬────┬────┬────┐    │
│  │ #  │ Client           │ Cisco Domain │ AM │CDM │CSM │    │
│  ├────┼──────────────────┼──────────────┼────┼────┼────┤    │
│  │  1 │ Acme Corp        │ acme.com     │... │... │... │    │
│  └────┴──────────────────┴──────────────┴────┴────┴────┘    │
│  [Showing 1–10 of 42]  [Per page: 10▾]  [« ‹ 1 2 3 4 5 › »] │
└──────────────────────────────────────────────────────────────┘
```

**Edit Mode** (apenas para ADMINs/MANAGERs):

```
┌──────────────────────────────────────────────────────────────┐
│  [< Anterior]    Acme Corp (1/42)    [Próximo >]             │
│                                                               │
│  EDIT ALLOCATIONS                                            │
│  Member              Type    Allocated                       │
│  João Silva          CSM     ☑  (auto-salva imediatamente)   │
│  Maria Lima          AM      ☑                               │
│  Pedro Costa         CDM     ☐                               │
│                                                               │
│  ADD MEMBER                                                   │
│  [Select member ▾]  [Select type ▾]  [Save]                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Funcionalidades

### 3.1 Matriz (View)

- **Pivot client-side**: constrói a matriz empresa × `accountteam_person_type` a partir dos dados brutos da API
- **Colunas dinâmicas**: AM, CDM, CSM, DIR (preferidas) + outros tipos ordenados alfabeticamente
- **Cisco Domain**: coluna adicional, preenchida via join com `CiscoDomainRepository` no backend
- **Numeração `#`**: sequencial sobre o resultado filtrado
- **Toggle de colunas**: botão "Columns" (ícone `SlidersHorizontal`) permite ocultar/exibir colunas individuais — incluindo Cisco Domain e tipos específicos

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

Botão **"✕ Clear all filters"** aparece automaticamente quando qualquer filtro estiver ativo.

### 3.3 Paginação

- **Default**: 10 registros por página
- **Opções**: 10 / 25 / 50 / 100
- Página reinicia ao `1` quando qualquer filtro muda
- O **Export TSV** exporta **todos** os registros filtrados (não apenas a página visível)

### 3.4 Export TSV

- Formato: Tab-Separated Values (`.tsv`) — abre no Excel
- Nome do arquivo: `YYYYMMDD_account_team.tsv`
- Inclui apenas as colunas visíveis (respeitando a configuração do toggle de colunas)

### 3.5 Edit Mode (permissão required)

Habilitado para usuários ADMIN ou com role contendo "MANAGER", "FULL" ou **"EDIT"**.

**Navegação por empresa:**
- Lista de empresas derivada dos filtros aplicados
- Navegação Anterior / Próximo
- Índice reseta automaticamente ao mudar filtros

**Edit Allocations:**
- Mostra **todos** os membros da empresa (incluindo não alocados)
- Checkbox `allocated` — auto-salva ao mudar (PUT imediato) com **feedback visual otimista**: o checkbox muda visualmente de imediato, antes da confirmação do servidor
- Ao desalocar: define `accountteam_allocation_end_date = hoje`
- Registra `accountteam_changed_in` e `accountteam_changed_by`
- Se o servidor retornar erro: a mudança visual é revertida automaticamente

**Add Member:**
- Lista de pessoas NTT (`tbPerson WHERE person_company_id IS NULL AND person_enabled = 1`)
- Exclui pessoas já vinculadas à empresa atual (por `accountteam_person_id`)
- Ambos os campos (membro + tipo) são obrigatórios — validação client-side
- Ao inserir: salva em `accountteam_person_id` e `accountteam_person_type`, com `accountteam_allocated = 1` e `accountteam_allocation_start_date = hoje`

---

## 4. Fontes de Dados

| Fonte | Uso |
|-------|-----|
| `vwAccountTeam` via `AccountTeamRepository.find_all_df()` | Dados principais (matrix + edit panel) |
| `tbPerson WHERE person_company_id IS NULL` via `PersonRepository.get_ntt_persons()` | Lista de membros NTT para Add Member form (fonte primária) |
| `tbPerson` já populada com ~700 colaboradores internos NTT (`person_company_id IS NULL`) | Origem exclusiva para o formulário Add Member |
| `CiscoDomainRepository.get_domain_all()` | Cisco Domain por empresa (join no backend) |

### Tabelas envolvidas

**`tbAccountTeam`**
```sql
accountteam_id           INT  PK AUTO_INCREMENT
accountteam_company_id   INT  FK tbCompany.company_id
accountteam_person_id    INT  FK tbPerson.person_id          -- novo (era accountteam_user_id)
accountteam_person_type  VARCHAR(15)   -- AM, CDM, CSM, DIR, etc. (era accountteam_user_type)
accountteam_allocation_start_date  DATE
accountteam_allocation_end_date    DATE
accountteam_allocated    TINYINT(1) DEFAULT -1  -- 1=alocado, 0=desalocado, -1=não definido
accountteam_changed_in   DATE
accountteam_changed_by   INT          -- user_id do solicitante
```

**`tbPerson`** (fonte para Add Member)
```sql
person_id           INT  PK AUTO_INCREMENT
person_name         VARCHAR(150)
person_email        VARCHAR(150)
person_company_id   INT NULL    -- NULL = interno NTT
person_department_id INT
person_job_title    VARCHAR(150)
person_type         VARCHAR(30)
person_enabled      TINYINT(1) DEFAULT 1  -- 1 = ativo
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
| RN-08 | Ao inserir: salva `accountteam_person_id`, `accountteam_person_type`, `accountteam_allocated = 1`, `accountteam_allocation_start_date = hoje` |
| RN-09 | O índice de navegação do edit panel reinicia ao `0` quando os filtros mudam |
| RN-10 | Cisco Domain: múltiplos domínios por empresa são concatenados com `, ` |
| RN-11 | Nomes na mesma célula de tipo (ex: "João, Maria" em CSM) são sorted e deduplicados |
| RN-12 | Checkbox allocated: **atualização otimista** no frontend — muda visualmente antes da resposta do servidor; reverte se houver erro |
| RN-13 | Botão Edit Mode visível apenas para ADMIN ou role contendo "MANAGER", "FULL" ou "EDIT" |

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
    _normalize_account_team_cols(df)
        → Renomeia colunas legadas da vwAccountTeam:
          accountteam_user_type → accountteam_person_type
          accountteam_user_id   → accountteam_person_id
        → Chamado em get_account_team_matrix() e get_account_team_all_rows()

    get_account_team_matrix()
        → AccountTeamRepository.find_all_df()
        → _normalize_account_team_cols(df)
        → filtro: accountteam_allocated != 0
        → CiscoDomainRepository.get_domain_all() + merge por company_id

    get_account_team_all_rows()
        → AccountTeamRepository.find_all_df() (sem filtro de alocação)
        → _normalize_account_team_cols(df)

    get_account_team_ntt_users()
        → Tenta PersonRepository.get_ntt_persons(only_enabled=True)
        → Se PersonRepository indisponível (não implantado no servidor): fallback SQL direto
          SELECT person_id, person_name, ... FROM tbPerson
          WHERE person_company_id IS NULL AND person_enabled = 1
        → Retorna sempre [{ person_id, person_name, person_email, ... }]

    update_account_team_row(id, data)
        → AccountTeamRepository.update(data)   ← chamado como MÉTODO DE CLASSE
        → ATENÇÃO: AccountTeamRepository.update() não tem 'self' no código original
          (definido sem self, deve ser chamado como AccountTeamRepository.update(data))

    insert_account_team_row(data)
        → AccountTeamRepository.insert(data)
        → Salva diretamente em tbAccountTeam:
          accountteam_person_id   (FK → tbPerson.person_id)
          accountteam_person_type (AM, CDM, CSM, DIR, etc.)

Repositories
    AccountTeamRepository  → vwAccountTeam / tbAccountTeam
    PersonRepository       → tbPerson
    CiscoDomainRepository  → cisco_domain table
```

---

## 7. Arquitetura Frontend

```
AccountTeamPage.tsx
├── buildMatrix(rows)          — pivot client-side (usa accountteam_person_type)
├── getDynCols(matrix)         — colunas dinâmicas (AM/CDM/CSM/DIR + outros)
├── getUniq(matrix, col)       — valores únicos para filtros
├── hasVal(cell, vals)         — filtro multi-nome (split + includes)
├── colLabel(key, clientLabel) — helper: chave interna → label legível
├── exportTSV(...)             — export TSV client-side (respeita colunas visíveis)
├── SingleSelect               — dropdown single-seleção com busca por digitação + botão ✕ (usado no Add Member form)
├── MultiSelect                — dropdown multi-seleção com "Clear all" (usado nos filtros)
├── PaginationBar              — paginação com janela deslizante de 5 páginas
├── ColumnToggle               — toggle de visibilidade de colunas
├── MatrixTable                — tabela de matriz com scroll horizontal
└── EditPanel
    ├── optimisticAlloc state  — Map<accountteam_id, bool> para feedback visual imediato
    ├── company navigator      — prev/next sobre lista filtrada
    ├── allocated toggle       — PUT auto-save + atualização otimista
    └── add member form        — SingleSelect de NttPerson + SingleSelect de tipo
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
const canEdit = isAdmin || role.includes("MANAGER") || role.includes("FULL") || role.includes("EDIT");
```

---

## 9. Bugs Corrigidos (histórico)

| Data | Bug | Causa Raiz | Correção |
|------|-----|------------|----------|
| 2026-08-17 | Colunas AM/CDM/CSM/DIR exibidas como "OTHER" | `vwAccountTeam` retorna `accountteam_user_type` mas frontend espera `accountteam_person_type` | `_normalize_account_team_cols()` no backend renomeia as colunas antes de retornar |
| 2026-08-17 | Checkbox "Allocated" não salvava | `AccountTeamRepository.update()` definido sem `self` — Python passava a instância como `edit_values` | `update_account_team_row()` chama `AccountTeamRepository.update(data)` como método de classe |
| 2026-08-17 | Checkbox parecia não responder (sem feedback visual) | Checkbox controlado pelo React não muda visualmente até o refetch completar | Estado otimista `optimisticAlloc` no `EditPanel` — muda imediatamente, reverte se erro |
| 2026-08-17 | "Add Member" mostrava "All users already linked" | `PersonRepository` não implantado no servidor — import falhava silenciosamente | `get_account_team_ntt_users()` tem fallback SQL direto — independe de `person_repository.py` estar implantado |
| 2026-08-18 | Botão Edit Mode não visível para role "EDIT" | Condição `canEdit` não incluía `role.includes("EDIT")` | Adicionado `role.includes("EDIT")` à condição `canEdit` |
| 2026-08-18 | TYPE inserido não aparecia na coluna TIPO | `insert_account_team_row()` mapeava para `accountteam_user_type` (coluna errada) | Mapeamento removido; salva diretamente em `tbAccountTeam.accountteam_person_type` |
| 2026-08-18 | MEMBER select sem busca por digitação (700 nomes) | `<select>` HTML nativo não filtra por digitação | Substituído por `SingleSelect` com input de busca + `onClick` explícito |

---

## 10. Internacionalização (i18n)

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

## 11. Referências

- **API:** `docs/07_api/account_team_endpoints.md`
- **PersonRepository:** `src/infrastructure/database/repositories/person_repository.py`
- **AccountTeamRepository:** `src/infrastructure/database/repositories/account_team_repository.py`
- **Streamlit original:** `webapp/pages/portfolio/account_team.py`
- **Módulo Portfolio (visão geral):** `docs/02_application/module_portfolio.md`
