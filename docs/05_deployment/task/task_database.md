# TASK – Banco de Dados Envolvido

Este documento mapeia as principais tabelas e repositórios utilizados pelo módulo TASK.

---

# 1️⃣ Tabela: tbTask

Representa a entidade principal (Task).

## Campos relevantes (exemplos)

- task_id (PK)
- task_name
- task_status_id
- task_owner_id
- task_temp_owner_id
- task_start
- task_end
- task_value
- task_currency

## Repositório

```
TaskRepository
```

Responsável por:
- insert
- update
- select
- filtros

---

# 2️⃣ Tabela: tbTaskActivity

Representa as Activities vinculadas à Task.

## Relacionamento

```
tbTask.task_id → tbTaskActivity.activity_task_id
```

## Campos críticos

- activity_id (PK)
- activity_task_id (FK)
- activity_seq
- activity_status_id
- activity_completed
- activity_start_performed
- activity_end_performed
- activity_effort_performed
- activity_value
- activity_currency

## Repositório

```
TaskActivityRepository
```

Métodos principais:
- insert()
- update()
- get_activity()
- list_by_task()

---

# 3️⃣ Tabela: tbTaskHistory

Armazena logs de alterações.

## Campos principais

- taskrecord_id (PK)
- taskrecord_task_id
- taskrecord_activity_id
- taskrecord_remark
- taskrecord_next_followup
- taskrecord_updated_by
- taskrecord_date

## Repositório

```
TaskHistoryRepository
```

Métodos:
- insert()
- get_history()

---

# 4️⃣ Tabela: StatusType

Utilizada para catálogo de status.

## Campos

- statustype_id
- statustype_name
- statustype_name_pt
- statustype_name_es

## Repositório

```
StatusTypeRepository
```

---

# 5️⃣ Relação Geral das Entidades

```
tbTask
   │
   ├── tbTaskActivity
   │       │
   │       └── tbTaskHistory
   │
   └── StatusType
```

---

# 6️⃣ Pontos Críticos para Sustentação

✅ Se Activity não atualiza:
- Verificar update no TaskActivityRepository

✅ Se histórico não grava:
- Verificar insert no TaskHistoryRepository

✅ Se status não traduz:
- Verificar StatusTypeRepository

✅ Se dados inconsistentes:
- Conferir integridade FK entre task_id e activity_task_id

---

Documento técnico para entendimento de persistência.
