# Deployment — Adoption Use Cases

> **Módulo:** Adoption > Use Cases
> **Rota:** `/adoption/use-cases`
> **resource_key:** `adoption.use_case`
> **Última atualização:** 2026-08-17

---

## 1. Visão Geral

O módulo **Use Cases** exibe casos de uso tecnológicos de vendors (ex: Cisco) organizados por arquitetura, produto e critérios de saída. É uma página somente leitura — o conteúdo é mantido diretamente no banco de dados pela equipe Adoption.

**Versão atual:** v2 (React) — migrado do Streamlit `use_case.py` em 2026-08-17.

---

## 2. Componentes Envolvidos

| Camada | Arquivo | Descrição |
|--------|---------|-----------|
| Frontend | `frontend/src/pages/adoption/UseCasesPage.tsx` | Página React completa |
| Backend Service | `backend/app/adoption/extras_service.py` | Funções `get_use_case_vendors`, `get_use_cases_by_vendor`, `get_exit_criteria_by_uc_ids` |
| Backend Router | `backend/app/adoption/extras_router.py` | `usecase_router` — endpoints `/api/adoption/use-cases/*` |
| Repositório | `src/infrastructure/database/repositories/use_case_repository.py` | Acesso a `vwUseCase` e `vwUseCaseExitCriteria` |
| DB Views | `vwUseCase`, `vwUseCaseExitCriteria` | Views MariaDB |
| DB Tabelas | `tbUseCase`, `tbUseCaseExitCriteria` | Tabelas base |
| i18n | `frontend/src/i18n/locales/*.json` | Namespace `adoption.useCases` |

---

## 3. Pré-requisitos de Implantação

### 3.1 Banco de Dados

As views e tabelas abaixo devem existir no banco `pegasus`:

```sql
-- Verificar existência das views
SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_pegasus LIKE '%UseCase%';

-- Esperado:
-- vwUseCase
-- vwUseCaseExitCriteria

-- Verificar existência das tabelas base
SHOW TABLES LIKE 'tbUseCase%';

-- Esperado:
-- tbUseCase
-- tbUseCaseExitCriteria
```

Caso as views não existam, solicitar ao DBA a criação conforme definição original do Streamlit (`src/infrastructure/database/repositories/use_case_repository.py`).

### 3.2 Autorização (resource_key)

O módulo usa o resource `adoption.use_case`. Para verificar se já existe no banco:

```sql
SELECT * FROM tbResource WHERE resource_key = 'adoption.use_case';
```

Caso não exista, inserir manualmente:

```sql
INSERT INTO tbResource (resource_key, resource_module, resource_description, resource_active)
VALUES ('adoption.use_case', 'adoption', 'Adoption Use Cases — Customer Use Case Applicability & Exit Criteria', 1);
```

### 3.3 Atribuição de Perfil

Após garantir o resource, atribuir ao perfil desejado via interface Admin → Roles & Auth, ou via SQL:

```sql
-- Verificar perfis existentes
SELECT r.role_name, res.resource_key
FROM tbRoleResource rr
JOIN tbRole r ON r.role_id = rr.role_id
JOIN tbResource res ON res.resource_id = rr.resource_id
WHERE res.resource_key = 'adoption.use_case';
```

### 3.4 Empresa ADOPTION (id=341)

O módulo inclui automaticamente uma entrada especial `ADOPTION` (vendor_id=341) na lista de vendors. Verificar se este ID existe no banco (não é obrigatório, mas é adicionado dinamicamente pelo serviço):

```sql
-- Verificar
SELECT * FROM tbCompany WHERE company_id = 341;

-- Se necessário cadastrar use cases para ADOPTION, garantir que uc_vendor_id = 341
SELECT COUNT(*) FROM tbUseCase WHERE uc_vendor_id = 341;
```

---

## 4. Verificação Pós-Deploy

### 4.1 Testar endpoints via curl/Postman

```bash
# 1. Obter token JWT
TOKEN=$(curl -s -X POST http://<host>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<senha>"}' | jq -r '.access_token')

# 2. Listar vendors
curl -s -H "Authorization: Bearer $TOKEN" \
  http://<host>/api/adoption/use-cases/vendors | python3 -m json.tool

# 3. Listar use cases de um vendor (ex: vendor_id=1)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://<host>/api/adoption/use-cases?vendor_id=1" | python3 -m json.tool

# 4. Listar exit criteria (ex: uc_ids=1,2,3)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://<host>/api/adoption/use-cases/exit-criteria?uc_ids=1,2,3" | python3 -m json.tool
```

