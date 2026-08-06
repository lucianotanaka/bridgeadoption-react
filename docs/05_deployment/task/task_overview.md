# TASK – Visão Geral Funcional (Legado Streamlit)

> ⚠️ **Este documento descreve a implementação original em Streamlit** (`webapp/pages/task/*.py`), mantida como referência histórica.

## 1. Objetivo do Módulo

O módulo TASK é responsável por:

- Gestão de Tasks (entidade pai)
- Gestão de Activities (entidade filha)
- Controle de status
- Controle de Follow Up
- Registro de histórico (log)
- Geração de relatórios

---

## 2. Estrutura Hierárquica

```
Task
 ├── Activity 1
 ├── Activity 2
 └── Activity N
```

- Uma Task pode ter múltiplas Activities.
- Activities possuem histórico próprio.
- Status de Task pode impactar edição de Activity.

---

## 3. Fluxo Funcional do Usuário

### 1️⃣ Usuário acessa TASK
Arquivo:
```
task.py
```

### 2️⃣ Aplica filtros
- Next Follow Up
- Report Filter

### 3️⃣ Seleciona Task
Abre:
```
task_detail.py
```

### 4️⃣ Visualiza / edita Activities
Lista:
```
task_activity.py
```

Detalhe:
```
task_activity_detail.py
```

Nova:
```
task_activity_new.py
```

---

## 4. Conceitos Importantes

### ✅ Follow Up
- Obrigatório para status não finais
- Gera histórico

### ✅ Status Final
IDs:
```
{4, 5, 6, 10}
```
Bloqueiam edição.

### ✅ Permissões
- ADMIN
- Owner
- Temp Owner
- Manager

---

## 5. Principais Dependências

- session_state
- Repositórios (Repository Pattern)
- DataFrame sincronizado em memória
- st.rerun()

---

Documento funcional para sustentação.
