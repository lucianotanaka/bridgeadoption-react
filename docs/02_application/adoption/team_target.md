# Módulo Team Target — Adoption

> **Rota:** `/adoption/team-target`  
> **resource_key:** `adoption.report_team_target`  
> **Arquivo frontend:** `frontend/src/pages/adoption/TeamTargetPage.tsx`

---

## 1. Propósito

Painel de acompanhamento das metas de adoção da equipe — compara metas definidas vs realizado por CSM e por período, permitindo ao gestor monitorar o desempenho individual e coletivo do time.

---

## 2. Componentes (frontend)

| Componente | Descrição |
|---|---|
| Seletor de período | Ano fiscal ou trimestre NTT |
| Tabela por CSM | Meta, Realizado, % Atingimento, Status |
| Indicadores de cor | Verde (≥100%), Amarelo (70–99%), Vermelho (<70%) |
| Totalizadores | Linha de totais ao final da tabela |

---

## 3. Regras de negócio

### Cálculo de atingimento
```
pct_atingimento = (realizado / meta) × 100
```

### Indicadores de status
| % Atingimento | Cor | Status |
|---|---|---|
| ≥ 100% | 🟢 Verde | Meta atingida |
| 70% – 99% | 🟡 Amarelo | Em progresso |
| < 70% | 🔴 Vermelho | Abaixo da meta |

### Metas
- Definidas pelo gestor via **Admin → Team Goals**
- Armazenadas em `tbAdoptionTeamGoal`
- Podem ser definidas por CSM individual ou para toda a equipe

---

## 4. Endpoint

```
GET /api/adoption/team-target?fiscal_year=FY2026
```

---

## 5. Backend

**Arquivo:** `backend/app/adoption/extras_service.py`

---

## 6. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Tabela vazia | Sem metas cadastradas | Cadastrar via Admin → Team Goals |
| % incorreto | Meta zerada | Verificar tbAdoptionTeamGoal |