### 4.2 Checklist de validação

- [ ] `GET /api/adoption/use-cases/vendors` retorna lista com ao menos um vendor
- [ ] `GET /api/adoption/use-cases?vendor_id=<id>` retorna use cases para um vendor com dados
- [ ] `GET /api/adoption/use-cases/exit-criteria?uc_ids=<ids>` retorna exit criteria
- [ ] Página `/adoption/use-cases` carrega sem erros no frontend
- [ ] Filtros cascata (Vendor → Architecture → Product → Use Case) funcionam
- [ ] Navegação prev/next de use cases funciona
- [ ] Navegação prev/next de exit criteria funciona (quando disponível)
- [ ] Usuários com permissão `adoption.use_case` conseguem acessar a página
- [ ] Usuários sem permissão são redirecionados (403)

---

## 5. Configuração de Produção

### 5.1 Cache das Queries (React Query)

| Query | staleTime | Comportamento |
|-------|-----------|---------------|
| `/vendors` | 10 min | Revalidado após 10 min de inatividade |
| `?vendor_id=` | 5 min | Revalidado após 5 min de inatividade |
| `/exit-criteria` | 5 min | Revalidado após 5 min de inatividade |

O botão **Refresh** incrementa o `refreshKey` e força refetch imediato de todas as queries.

### 5.2 Performance

- A query `/api/adoption/use-cases?vendor_id=` retorna **todos** os use cases do vendor de uma vez. Filtros adicionais (Architecture, Primary Product, Use Case) são aplicados client-side para evitar múltiplas round-trips ao servidor.
- A query `/exit-criteria?uc_ids=` também retorna exit criteria para **todos** os UCs do filtro atual, não apenas o UC visível. Isso evita uma nova requisição ao navegar entre use cases.
- Para vendors com grande volume de use cases (> 500), avaliar implementação de paginação server-side.

---

## 6. Estrutura de Arquivos

```
frontend/
└── src/
    └── pages/
        └── adoption/
            └── UseCasesPage.tsx          ← Página principal

backend/
└── app/
    └── adoption/
        ├── extras_service.py             ← get_use_case_vendors(), get_use_cases_by_vendor(), get_exit_criteria_by_uc_ids()
        └── extras_router.py             ← usecase_router (/api/adoption/use-cases/*)

src/
└── infrastructure/
    └── database/
        └── repositories/
            └── use_case_repository.py    ← UseCaseRepository

docs/
└── 02_application/adoption/use_cases.md ← Documentação funcional
└── 07_api/use_cases_endpoints.md        ← Documentação de API
└── 05_deployment/use_cases/             ← Este arquivo
    └── use_cases_overview.md
```

---

## 7. Logs e Monitoramento

Função de serviço relevante para monitorar:

```
[extras_service] get_use_case_vendors: <erro>
[extras_service] get_use_cases_by_vendor: <erro>
[extras_service] get_exit_criteria_by_uc_ids: <erro>
```

Todos os erros são capturados com `logger.error(f"...: {e}\n{traceback.format_exc()}")` e retornam lista vazia `[]` sem propagar exceção — a página exibirá "No data available." em vez de erro 500.

Para diagnóstico de dados vazios sem erro 500:
1. Verificar logs do backend no nível `ERROR`
2. Testar os endpoints diretamente (ver seção 4.1)
3. Verificar conectividade com o banco MariaDB

---

## 8. Rollback

Caso seja necessário reverter para o estado anterior (placeholder `DataTablePage`):

```tsx
// frontend/src/pages/adoption/UseCasesPage.tsx
import DataTablePage from "@/components/ui/DataTablePage";
export default function UseCasesPage() {
  return <DataTablePage title="Use Cases" subtitle="Customer Use Case Applicability & Exit Criteria" endpoint="/adoption/use-cases" queryKey={["use-cases"]} searchField="customer_name" maxCols={10} />;
}
```

Os endpoints de backend mantêm retrocompatibilidade — o endpoint legado `GET /api/adoption/use-cases` sem parâmetros continua retornando `[]` sem erro.
