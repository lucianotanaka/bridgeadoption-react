# Módulo LCI Status — Adoption

> **Rota:** `/adoption/lci-status` e `/adoption/lci-solution-vs-project`  
> **resource_key:** `adoption.report_lci_eligible_status`  
> **Arquivos frontend:** `LCIStatusPage.tsx`, `LCISolutionVsProjectPage.tsx`

---

## 1. Propósito

Status de elegibilidade LCI por cliente e solução. Duas visões complementares:
1. **Eligible Status** — quais clientes/soluções são elegíveis para o incentivo LCI
2. **Solution vs Project** — análise cruzada de soluções com projetos vinculados ao LCI

---

## 2. Eligible Status

### Componentes
- Filtros: CSM, Cliente, Solução, Status de elegibilidade
- Tabela: Cliente, Solução, Estágio atual, Elegível (Sim/Não), Motivo

### Regras
- Elegibilidade definida por: produto, estágio LCI atingido, critérios da Cisco
- "Não elegível" pode ser por: produto fora do programa, estágio insuficiente, cliente já aprovado

---

## 3. Solution vs Project

### Componentes
- Tabela cruzada: Solução × Projeto × Status LCI
- Filtros: solução, projeto, status

### Regras
- Cada solução pode estar vinculada a um ou mais projetos
- O status reflete o andamento do projeto no contexto LCI

---

## 4. Endpoints

```
GET /api/adoption/lci-status
GET /api/adoption/lci-solution-vs-project
```

---

## 5. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Lista vazia | Sem dados de elegibilidade | Verificar importação de dados Cisco LCI |
| Status incorreto | Critérios desatualizados | Atualizar parâmetros de elegibilidade |
