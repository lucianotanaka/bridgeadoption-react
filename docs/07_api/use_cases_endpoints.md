# Adoption Use Cases — API Endpoints

> **Base path:** `/api/adoption/use-cases`
> **Router:** `backend/app/adoption/extras_router.py` (`usecase_router`)
> **Service:** `backend/app/adoption/extras_service.py`
> **Autenticação:** Bearer JWT (obrigatório em todos os endpoints)
> **Última atualização:** 2026-08-17

---

## Endpoints

### GET `/api/adoption/use-cases/vendors`

Retorna a lista de vendors (empresas com role=vendor) disponíveis para o filtro cascata da página Use Cases. Inclui a entrada especial **ADOPTION** (id=341) se ela não estiver presente nos dados da view.

**Query Parameters:** nenhum

**Response:** `List[Dict]`

```json
[
  { "vendor_id": 341, "vendor_name": "ADOPTION" },
  { "vendor_id": 1,   "vendor_name": "CISCO" },
  { "vendor_id": 15,  "vendor_name": "FORTINET" }
]
```

**Service:** `get_use_case_vendors()`

**Lógica:**
1. `CompanyRepository.list_companies_by_role("vendor", as_df=True)`
2. Se `vendor_id=341` ausente, insere `{"vendor_id": 341, "vendor_name": "ADOPTION"}`
3. Normaliza colunas (suporta `vendor_id/vendor_name` ou `company_id/company_name`)
4. Retorna lista ordenada por `vendor_name`

---

### GET `/api/adoption/use-cases`

Retorna todos os use cases de um vendor específico, conforme registros da view `vwUseCase`.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `vendor_id` | `int` | Sim* | Filtro pelo `uc_vendor_id` |
| `company_id` | `int` | Não | Alias legado para `vendor_id` |

> *Se nenhum dos dois for informado, retorna `[]` sem erro.

**Response:** `List[Dict]`

```json
[
  {
    "uc_id": 42,
    "uc_vendor_id": 1,
    "uc_vendor_name": "CISCO",
    "uc_architecture": "Security",
    "uc_solution_domain": "Zero Trust",
    "uc_use_case": "Zero Trust Network Access",
    "uc_primary_product_id": 100,
    "uc_primary_product_name": "Cisco Duo",
    "uc_description": "Provides secure access based on user identity and device trust.",
    "uc_key_supporting_products": "Cisco ISE, Cisco Umbrella",
    "uc_key_capabilities": "MFA, Device Posture Check, ZTNA",
    "uc_it_operations_benefits": "Reduced attack surface, centralized access control",
    "uc_business_benefits": "Compliance, reduced breach risk",
    "uc_success_metrics": "% users with MFA enabled > 95%",
    "uc_business_outcomes": "Zero Trust posture achieved"
  }
]
```

**Service:** `get_use_cases_by_vendor(vendor_id)`

**SQL:** `SELECT * FROM vwUseCase WHERE uc_vendor_id = %s ORDER BY uc_use_case`

**Nota:** Os filtros de Architecture, Primary Product e Use Case são aplicados **client-side** no frontend a partir desta lista completa. O backend retorna todos os use cases do vendor sem filtros adicionais.

---

### GET `/api/adoption/use-cases/exit-criteria`

Retorna os critérios de saída (exit criteria) para uma lista de use case IDs, conforme registros da view `vwUseCaseExitCriteria`.

**Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `uc_ids` | `string` | Sim | IDs dos use cases separados por vírgula (ex: `1,2,3`) |

**Validação:** O backend parseia o parâmetro como CSV de inteiros. Retorna `400 Bad Request` se algum valor não for numérico.

**Response:** `List[Dict]`

```json
[
  {
    "ucec_id": 10,
    "ucec_uc_id": 42,
    "ucec_tasktype_id": 5,
    "ucec_tasktype_name": "Assessment",
    "ucec_seq": 1,
    "ucec_name": "Identity Baseline Assessment",
    "ucec_objective": "Evaluate current identity infrastructure and MFA adoption rate.",
    "ucec_scope": "All user accounts in Active Directory and Azure AD.",
    "ucec_expected_results": "Report with current MFA coverage and gap analysis.",
    "ucec_update_date": "2026-01-15"
  },
  {
    "ucec_id": 11,
    "ucec_uc_id": 42,
    "ucec_tasktype_id": 7,
    "ucec_tasktype_name": "Deployment",
    "ucec_seq": 2,
    "ucec_name": "MFA Deployment",
    "ucec_objective": "Enable MFA for all users via Cisco Duo.",
    "ucec_scope": "All production user accounts.",
    "ucec_expected_results": "MFA enabled for >= 95% of users.",
    "ucec_update_date": "2026-02-10"
  }
]
```

**Service:** `get_exit_criteria_by_uc_ids(uc_ids)`

**SQL:** `SELECT * FROM vwUseCaseExitCriteria WHERE ucec_uc_id IN (%s, %s, ...) ORDER BY ucec_seq`

**Nota:** O frontend envia os IDs de **todos os use cases do filtro atual** (não apenas o use case visível). A filtragem por `ucec_uc_id == currentUC.uc_id` é feita **client-side**.

---

## Endpoints Legados

Os endpoints abaixo foram mantidos para compatibilidade com integrações anteriores, mas **não são consumidos** pela página `UseCasesPage.tsx` atual.

| Endpoint | Comportamento atual |
|----------|---------------------|
| `GET /api/adoption/use-cases/companies` | Retorna a mesma lista que `/vendors` — alias legado |
| `GET /api/adoption/use-cases` (sem `vendor_id`) | Retorna `[]` |

---

## Autenticação

Todos os endpoints requerem token JWT válido no header:

```
Authorization: Bearer <token>
```

Retorna `401 Unauthorized` se o token for inválido ou expirado.

---

## Status Codes

| Código | Situação |
|--------|----------|
| `200 OK` | Dados retornados com sucesso (pode ser lista vazia `[]`) |
| `400 Bad Request` | `uc_ids` contém valores não numéricos |
| `401 Unauthorized` | Token ausente, inválido ou expirado |
| `500 Internal Server Error` | Erro no repositório ou banco de dados |

---

## Sequência de Chamadas (página Use Cases)

```
1. GET /api/adoption/use-cases/vendors
   → Popula o select "Vendor"

2. [usuário seleciona vendor]
   GET /api/adoption/use-cases?vendor_id={id}
   → Carrega todos os use cases; frontend deriva filtros Architecture/Product/UseCase

3. [com use cases filtrados disponíveis]
   GET /api/adoption/use-cases/exit-criteria?uc_ids={id1,id2,...}
   → Carrega exit criteria de todos os UCs filtrados
   → Frontend filtra client-side pelo UC atualmente exibido
```

---

## Repositório

`src/infrastructure/database/repositories/use_case_repository.py` — classe `UseCaseRepository`

| Método | Assinatura | Descrição |
|--------|-----------|-----------|
| `select_use_case_df` | `(company_id, use_case_id, product_id)` | Retorna DataFrame de `vwUseCase` |
| `select_exit_criteria_df` | `(uc_id_list: List[int])` | Retorna DataFrame de `vwUseCaseExitCriteria` |
| `insert_use_case` | `(data: Dict)` | Insere em `tbUseCase` — uso interno |
| `insert_exit_criteria` | `(data: Dict)` | Insere em `tbUseCaseExitCriteria` — uso interno |
| `update_use_case` | `(uc_id, data: Dict)` | Atualiza `tbUseCase` — uso interno |
| `update_exit_criteria` | `(ucec_id, data: Dict)` | Atualiza `tbUseCaseExitCriteria` — uso interno |
