# Use Cases — Casos de Uso por Solução Cisco

> **Público:** CSMs, GMs e gestores  
> **Onde encontrar:** Menu lateral → **Adoption** → **Use Cases**  
> **Última atualização:** 2026-09

---

## O que é o módulo Use Cases?

O módulo **Use Cases** é uma biblioteca de referência de casos de uso de soluções Cisco, com detalhamento de aplicabilidade, benefícios, critérios de saída (exit criteria) e métricas de sucesso.

Ele serve como guia consultivo para CSMs na condução de projetos de adoção: ao selecionar um cliente e solução, o profissional pode identificar os casos de uso mais adequados e os critérios que devem ser cumpridos para validar cada etapa.

---

## Estrutura da tela

A tela é dividida em quatro áreas principais:

| Área | O que exibe |
|---|---|
| **Filtros** | Seletores em cascata para navegar pela biblioteca |
| **Navegação prev/next** | Botões para percorrer os use cases filtrados |
| **Description** | Dados do use case selecionado |
| **Applicability** | Benefícios, capacidades e métricas de sucesso |
| **Exit Criteria** | Critérios de saída por estágio/etapa |

---

## Como usar os filtros (cascata)

Os filtros são **em cascata** — cada seleção restringe as opções do próximo:

1. **Vendor** — selecione o fabricante (ex: Cisco). Este campo é obrigatório para carregar os demais.
2. **Architecture** — filtra por arquitetura Cisco (ex: Security, Collaboration, Networking)
3. **Primary Product** — produto principal do use case
4. **Use Case** — nome específico do caso de uso

Após selecionar o Vendor, os dados são carregados automaticamente. Os demais filtros são opcionais — se não forem selecionados, todos os use cases do vendor ficam disponíveis para navegação.

---

## Navegando pelos Use Cases

Após aplicar os filtros, use os botões **← Previous Use Case** e **Next Use Case →** para navegar pelos registros que atendem aos critérios selecionados. O contador exibe a posição atual (ex: "Use Case 3 of 12").

---

## Seção Description

Exibe os dados de identificação do use case atual:

| Campo | Descrição |
|---|---|
| **Use Case** | Nome do caso de uso |
| **Vendor** | Fabricante |
| **Architecture** | Arquitetura Cisco |
| **Primary Product** | Produto principal |
| **Description** | Descrição detalhada do que é o use case |

---

## Seção Applicability

Exibe a aplicabilidade detalhada do use case para o cliente:

| Campo | Descrição |
|---|---|
| **Key Supporting Products** | Produtos complementares necessários |
| **Key Capabilities** | Capacidades técnicas principais |
| **IT Operations Benefits** | Benefícios para operações de TI |
| **Business Benefits** | Benefícios para o negócio do cliente |
| **Success Metrics** | Métricas para medir o sucesso da adoção |
| **Business Outcomes** | Resultados esperados para o negócio |

---

## Seção Exit Criteria

Os **Exit Criteria** são os critérios que devem ser cumpridos para validar cada etapa (estágio) da adoção. Cada use case pode ter múltiplos estágios — use os botões **← Previous Stage** e **Next Stage →** para navegar entre eles.

Cada estágio exibe:

| Campo | Descrição |
|---|---|
| **Num# / Seq#** | Número de sequência do estágio |
| **Name** | Nome do critério de saída |
| **Task Type** | Tipo de tarefa associada |
| **Objective** | Objetivo a ser atingido |
| **Scope** | Escopo do que deve ser realizado |
| **Expected Results** | Resultados esperados ao cumprir este critério |

> Use os Exit Criteria como referência para definir atividades no módulo **Tasks** e validar que cada etapa foi concluída corretamente antes de submeter o estágio LCI.

---

## Botão Refresh

Clique em **Refresh** para recarregar os dados da biblioteca de use cases com as informações mais recentes.

---

## Dicas de uso

- Consulte o módulo Use Cases no início de um projeto de adoção para definir o escopo correto com o cliente.
- Os **Exit Criteria** são especialmente úteis para alinhar expectativas com o cliente: mostram exatamente o que precisa ser feito para que cada estágio seja considerado concluído.
- Combine com o módulo **Cisco LCI** para verificar se os use cases selecionados são elegíveis para incentivos.
- Use o filtro de **Architecture** para descobrir todos os use cases disponíveis em uma arquitetura específica antes de planejar o roadmap do cliente.

---

## Ver também

- [Cisco LCI](./cisco_lci.md) — programa de incentivos relacionado à adoção
- [Criar e Gerenciar Tarefas](../03_tarefas/gerenciar_tarefas.md) — criar tarefas baseadas nos Exit Criteria
- [LCI Status](./lci_status.md) — elegibilidade LCI por cliente e solução
