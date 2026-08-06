# TASK – Fluxos Técnicos (Diagramas Lógicos) (Legado Streamlit)

> ⚠️ **Este documento descreve a implementação original em Streamlit.** Para a versão React, consulte `docs/02_application/module_tasks.md`.

Este documento descreve os principais fluxos internos do módulo TASK (versão Streamlit, legado).

---

# 1️⃣ Fluxo: Update de Activity

## Sequência Lógica

```
Usuário
  ↓
Clica em SAVE
  ↓
task_activity_detail.py
  ↓
Validação (Follow Up + Update obrigatório)
  ↓
Monta update_record + history_log
  ↓
edit_activity_submit()
  ↓
TaskActivityRepository.update()
  ↓
TaskHistoryRepository.insert()
  ↓
Recarrega Activity do banco
  ↓
reclassify_status()
  ↓
sync_dataframes()
  ↓
Atualiza session_state.filtered_activity_df
  ↓
st.rerun()
```

---

# 2️⃣ Fluxo: Criação de Task

```
Usuário
  ↓
task_new.py
  ↓
Validação campos obrigatórios
  ↓
TaskRepository.insert()
  ↓
Mensagem de sucesso
  ↓
Redirecionamento (via session_state)
```

---

# 3️⃣ Fluxo: Sincronização de DataFrame

Problema resolvido por:

```
sync_dataframes(activity_df, edited_activity_df, key_column="activity_id")
```

Objetivo:
- Atualizar somente a Activity alterada
- Evitar reload completo da página
- Manter performance

---

# 4️⃣ Fluxo: Validação Follow Up

Se status NÃO estiver em:
```
{4,5,6,10}
```

Então:
- Next Follow Up é obrigatório
- Campo Update é obrigatório

Caso contrário:
- Permite salvar sem Follow Up

---

# 5️⃣ Fluxo de Permissão

```
Verifica status final?
    Sim → Bloqueia
    Não ↓
Verifica Owner?
    Sim → Permite
    Não ↓
Verifica ADMIN?
    Sim → Permite
    Não → Bloqueia
```

---

Documento técnico para desenvolvedores e sustentação avançada.
