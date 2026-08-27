# TASK – Troubleshooting Avançado (Legado Streamlit)

> ⚠️ **Este documento descreve a implementação original em Streamlit.** Para troubleshooting da versão React, consulte a seção 6 de `docs/02_application/module_tasks.md`.

Este documento auxilia o time de sustentação e desenvolvedores na investigação de problemas do módulo TASK (versão Streamlit, legado).

---

# 1️⃣ Activity não salva

## Sintoma
Usuário clica em SAVE e nada acontece.

## Verificar:

✅ Status está em estado final?  
IDs finais:
```
{4, 5, 6, 10}
```

✅ Follow Up obrigatório foi preenchido?

✅ Campo Update foi preenchido?

✅ Existe validação disparando `st.rerun()` antes do update?

---

# 2️⃣ Erro: NameError

## Sintoma
Erro como:
```
NameError: name 'update_record' is not defined
```

## Causa comum:
- Variável declarada dentro de escopo diferente
- Uso fora do bloco `if st.button`

## Solução:
- Garantir que variável esteja no escopo correto
- Passar como parâmetro de função

---

# 3️⃣ Histórico não aparece

## Verificar:

- TaskHistoryRepository.get_history()
- Se activity_id correto está sendo passado
- Se container_history_activity_visibled está True
- Se refresh_trigger foi atualizado

---

# 4️⃣ DataFrame não atualiza

## Verificar:

- Uso de `sync_dataframes`
- Se key_column correto está sendo usado
- Se registro foi realmente recarregado do banco
- Se st.session_state.filtered_activity_df foi atualizado

---

# 5️⃣ Permissão bloqueando edição

## Verificar:

- task_status_id
- task_owner_id
- task_temp_owner_id
- roles do usuário
- permissão "full"

---

# 6️⃣ Problemas com rerun infinito

Pode ocorrer se:
- refresh_trigger é alterado constantemente
- Validação sempre gera pendência
- session_state não é limpo corretamente

---

# 7️⃣ Estratégia de Debug

✅ Inserir logs temporários  
✅ Verificar valores no session_state  
✅ Testar repositories isoladamente  
✅ Validar retorno booleano do update()  

---

# 8️⃣ Checklist Rápido

Antes de abrir incidente:

- [ ] Status correto?
- [ ] Follow Up válido?
- [ ] Histórico sendo criado?
- [ ] Repository retornando True?
- [ ] session_state consistente?

---

Documento avançado para sustentação e desenvolvimento.

---

# TASK – Troubleshooting React (versão atual)

> **Atualizado em:** 2026-08-27

---

## R1️⃣ Activity com campos bloqueados mesmo com status "OPEN"

### Sintoma
A activity exibe o status "OPEN" no badge, mas todos os campos estão desabilitados (read-only).

### Causa raiz
`tbTaskActivity.activity_status` (INT FK) contém um valor em `{4, 5, 6, 10}` (status encerrado), mas o campo `activity_status_name` (VARCHAR, se existir) está desatualizado mostrando "OPEN". O `isClosed = CLOSED_STATUS.has(activity_status)` usa o INT → correto → campos bloqueados.

### Diagnóstico
```sql
SELECT activity_id, activity_status
FROM tbTaskActivity
WHERE activity_task_id = <task_id>;
-- Se activity_status IN (4,5,6,10) → correto, activity está encerrada
```

### Solução
Verificar inconsistência de dados e corrigir:
```sql
-- Sincroniza activity_status_name com o valor real do INT FK
UPDATE tbTaskActivity a
JOIN tbStatusType s ON s.statustype_id = a.activity_status
SET a.activity_status_name = s.statustype_name
WHERE a.activity_status_name IS NULL
   OR a.activity_status_name != s.statustype_name;

-- Se quiser reabrir a activity:
UPDATE tbTaskActivity
SET activity_status = 1,
    activity_status_name = 'OPEN'
WHERE activity_id = <activity_id>;
```

---

## R2️⃣ Activity salva ("✓ Salvo") mas status não atualiza na tela

