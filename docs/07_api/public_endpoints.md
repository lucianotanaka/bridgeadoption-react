# API — Public Endpoints

> **Base URL:** `/api/public`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **resource_key:** `public.importer` (importer), `public.csm_account` (CSM account)
> **Última atualização:** 2026-08-16

---

## Autenticação

Todos os endpoints requerem token JWT válido obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## GET `/api/public/csm-account`

Retorna dados de conta CSM do AccountTeam.

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `customer_id` | int | Não | Filtra por ID de cliente |

**Response:** `200 OK`
```json
[
  {
    "customer_id": 123,
    "customer_name": "Empresa XPTO",
    "csm_name": "Alan Pimentel",
    "csm_email": "alan@nttdata.com"
  }
]
```

---

## GET `/api/public/importer/history`

Retorna histórico de importações da tabela `tbImportControl`.

**Query Params:**

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `limit` | int | Não | `50` | Quantidade máxima de registros (1–500) |
| `started_by` | string | Não | — | Filtra pelo `user_name` do responsável |

**Response:** `200 OK`
```json
[
  {
    "importctrl_id": 42,
    "importctrl_source": "CiscoLCITask",
    "importctrl_file": "tasks_agosto.xlsx",
    "importctrl_status": "FINISHED",
    "importctrl_message": "Agendado para 2026-08-16 10:00:00",
    "importctrl_started": "2026-08-16T10:00:05",
    "importctrl_ended": "2026-08-16T10:02:31",
    "importctrl_started_by": "luciano.tanaka"
  }
]
```

**Possíveis valores de `importctrl_status`:**

| Valor | Significado |
|-------|-------------|
| `PENDING` | Aguardando execução pelo cron |
| `RUNNING` | Em execução |
| `FINISHED` | Concluída com sucesso |
| `FAILED` | Concluída com erro |
| `CANCELLED` | Cancelada |

---

## GET `/api/public/importer/import-types`

Lista os tipos de importação disponíveis.

**Sem parâmetros.**

**Response:** `200 OK`
```json
[
  { "label": "Subscription CCW",                                  "source": "CiscoSubscriptionCCW" },
  { "label": "Cisco LCI - Task (6702)",                          "source": "CiscoLCITask" },
  { "label": "Cisco LCI - Activity (5890)",                      "source": "CiscoLCIActivity" },
  { "label": "Cisco SmartAccount Usage Fetcher (Apollo)",        "source": "CiscoSmartAccountUsageFetcher" },
  { "label": "Cisco Enterprise Agreement Usage Fetcher (Apollo)","source": "CiscoEnterpriseAgreementUsageFetcher" }
]
```

---

## GET `/api/public/importer/files`

Lista arquivos `.xlsx` disponíveis em `/home/bridgeadoption/storage/input/` que **ainda não** foram usados em nenhum agendamento (`tbImportControl`).

**Sem parâmetros.**

**Response:** `200 OK`
```json
["tasks_agosto.xlsx", "activities_q3.xlsx"]
```

**Notas:**
- Retorna lista vazia `[]` se não há arquivos disponíveis
- Arquivos já usados em qualquer agendamento (independente do status) são excluídos

---

## GET `/api/public/importer/occupied-slots`

Retorna os slots de data/hora já ocupados por importações `PENDING` ou `RUNNING` nos próximos N dias.

**Query Params:**

| Param | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| `days_ahead` | int | Não | `7` | Janela de dias a consultar (1–30) |

**Response:** `200 OK`
```json
[
  "2026-08-16T10:00:00",
  "2026-08-16T14:30:00",
  "2026-08-17T09:00:00"
]
```

**Notas:**
- Slots são normalizados para múltiplos de 30 minutos (ex.: `10:15` → `10:00`)
- Formato ISO 8601 sem timezone (hora local do servidor)

---

## POST `/api/public/importer/upload`

Faz upload de um arquivo `.xlsx` para `/home/bridgeadoption/storage/input/`.

**Content-Type:** `multipart/form-data`

**Form Data:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `file` | File | Sim | Arquivo `.xlsx` (máx. 50 MB) |

