# Módulo Adoption Use Cases

> **Rota:** `/adoption/use-cases`
> **resource_key:** `adoption.use_case`
> **Arquivo frontend:** `frontend/src/pages/adoption/UseCasesPage.tsx`
> **Backend service:** `backend/app/adoption/extras_service.py`
> **Backend router:** `backend/app/adoption/extras_router.py`
> **Última atualização:** 2026-08-17
> **i18n namespace:** `adoption.useCases` (todos os 6 arquivos de locale)

---

## 1. Propósito

Exibe os **Casos de Uso tecnológicos** (Use Cases) de fornecedores como Cisco, organizados por arquitetura e produto, com três seções de detalhe por registro:

1. **Description** — identificação do caso de uso (nome, vendor, arquitetura, produto principal, descrição)
2. **Applicability** — informações de aplicabilidade ao cliente (produtos de suporte, capacidades chave, benefícios para TI, benefícios de negócio, métricas de sucesso, resultados esperados)
3. **Exit Criteria** — critérios de saída por estágio (seq#, nome, tipo de tarefa, objetivo, escopo, resultados esperados)

A página é somente leitura (consulta). O conteúdo é gerenciado diretamente no banco via equipe Adoption.

---

## 2. Funcionalidades

### 2.1 Filtros Cascata

Quatro filtros em sequência — cada um depende do anterior:

| Nível | Filtro | Fonte de dados |
|-------|--------|---------------|
| 1 | **Vendor** | `GET /api/adoption/use-cases/vendors` — lista de empresas com role=vendor + entrada especial ADOPTION (id=341) |
| 2 | **Architecture** | Derivado client-side: valores únicos de `uc_architecture` dos use cases do vendor selecionado |
| 3 | **Primary Product** | Derivado client-side: valores únicos de `uc_primary_product_name` filtrados pela arquitetura |
| 4 | **Use Case** | Derivado client-side: valores únicos de `uc_use_case` filtrados pelo produto |

**Comportamento cascata:** ao alterar um filtro superior, todos os filtros inferiores são resetados automaticamente.

### 2.2 Navegação de Use Cases (NavBar)

Após selecionar um vendor, uma barra de navegação é exibida acima e abaixo do conteúdo:

```
[<< Previous Use Case]    Use Case X of N    [Next Use Case >>]
```

- Navega pelos use cases filtrados sem recarregar dados
- Ao navegar, o índice de Exit Criteria é resetado para 0
- Botões desabilitados nos limites (primeiro/último registro)

### 2.3 Seção Description

Card com os campos de identificação do use case atual:

| Campo | Coluna DB | Tipo |
|-------|-----------|------|
| Use Case | `uc_use_case` | input readonly |
| Vendor | `uc_vendor_name` | input readonly |
| Architecture | `uc_architecture` | input readonly |
| Primary Product | `uc_primary_product_name` | input readonly |
| Description | `uc_description` | textarea readonly (4 linhas) |

Layout: label na coluna esquerda (largura fixa 150px) + valor na coluna direita (flex-1).

### 2.4 Seção Applicability

Card com título destacando o nome do use case atual. Grid 2×3 de text areas readonly:

| Posição | Campo | Coluna DB |
|---------|-------|-----------|
| 1 (cima-esq) | Key Supporting Products | `uc_key_supporting_products` |
| 2 (cima-dir) | Key Capabilities | `uc_key_capabilities` |
| 3 (meio-esq) | IT Operations Benefits | `uc_it_operations_benefits` |
| 4 (meio-dir) | Business Benefits | `uc_business_benefits` |
| 5 (baixo-esq) | Success Metrics | `uc_success_metrics` |
| 6 (baixo-dir) | Business Outcomes | `uc_business_outcomes` |

### 2.5 Seção Exit Criteria

Card com título e nome do use case. Inclui navegação própria por estágio:

```
[<< Previous Stage]    Stage X of N    [Next Stage >>]
```

Campos do critério de saída atual:

| Campo | Coluna DB | Tipo |
|-------|-----------|------|
| Num# / Seq# | `ucec_seq` | input readonly |
| Name | `ucec_name` | input readonly |
| Task Type | `ucec_tasktype_name` | input readonly |
| Objective | `ucec_objective` | textarea readonly (3 linhas) |
| Scope | `ucec_scope` | textarea readonly (3 linhas) |
| Expected Results | `ucec_expected_results` | textarea readonly (3 linhas) |

Se o use case não tiver exit criteria, exibe mensagem "No data available."

### 2.6 Estados da Página

| Estado | Exibição |
|--------|----------|
| Sem vendor selecionado | Apenas filtros visíveis |
| Carregando use cases | Spinner centralizado |
| Vendor sem use cases | "No data available." |
| Com dados | NavBar + Description + Applicability + Exit Criteria + NavBar |

---

## 3. Arquitetura

### 3.1 Frontend

```
UseCasesPage.tsx
├── InlineField       — campo label-esquerda + valor-direita (input ou textarea)
├── ReadonlyField     — campo label-topo + textarea abaixo
├── NavBar            — barra prev/next com contador
└── SectionTitle      — cabeçalho de seção (h3 uppercase)
```

**Dependências:**
- `@tanstack/react-query` — gerenciamento de queries e cache
- `@/api/client` — cliente HTTP (axios)
- `react-i18next` — internacionalização
- `lucide-react` (ícones: `RefreshCw`, `ChevronLeft`, `ChevronRight`)

**State:**

| State | Tipo | Descrição |
|-------|------|-----------|
| `vendorId` | `number \| null` | Vendor selecionado (null = nenhum) |
| `selArchitecture` | `string` | Arquitetura selecionada (vazio = todas) |
| `selPrimaryProduct` | `string` | Produto selecionado (vazio = todos) |
| `selUseCase` | `string` | Use case selecionado (vazio = todos) |
| `ucIndex` | `number` | Índice do use case atual na lista filtrada |
| `ecIndex` | `number` | Índice do exit criteria atual |
| `refreshKey` | `number` | Incrementado para forçar refetch das queries |

**Queries:**

| Query Key | Endpoint | Condição | Descrição |
|-----------|----------|----------|-----------|
| `["uc-vendors", refreshKey]` | `GET /api/adoption/use-cases/vendors` | sempre | Lista de vendors |
| `["uc-by-vendor", vendorId, refreshKey]` | `GET /api/adoption/use-cases?vendor_id={id}` | `vendorId !== null` | Use cases do vendor |
| `["uc-exit-criteria", ucIds.join(","), refreshKey]` | `GET /api/adoption/use-cases/exit-criteria?uc_ids={ids}` | `ucIds.length > 0` | Exit criteria dos UCs filtrados |

**Computed (useMemo):**

```
architectures    = unique(allUseCases.uc_architecture).sort()
filteredByArch   = allUseCases[uc_architecture == selArchitecture]
primaryProducts  = unique(filteredByArch.uc_primary_product_name).sort()
filteredByProd   = filteredByArch[uc_primary_product_name == selPrimaryProduct]
useCaseOptions   = unique(filteredByProd.uc_use_case).sort()
filteredUseCases = filteredByProd[uc_use_case == selUseCase]

safeUcIndex   = min(ucIndex, filteredUseCases.length - 1)
currentUC     = filteredUseCases[safeUcIndex]

currentEC     = allEC[ucec_uc_id == currentUC.uc_id]
safeEcIndex   = min(ecIndex, currentEC.length - 1)
currentECRecord = currentEC[safeEcIndex]
```

### 3.2 Backend

**`backend/app/adoption/extras_service.py`:**

| Função | Descrição |
|--------|-----------|
| `get_use_case_vendors()` | Lista vendors via `CompanyRepository.list_companies_by_role("vendor")` + adiciona entrada ADOPTION (id=341) se ausente. Retorna `[{vendor_id, vendor_name}]` ordenado por nome. |
| `get_use_cases_by_vendor(vendor_id)` | Retorna use cases de `vwUseCase` filtrados por `uc_vendor_id = vendor_id`. Usa `UseCaseRepository.select_use_case_df(company_id=vendor_id)`. |
| `get_exit_criteria_by_uc_ids(uc_ids)` | Retorna exit criteria de `vwUseCaseExitCriteria` para lista de uc_ids. Usa `UseCaseRepository.select_exit_criteria_df(uc_id_list)`. |

Funções legadas mantidas para compatibilidade:

| Função | Descrição |
|--------|-----------|
| `get_use_cases(company_id)` | Alias para `get_use_cases_by_vendor(company_id)` |
| `get_use_case_companies()` | Alias para `get_use_case_vendors()` |

**`backend/app/adoption/extras_router.py` (usecase_router):**

| Método | Endpoint | Função de serviço |
|--------|----------|-------------------|
| `GET` | `/api/adoption/use-cases/vendors` | `get_use_case_vendors()` |
| `GET` | `/api/adoption/use-cases?vendor_id={id}` | `get_use_cases_by_vendor(vendor_id)` |
| `GET` | `/api/adoption/use-cases/exit-criteria?uc_ids={csv}` | `get_exit_criteria_by_uc_ids(id_list)` |
| `GET` | `/api/adoption/use-cases` (sem params) | retorna `[]` |
| `GET` | `/api/adoption/use-cases/companies` | legado — retorna vendors |

### 3.3 Banco de Dados

| Objeto | Tipo | Uso |
|--------|------|-----|
| `vwUseCase` | View MariaDB | Use cases com dados de vendor e produto |
| `vwUseCaseExitCriteria` | View MariaDB | Exit criteria com nome do task type |
| `tbUseCase` | Tabela base | Dados mestres dos use cases |
| `tbUseCaseExitCriteria` | Tabela base | Critérios de saída por use case |

**Principais colunas de `vwUseCase`:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `uc_id` | int | ID do use case |
| `uc_vendor_id` | int | ID do vendor (empresa) |
| `uc_vendor_name` | string | Nome do vendor |
| `uc_architecture` | string | Arquitetura (ex: "Security", "Collaboration") |
| `uc_solution_domain` | string | Domínio da solução |
| `uc_use_case` | string | Nome do caso de uso |
| `uc_primary_product_id` | int | ID do produto principal |
| `uc_primary_product_name` | string | Nome do produto principal |
| `uc_description` | text | Descrição do caso de uso |
| `uc_key_supporting_products` | text | Produtos de suporte chave |
| `uc_key_capabilities` | text | Capacidades chave |
| `uc_it_operations_benefits` | text | Benefícios para operações de TI |
| `uc_business_benefits` | text | Benefícios de negócio |
| `uc_success_metrics` | text | Métricas de sucesso |
| `uc_business_outcomes` | text | Resultados de negócio |

**Principais colunas de `vwUseCaseExitCriteria`:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `ucec_id` | int | ID do exit criteria |
| `ucec_uc_id` | int | FK → uc_id |
| `ucec_tasktype_id` | int | ID do tipo de tarefa |
| `ucec_tasktype_name` | string | Nome do tipo de tarefa |
| `ucec_seq` | int | Número de sequência |
| `ucec_name` | string | Nome do critério |
| `ucec_objective` | text | Objetivo |
| `ucec_scope` | text | Escopo |
| `ucec_expected_results` | text | Resultados esperados |
| `ucec_update_date` | date | Data da última atualização |

**Repositório:** `src/infrastructure/database/repositories/use_case_repository.py`

Métodos utilizados:

| Método | SQL |
|--------|-----|
| `select_use_case_df(company_id)` | `SELECT * FROM vwUseCase WHERE uc_vendor_id = %s ORDER BY uc_use_case` |
| `select_exit_criteria_df(uc_id_list)` | `SELECT * FROM vwUseCaseExitCriteria WHERE ucec_uc_id IN (...) ORDER BY ucec_seq` |

---

## 4. Autorização

| Campo | Valor |
|-------|-------|
| `resource_key` | `adoption.use_case` |
| `resource_module` | `adoption` |
| Rota protegida | `<PermissionRoute resourceKey="adoption.use_case" />` |

> Para conceder acesso, atribuir o resource `adoption.use_case` ao perfil do usuário via **Admin → Roles & Auth**.

---

## 5. Fluxo de Dados

```
Página carrega
    └─► GET /api/adoption/use-cases/vendors
            └─► CompanyRepository.list_companies_by_role("vendor")
                    └─► SELECT vendor_id, vendor_name FROM ... WHERE role='vendor'
                    └─► Adiciona ADOPTION (id=341) se ausente
                    └─► Retorna lista ordenada por nome

Usuário seleciona Vendor
    └─► GET /api/adoption/use-cases?vendor_id={id}
            └─► UseCaseRepository.select_use_case_df(company_id=vendor_id)
                    └─► SELECT * FROM vwUseCase WHERE uc_vendor_id = %s ORDER BY uc_use_case
                    └─► Retorna todos os use cases do vendor

Frontend deriva filtros client-side:
    ├─► architectures   = unique(allUC.uc_architecture).sort()
    ├─► primaryProducts = unique(filteredByArch.uc_primary_product_name).sort()
    ├─► useCaseOptions  = unique(filteredByProd.uc_use_case).sort()
    └─► filteredUC      = filteredByProd[uc_use_case == selUseCase]

Query exit criteria (ao ter use cases filtrados):
    └─► GET /api/adoption/use-cases/exit-criteria?uc_ids=1,2,3,...
            └─► UseCaseRepository.select_exit_criteria_df([1,2,...])
                    └─► SELECT * FROM vwUseCaseExitCriteria WHERE ucec_uc_id IN (...) ORDER BY ucec_seq
                    └─► Retorna todos os exit criteria dos UCs filtrados

Frontend filtra exit criteria client-side:
    └─► currentEC = allEC[ucec_uc_id == currentUC.uc_id]

Frontend renderiza:
    ├─► Cabeçalho + botão Refresh
    ├─► Card de filtros cascata (Vendor → Architecture → Primary Product → Use Case)
    ├─► [se carregando] Spinner
    ├─► [se sem dados] "No data available."
    └─► [se com dados]
        ├─► NavBar (Use Case X of N)
        ├─► Card Description
        ├─► Card Applicability (grid 2×3)
        ├─► Card Exit Criteria + NavBar estágios
        └─► NavBar (Use Case X of N) — bottom
```

---

## 6. Internacionalização (i18n)

O módulo suporta 3 idiomas: **Português (pt / pt-BR)**, **Inglês (en / en-US)** e **Espanhol (es / es-ES)**.

### Namespace: `adoption.useCases`

| Chave | PT | EN | ES |
|-------|----|----|-----|
| `title` | Casos de Uso | Use Cases | Casos de Uso |
| `subtitle` | Aplicabilidade e Critérios de Saída dos Casos de Uso | Customer Use Case Applicability & Exit Criteria | Aplicabilidad y Criterios de Salida de Casos de Uso |
| `vendor` | Fornecedor | Vendor | Proveedor |
| `architecture` | Arquitetura | Architecture | Arquitectura |
| `primaryProduct` | Produto Principal | Primary Product | Producto Principal |
| `useCase` | Caso de Uso | Use Case | Caso de Uso |
| `stage` | Estágio | Stage | Etapa |
| `descriptionSection` | Descrição | Description | Descripción |
| `applicabilitySection` | Aplicabilidade | Applicability | Aplicabilidad |
| `exitCriteriaSection` | Critérios de Saída | Exit Criteria | Criterios de Salida |
| `keyProducts` | Produtos de Suporte Chave | Key Supporting Products | Productos de Soporte Clave |
| `keyCapabilities` | Capacidades Chave | Key Capabilities | Capacidades Clave |
| `itBenefits` | Benefícios para Operações de TI | IT Operations Benefits | Beneficios para Operaciones de TI |
| `bizBenefits` | Benefícios para o Negócio | Business Benefits | Beneficios para el Negocio |
| `successMetrics` | Métricas de Sucesso | Success Metrics | Métricas de Éxito |
| `bizOutcomes` | Resultados de Negócio | Business Outcomes | Resultados de Negocio |
| `criteriaName` | Nome | Name | Nombre |
| `taskType` | Tipo de Tarefa | Task Type | Tipo de Tarea |
| `objective` | Objetivo | Objective | Objetivo |
| `scope` | Escopo | Scope | Alcance |
| `expectedResults` | Resultados Esperados | Expected Results | Resultados Esperados |

### Chave de navegação: `nav.useCases`

| Locale | Valor |
|--------|-------|
| EN / EN-US | Use Cases |
| PT / PT-BR | Casos de Uso |
| ES / ES-ES | Casos de Uso |

---

## 7. Histórico de Alterações

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-08-17 | v2 | Migração completa do Streamlit `use_case.py` para React. Novos endpoints `/vendors`, `?vendor_id=`, `/exit-criteria`. Filtros cascata client-side. Navegação prev/next para use cases e exit criteria. Seções Description, Applicability e Exit Criteria. |
| anterior | v1 | Placeholder `DataTablePage` sem funcionalidade real. Endpoints legados `get_use_cases` e `get_use_case_companies` sem suporte a filtro por vendor. |

---

## 8. Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| Módulo não aparece no menu | Usuário sem permissão para `adoption.use_case` | Atribuir resource `adoption.use_case` ao perfil via Admin → Roles & Auth |
| Lista de vendors vazia | `CompanyRepository.list_companies_by_role("vendor")` sem dados | Verificar se existem empresas com role=vendor cadastradas; conferir a entrada ADOPTION (id=341) |
| Use cases vazios após selecionar vendor | `vwUseCase` não tem registros para o `uc_vendor_id` informado | Verificar se existem registros em `tbUseCase` para o vendor; conferir a view `vwUseCase` |
| Exit criteria não aparecem | `vwUseCaseExitCriteria` sem registros para os uc_ids da lista filtrada | Verificar `tbUseCaseExitCriteria`; confirmar que `ucec_uc_id` corresponde a um uc_id válido |
| Filtros Architecture/Product/UseCase sem opções | Use cases do vendor não têm os campos preenchidos | Verificar campos `uc_architecture`, `uc_primary_product_name`, `uc_use_case` em `tbUseCase` |
| "No data available." mesmo com vendor selecionado | Filtros cascata resultaram em lista vazia | Limpar filtros Architecture/Product/UseCase — o vendor pode não ter use cases para a combinação selecionada |
| Erro 401 | Token JWT expirado | Refazer login |
| Erro 500 `/vendors` | Falha em `CompanyRepository.list_companies_by_role` | Verificar logs do backend; confirmar conexão com banco |
| Erro 500 `?vendor_id=` | Falha em `UseCaseRepository.select_use_case_df` | Verificar logs; confirmar que `vwUseCase` existe e está acessível |
| Erro 400 `/exit-criteria` | Parâmetro `uc_ids` não é CSV de inteiros | Verificar se ucIds contém valores não numéricos (bug no frontend) |