### Sintoma
Após mudar o status de uma activity (ex: "IN PROGRESS" → "ON HOLD") e clicar "Salvar":
- "✓ Salvo" aparece na tela
- O histórico registra "Status → ON HOLD"
- Mas o select de status continua mostrando "IN PROGRESS"

### Causa raiz
O payload de `updateActivity` contém `activity_status_name`, coluna que **não existe em `tbTaskActivity`**. O `UPDATE` falha com `Unknown column 'activity_status_name' in 'field list'`, o repositório captura a exceção silenciosamente, retorna `{ "success": false }` com HTTP 200. O `Promise.all` resolve sem erro (histórico salvo em chamada separada), `onSuccess` é disparado, mas o banco não foi alterado.

### Diagnóstico
No console do browser, verificar a resposta de `PUT /api/tasks/activities/{id}`:
```json
{ "success": false }
```

### Solução
Verificar se a versão do `TaskDetailPanel.tsx` enviava `activity_status_name` no payload:
```typescript
// Versão com bug (não enviar):
data.activity_status_name = edits.activity_status_name;

// Versão correta (somente o INT FK):
data.activity_status = found.statustype_id;
```
Confirmar que o fix está aplicado em `frontend/src/pages/tasks/TaskDetailPanel.tsx`.

---

## R3️⃣ `reclassify_status` não identifica activities encerradas como tal

### Sintoma
Activities com `activity_status IN (4, 5, 6, 10)` aparecem como "DELAYED" na reclassificação quando `activity_end_performed < today`.

### Causa raiz
`src/domain/status_reclassification.py` usava `col_status_id = "activity_status_id"` para activities, mas a coluna real em `tbTaskActivity` é `activity_status` (sem sufixo `_id`). A verificação de status encerrado era bypassada pois a coluna não existia no DataFrame.

### Solução
Confirmar que `reclassify_status` usa o nome correto:
```python
elif type_df == "activity":
    col_status_id = "activity_status"   # correto ✅
    # NÃO: col_status_id = "activity_status_id"  ← bug
```
Arquivo: `z:/bridgeadoption/src/domain/status_reclassification.py`

---

## R4️⃣ Usuário sem permissão consegue editar campos da task

### Sintoma
Usuário que não é dono da task nem admin consegue alterar campos no `TaskDetailPanel`.

### Causa raiz
Versão antiga do `TaskEditForm` usava apenas `disabled={isClosed}` sem verificar o usuário logado.

### Solução
Confirmar que `TaskDetailPanel.tsx` implementa:
```typescript
const currentUser = useAuthStore.getState().user;
const isAdmin = useAuthStore.getState().hasRole("ADMIN");
const hasTaskEdit = useAuthStore.getState().hasPermission("task.edit");
const canEdit = isOwner || isTempOwner || isAdmin || hasTaskEdit;
const isReadOnly = isClosed || !canEdit;
// Todos os campos: disabled={isReadOnly}
```

---

## R5️⃣ Opções de encerramento aparecem mesmo com activities abertas

### Sintoma
O select de status da task mostra opções como "CANCELLED" ou "COMPLETED/CLOSED" mesmo com activities ainda abertas.

### Verificar
```typescript
// No TaskEditForm, o filtro deve ser:
.filter((st) => CLOSING_STATUS_IDS.has(st.statustype_id)
  ? (canClose && !hasOpenActivities)
  : true)

// hasOpenActivities deve retornar true quando:
activities.some((a) => !CLOSED_STATUS.has(Number(a.activity_status ?? 0)))
```

---

## Checklist React (TaskDetailPanel)

- [ ] `activity_status` (INT) está correto no banco?
- [ ] `PUT /api/tasks/activities/{id}` retorna `{ "success": true }`?
- [ ] `reclassify_status` usa `activity_status` (não `activity_status_id`)?
- [ ] `isReadOnly = isClosed || !canEdit` está correto?
- [ ] `CLOSING_STATUS_IDS` filtrado quando `hasOpenActivities = true`?
- [ ] Datas de início/fim calculadas das activities? (`tasks.length > 0`)