**Response:** `200 OK`
```json
{
  "success": true,
  "saved_name": "tasks_agosto.xlsx",
  "error": null
}
```

**Erros:**

| Código | Motivo |
|--------|--------|
| `400` | Extensão inválida (não é `.xlsx`) |
| `413` | Arquivo excede 50 MB |
| `500` | Erro ao salvar no sistema de arquivos |

**Notas:**
- Se já existir arquivo com o mesmo nome, o novo receberá sufixo incremental: `tasks_agosto(1).xlsx`, `tasks_agosto(2).xlsx`, etc.
- Arquivo salvo com permissão `0600`

---

## POST `/api/public/importer/schedule`

Cria um agendamento de importação com status `PENDING` em `tbImportControl`.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "source": "CiscoLCITask",
  "file_name": "tasks_agosto.xlsx",
  "scheduled_at": "2026-08-16T10:00:00",
  "started_by": "luciano.tanaka"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `source` | string | Sim | Identificador interno do tipo de importação |
| `file_name` | string | Sim | Nome do arquivo em `storage/input/` |
| `scheduled_at` | string (ISO 8601) | Sim | Data/hora de agendamento |
| `started_by` | string | Não | `user_name` do responsável (extraído do JWT se ausente) |

**Response:** `200 OK`
```json
{
  "success": true,
  "importctrl_id": 43,
  "error": null
}
```

**Erros:**

| Código | Motivo |
|--------|--------|
| `400` | Campos obrigatórios ausentes |
| `400` | Já existe agendamento PENDING/RUNNING para esse arquivo |
| `500` | Erro de banco de dados |

---

## GET `/api/public/importer/{importctrl_id}/log`

Retorna o conteúdo do arquivo de log associado a uma importação.

**Path Params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `importctrl_id` | int | ID da importação em `tbImportControl` |

**Response:** `200 OK`
```json
{
  "found": true,
  "content": "2026-08-16 10:00:05 [INFO] Iniciando importação CiscoLCITask\n2026-08-16 10:02:31 [INFO] 1523 registros importados com sucesso\n",
  "log_path": "/home/bridgeadoption/storage/logs/tasks_agosto.log",
  "error": null
}
```

**Quando log não existe:**
```json
{
  "found": false,
  "content": "",
  "log_path": "/home/bridgeadoption/storage/logs/tasks_agosto.log",
  "error": null
}
```

**Padrão de nome do arquivo de log:** `{stem_do_arquivo_origem}.log`
Exemplo: `tasks_agosto.xlsx` → `tasks_agosto.log`

---

## GET `/api/public/importer/{importctrl_id}/failed-rows`

Retorna as linhas com falha processadas pelo cron para uma importação.

**Path Params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `importctrl_id` | int | ID da importação em `tbImportControl` |

**Response:** `200 OK`
```json
{
  "found": true,
  "rows": [
    { "ROW_NUMBER": 15, "CUSTOMER_NAME": "ACME Corp", "ERROR": "Customer not found in database" },
    { "ROW_NUMBER": 42, "CUSTOMER_NAME": null, "ERROR": "Missing required field: CUSTOMER_NAME" }
  ],
  "columns": ["ROW_NUMBER", "CUSTOMER_NAME", "ERROR"],
  "failed_path": "/home/bridgeadoption/storage/output/tasks_agosto_failed_rows.xlsx",
  "error": null
}
```

**Quando arquivo de falhas não existe:**
```json
{
  "found": false,
  "rows": [],
  "columns": [],
  "failed_path": null,
  "error": null
}
```

**Padrão de nome:** `{stem}_failed_rows.xlsx` em `storage/output/`
Exemplo: `tasks_agosto.xlsx` → `tasks_agosto_failed_rows.xlsx`

---

## Códigos de Resposta Globais

| Código | Significado |
|--------|-------------|
| `200` | Sucesso |
| `400` | Requisição inválida (ver `detail` na resposta) |
| `401` | Token JWT inválido ou expirado |
| `403` | Sem permissão para o recurso |
| `413` | Arquivo muito grande (upload) |
| `422` | Parâmetros de query inválidos (FastAPI) |
| `500` | Erro interno do servidor (ver logs do backend) |
