# Módulo Use Cases — Adoption

> **Rota:** `/adoption/use-cases`  
> **resource_key:** `adoption.use_case`  
> **Arquivo frontend:** `frontend/src/pages/adoption/UseCasesPage.tsx`

---

## 1. Propósito

Gerenciamento dos casos de uso tecnológicos aplicáveis a cada cliente. Permite visualizar quais casos de uso foram identificados, seu grau de aplicabilidade e os critérios de saída (exit criteria) para cada um.

---

## 2. Componentes (frontend)

| Componente | Descrição |
|---|---|
| Lista de casos de uso | Agrupados por cliente ou solução |
| Aplicabilidade | Indicador se o caso de uso se aplica ao cliente |
| Exit Criteria | Status de cada critério de saída do caso de uso |
| Filtros | Por cliente, solução, status de aplicabilidade |

---

## 3. Regras de negócio

### Aplicabilidade
Cada caso de uso é avaliado para cada cliente e marcado como:
- **Aplicável** — o cliente tem o produto/requisito para este use case
- **Não aplicável** — o cliente não tem o produto ou contexto necessário
- **A avaliar** — ainda não foi feita a análise

### Exit Criteria (Critérios de saída)
Cada caso de uso tem critérios específicos que precisam ser atingidos para ser considerado "adotado". Por exemplo:
- % de usuários ativos usando a feature
- Configuração específica habilitada
- Treinamento concluído

### Status do use case
| Status | Significado |
|---|---|
| Não iniciado | Exit criteria não avaliados |
| Em andamento | Alguns critérios atingidos |
| Completo | Todos os critérios atingidos |

---

## 4. Endpoints

```
GET /api/adoption/use-cases?client_id=XXX
GET /api/adoption/use-cases/exit-criteria?use_case_id=XXX
```

---

## 5. Backend

**Arquivo:** `backend/app/adoption/extras_service.py`

Tabelas: `tbUseCase`, `tbUseCaseExitCriteria`, `tbUseCaseApplicability`

---

## 6. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Use cases sem exit criteria | Configuração incompleta | Verificar tbUseCaseExitCriteria |
| Aplicabilidade incorreta | Dados desatualizados | Reavaliação manual via interface |
