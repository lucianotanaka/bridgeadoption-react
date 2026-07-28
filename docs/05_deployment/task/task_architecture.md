# TASK – Arquitetura Técnica (Developer Guide)

Este documento é direcionado a desenvolvedores que atuam na evolução do módulo TASK.

---

# 1️⃣ Estrutura Física

Localização:

```
webapp/pages/task/
```

Principais arquivos:

- task.py (entry point)
- task_detail.py
- task_activity.py
- task_activity_detail.py
- task_activity_new.py
- task_new.py
- task_filter_next_follow_up.py
- task_filter_report.py
- task_lci_viabilility.py
- task_report_task_list.py
- task_report_task_detail.py

---

# 2️⃣ Padrão Arquitetural

O módulo segue:

✅ Repository Pattern  
✅ Separação parcial entre UI e persistência  
✅ Estado controlado por `st.session_state`  
✅ Recarregamento via `st.rerun()`  

---

# 3️⃣ Fluxo Técnico Interno

### Update de Activity

1. Coleta alterações
2. Monta `update_record`
3. Monta `history_log`
4. Chama `edit_activity_submit`
5. Atualiza banco
6. Recarrega registro atualizado
7. Reclassifica status
8. Sincroniza DataFrame
9. Rerun

---

# 4️⃣ Uso Intensivo de session_state

Chaves críticas:

- task_id
- selected_activity_id
- filtered_activity_df
- refresh_trigger
- container_history_activity_visibled
- history_update

Problemas comuns:
- Variável inexistente
- Estado inconsistente entre reruns
- Falta de inicialização

---

# 5️⃣ Estratégia de Sincronização

Evita reload completo usando:

```
sync_dataframes(...)
```

Atualiza somente registro alterado.

---

# 6️⃣ Pontos de Atenção para Refatoração

⚠️ Regras de negócio misturadas com UI  
⚠️ Dependência alta de session_state  
⚠️ Uso repetido de lógica de validação  
⚠️ Risco de NameError por escopo incorreto  

---

# 7️⃣ Estratégia Recomendada para Evolução

- Extrair validações para camada de serviço
- Criar camada de domínio mais isolada
- Reduzir dependência de rerun
- Introduzir testes unitários nos repositories

---

Documento técnico para desenvolvedores.
