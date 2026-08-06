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
