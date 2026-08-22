# API — Adoption Initiatives Endpoints

> **Última atualização:** 2026-08-22  
> **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`  
> **Service:** `backend/app/modules/sections_service.py` → `get_adoption_tasks()`  
> **Autenticação:** JWT Bearer (todos os endpoints exigem token válido)

---

## Endpoints

### `GET /api/portfolio/adoption-tasks`

Retorna todas as iniciativas de adoção tecnológica da view `vwTaskTechnologyAdoptionReport`.

#### Parâmetros de query

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `customer_id` | `integer` | ❌ | Filtrar por cliente específico (parâmetro legado, não utilizado pela UI React) |

#### Resposta — `200 OK`

```json
[
  {
    "task_id": 1234,
    "task_customer_name": "PETROBRAS",
    "task_type_name": "Adoção de Tecnologia CISCO: CATALYST CENTER (DNA)",
    "task_owner_name": "VITORIA GARCIA",
    "task_status_name": "IN PROGRESS",
    "task_status_id": 2,
    "task_start": "2024-09-12",
    "task_end": "2025-12-31"
  }
]
```

#### Campos retornados

| Campo | Tipo | Descrição |
|---|---|---|
| `task_id` | integer | ID da tarefa (usado para abrir Task Detail Panel) |
| `task_customer_name` | string | Nome do cliente |
| `task_type_name` | string | Nome da solução / tipo de tarefa |
| `task_owner_name` | string | Nome do CSM responsável |
| `task_status_name` | string | Nome do status (texto livre do banco) |
| `task_status_id` | integer | ID do status (usado nas regras de negócio de atraso e gráficos) |
| `task_start` | string (ISO date) | Data de início |
| `task_end` | string (ISO date) | Data de término prevista |

#### Respostas de erro

| Código | Descrição |
|---|---|
| `401` | Token JWT ausente ou expirado |
| `500` | Erro interno (view indisponível, banco sem conexão) |

---

## Endpoint complementar — Task Detail

Utilizado pelo Task Detail Panel ao clicar em uma linha da tabela (requer permissão adicional `task.task`).

### `GET /api/tasks/detail/{task_id}`

Retorna o detalhe completo de uma tarefa específica.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `task_id` | integer (path) | ✅ | ID da tarefa |

> **Documentação completa:** ver `docs/07_api/` → módulo Tasks.

---

## Fluxo de dados

```
Frontend (AdoptionInitiativesPage.tsx)
  │
  ├── useQuery(["portfolio-adoption-initiatives"])
  │     └── GET /api/portfolio/adoption-tasks
  │           └── sections_service.get_adoption_tasks()
  │                 └── TaskTechnologyAdoptionReportRepository.find_all_df()
  │                       └── SELECT * FROM vwTaskTechnologyAdoptionReport
  │
  └── useQuery(["initiative-task-detail", taskId])   [condicional: ao clicar linha]
        └── GET /api/tasks/detail/{task_id}
```

---

## Permissões (`tbAuthResource`)

| `resource_key` | `resource_name` | Módulo |
|---|---|---|
| `portfolio.adoption_initiatives` | Adoption Initiatives | Visualização do módulo |
| `task.task` | Tasks | Abertura do Task Detail Panel inline |

### Verificar no banco

```sql
SELECT resource_key, resource_name, resource_is_active
FROM tbAuthResource
WHERE resource_key IN ('portfolio.adoption_initiatives', 'task.task');
```

---

## Configuração e Deploy

### Reiniciar backend após alterações no serviço

O `sections_service.py` é carregado no startup do Gunicorn. Alterações no código Python exigem reinicialização:

```bash
sudo systemctl restart bridgeadoption-api
# ou via kill -HUP para graceful reload:
sudo kill -HUP $(cat /var/run/bridgeadoption-api.pid)
```

### Verificar se a view existe

```sql
SHOW TABLES LIKE 'vwTaskTechnologyAdoptionReport';
-- ou
SELECT COUNT(*) FROM vwTaskTechnologyAdoptionReport LIMIT 1;
```

### Verificar repositório Python

```python
# z:/bridgeadoption/src/infrastructure/database/repositories/
# task_technology_adoption_report_repository.py

class TaskTechnologyAdoptionReportRepository:
    def find_all_df(self) -> pd.DataFrame:
        conn = get_db_connection()
        try:
            return pd.read_sql("SELECT * FROM vwTaskTechnologyAdoptionReport", conn)
        finally:
            conn.close()
```

---

## Exemplo de chamada (curl)

```bash
curl -X GET "http://172.30.100.3/bridgeadoption/api/portfolio/adoption-tasks" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/json"
```

---

## Histórico de mudanças

| Data | Versão | Descrição |
|---|---|---|
| 2026-08-22 | 2.0 | Migração completa para React. Renomeado de `adoption_tasks` para `adoption_initiatives`. resource_key atualizado para `portfolio.adoption_initiatives`. Arquivo renomeado para `AdoptionInitiativesPage.tsx`. |
| 2026-08-22 | 2.0 | Correção crítica: `get_adoption_tasks()` agora chama `repo.find_all_df()` (antes tentava métodos inexistentes, retornando lista vazia). |
| Anterior | 1.0 | `AdoptionTasksPage.tsx` com `DataTablePage` genérico, sem filtros, gráficos ou Task Detail inline. |
