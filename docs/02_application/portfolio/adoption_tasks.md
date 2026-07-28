# Módulo Adoption Tasks — Portfolio

> **Rota:** `/portfolio/adoption-tasks`  
> **resource_key:** `portfolio.adoption_tasks`  
> **Arquivo frontend:** `frontend/src/pages/portfolio/AdoptionTasksPage.tsx`

---

## 1. Propósito

Visão das tarefas de adoção tecnológica filtradas por cliente — permite ao time ver o estado das tarefas de um cliente específico sem precisar navegar pelo módulo Tasks global.

---

## 2. Componentes

- Filtros: cliente, CSM, status, prioridade, categoria
- Tabela de tarefas com paginação
- Colunas: tarefa, cliente, CSM, prioridade, status, próximo follow-up

---

## 3. Endpoints

```
GET /api/portfolio/adoption-tasks?client_id=XXX&status=active
