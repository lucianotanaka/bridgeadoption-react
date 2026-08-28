# Cisco Enterprise Agreement (EA)

> **Público:** CSMs, GMs e gestores  
> **Onde encontrar:** Menu lateral → **Portfolio** → **Cisco EA**  
> **Última atualização:** 2026-08

---

## O que é o Cisco EA?

O módulo **Cisco EA** (Enterprise Agreement) é o painel de gestão de licenças do programa Cisco Enterprise Agreement. Ele oferece visibilidade completa do consumo de licenças por cliente, com monitoramento preventivo do **True Forward** — o mecanismo da Cisco pelo qual o cliente é cobrado pelo pico de consumo atingido durante o contrato.

O módulo está organizado em duas abas principais:

| Aba | Para que serve |
|---|---|
| **Metering** | Acompanhar o consumo atual de licenças por suite |
| **True Forward** | Analisar o consumo excedente e o risco financeiro |

---

## Aba Metering — Consumo de Licenças

### O que é o Metering?

O **Metering** exibe o snapshot mais recente do consumo de licenças EA por cliente e suite. Ele permite entender o quanto de cada solução está sendo utilizado em relação ao que foi contratado.

### Como usar

1. No campo **Cliente**, selecione um ou mais clientes para filtrar (multiselect com busca)
2. Os dados carregam automaticamente

### KPIs exibidos

| KPI | Significado |
|---|---|
| **EA Gerado** | Total de licenças geradas/consumidas |
| **Total Contratado** | Total de licenças contratadas no EA |
| **Total Gerado** | Total efetivamente gerado no período |

### Gráfico de consumo

O gráfico exibe o **percentual de consumo por suite** — cada barra representa uma suite Cisco e o quanto do contratado está sendo utilizado.

### Tabela de detalhes

A tabela (visível somente quando há pelo menos um cliente selecionado) mostra o consumo detalhado por SKU (código de produto) e subscription.

---

## Aba True Forward — Consumo Excedente

### O que é o True Forward?

O **True Forward** é o mecanismo da Cisco pelo qual, se o cliente consumir mais licenças do que o contratado durante o período de vigência, a Cisco cobra a diferença no próximo período de renovação. Isso é chamado de **overage** (consumo excedente).

O objetivo do módulo é **antecipar** esse risco — identificando clientes que estão se aproximando ou ultrapassando os limites contratados antes da cobrança acontecer.

### Como usar

#### Filtros disponíveis

| Filtro | Descrição |
|---|---|
| **Cliente** | Filtrar por cliente (multiselect) |
| **Suite** | Suite Cisco (ex: Collaboration, Security) |
| **Status** | Status do consumo |
| Outros | Filtros adicionais conforme disponibilidade dos dados |

#### KPIs do True Forward

O painel exibe **6 KPIs** principais que mostram o panorama do consumo excedente:

- Clientes em overage
- Valor estimado de True Forward
- Subscriptions em risco
- Taxa de consumo médio
- Pico de consumo
- Comparativo contratado × consumido

#### Gráficos

4 gráficos interativos apresentam:
- Distribuição de consumo por suite
- Evolução temporal do consumo
- Comparativo contratado vs. consumido
- Clientes com maior risco de True Forward

#### Sub-aba CCW Subscriptions

Dentro do True Forward, a sub-aba **CCW Subscriptions** exibe as subscriptions importadas do portal CCW da Cisco, com 7 filtros multiselect para análise detalhada:

- Subscription ID
- Suite
- Status
- Data de início/fim
- E outros conforme configuração

---

## O que fazer quando há overage?

Quando um cliente está em **overage** (consumo excedente):

1. Verifique o valor estimado do True Forward na aba
2. Identifique quais suites/SKUs estão com consumo acima do contratado
3. Crie uma tarefa de **"Consumo Excedente: CISCO EA"** no módulo Tasks para acompanhar a tratativa com o cliente
4. Discuta com o cliente sobre ajuste de contrato ou redução de consumo

> As tarefas de tipo "Consumo Excedente: CISCO EA" ficam vinculadas automaticamente aos dados de True Forward, facilitando o rastreamento.

---

## Dicas de uso

- Acesse o **Metering** regularmente para acompanhar a evolução do consumo antes que vire overage.
- Use a **CCW Subscriptions** para auditar todas as subscriptions ativas e seus status no portal Cisco.
- Configure alertas acompanhando clientes com consumo acima de 80% do contratado — eles são candidatos a True Forward na próxima renovação.
- Os dados são importados automaticamente — use o botão **Refresh** para ver os dados mais recentes.

---

## Ver também

- [Visão Geral do Cliente](./visao_geral_cliente.md) — visão 360° integrando EA, SA e True Forward
- [Ativos e Contratos](./assets.md) — portfólio detalhado de ativos
- [Rebate e Oportunidades](../05_adoption/rebate.md) — incentivos financeiros Cisco relacionados ao EA
