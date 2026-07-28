# Módulo Farol — Portfolio

> **Rota:** `/portfolio/farol`  
> **resource_key:** `portfolio.farol`  
> **Arquivo frontend:** `frontend/src/pages/portfolio/FarolPage.tsx`

---

## 1. Propósito

Semáforo visual de saúde dos clientes — indica de forma rápida quais contas estão em situação crítica, de atenção ou saudável, permitindo priorização imediata pelo time de CSMs.

---

## 2. Indicadores de cor

| Cor | Significado |
|---|---|
| 🟢 Verde | Cliente saudável — adoção em dia |
| 🟡 Amarelo | Atenção — há pontos de melhoria |
| 🔴 Vermelho | Crítico — intervenção necessária |

---

## 3. Componentes

- Grid de cards por cliente com cor do semáforo
- Filtros: CSM, status, período
- Drill-down ao clicar em um cliente → detalhes da situação

---

## 4. Endpoint

```
GET /api/portfolio/farol
```

---

## 5. Backend

**Arquivo:** `backend/app/modules/sections_service.py`

---

## 6. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Farol sem dados | Job de atualização não executou | Verificar cron job de atualização do Farol |
| Cor incorreta | Critérios desatualizados | Verificar parâmetros de saúde no banco |
