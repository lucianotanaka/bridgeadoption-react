# Criar e Gerenciar Tarefas

> **Público:** CSMs, GMs e gestores  
> **Onde encontrar:** Menu lateral → **Tasks**  
> **Última atualização:** 2026-08

---

## Visão geral

O módulo **Tasks** é o coração operacional do Bridge Adoption. Nele você gerencia todas as tarefas de adoção tecnológica dos seus clientes Cisco — desde a criação até o encerramento, passando por filtros avançados, acompanhamento de status e edição de dados.

O módulo está organizado em abas. As principais para criação e gerenciamento são:

| Aba | Para que serve |
|---|---|
| **Overview** | Painel de monitoramento geral |
| **Filter** | Buscar e filtrar tarefas existentes |
| **New Task** | Criar uma nova tarefa |
| **Next Follow-Up** | Ver próximos contatos agendados |
| **Reports** | Gerar relatórios exportáveis |

---

## Como criar uma nova tarefa

1. Acesse **Tasks** pelo menu lateral
2. Clique na aba **New Task**
3. Preencha os campos obrigatórios:

| Campo | Descrição |
|---|---|
| **Task Type** | Tipo da tarefa (ex: Onboarding, Renewal, Implementation) |
| **Client** | Cliente ao qual a tarefa está vinculada |
| **Owner** | CSM responsável pela tarefa |
| **Start Date** | Data de início planejada |
| **End Date** | Data de encerramento planejada |
| **Priority** | Alta, Média ou Baixa |

4. Campos opcionais que você pode preencher:
   - **Reference** — código ou referência interna
   - **Track** — trilha Cisco relacionada
   - **Workspace/Subscription** — WS ou assinatura vinculada
   - **Deal ID** — identificador da oportunidade
   - **Value/Currency** — valor financeiro estimado

5. Clique em **Save** para criar a tarefa

> Ao criar com sucesso, o **Painel de Detalhes** da tarefa recém-criada abre automaticamente, permitindo que você adicione atividades e informações complementares imediatamente.

---

## Como buscar e filtrar tarefas (aba Filter)

A aba **Filter** permite localizar tarefas existentes usando múltiplos critérios:

### Filtros disponíveis

| Filtro | Como funciona |
|---|---|
| **Owner** | Filtra por CSM responsável |
| **Task Type** | Tipo da tarefa |
| **Client** | Nome do cliente |
| **WS/Subscription** | Workspace ou assinatura |
| **Track** | Trilha Cisco |
| **Deal ID** | Identificador da oportunidade |
| **Status** | Status atual da tarefa (seleção múltipla) |

### Passo a passo

1. Selecione um ou mais filtros desejados
2. Os filtros são **em cascata** — selecionar um Owner restringe os clientes disponíveis
3. Clique em **Apply** (ou pressione Enter) para buscar
4. Os resultados aparecem na tabela abaixo
5. Clique em qualquer linha para abrir o **Painel de Detalhes**

> **Dica:** Você pode combinar vários filtros ao mesmo tempo para narrowar os resultados.

---

## Como editar uma tarefa

Para editar uma tarefa, primeiro abra o **Painel de Detalhes** clicando sobre ela na Overview, Filter, Follow-Up ou na lista de resultados. Então:

1. No painel de detalhes, clique em **Editar** (ícone de lápis)
2. Os campos ficam habilitados para edição
3. Altere os campos necessários:

| Campo | Observações |
|---|---|
| **Owner** | CSM principal responsável |
| **Temp Owner** | Responsável temporário (cobre ausências) |
| **Status** | Ver tabela de status abaixo |
| **Priority** | Alta / Média / Baixa |
| **Reference** | Código interno ou referência |
| **Workspace** | WS vinculado |
| **Deal ID** | ID da oportunidade |
| **Value / Currency** | Valor e moeda |
| **% Concluído** | Percentual de conclusão |
| **Project** | Projeto vinculado (existente ou novo) |
| **Description** | Descrição detalhada |
| **Start/End Performed** | Datas reais de início e fim |

4. Clique em **Save** para salvar as alterações

> **Importante:** As datas de início e fim realizadas (Start/End Performed) são calculadas automaticamente a partir das atividades quando existem. Nesses casos, os campos ficam bloqueados para edição manual.

---

## Status das tarefas

| Status | Significado |
|---|---|
| **Open** | Tarefa criada, ainda não iniciada |
| **In Progress** | Tarefa em andamento |
| **On Hold** | Tarefa pausada temporariamente |
| **Waiting** | Aguardando resposta do cliente ou terceiro |
| **Done** | Concluída com sucesso |
| **Cancelled** | Cancelada |
| **Closed** | Encerrada (sem conclusão positiva) |
| **Completed** | Concluída e fechada formalmente |

### Regras de encerramento

> **Atenção:** Para encerrar uma tarefa (mudar status para Cancelled, Closed ou Completed), é necessário que **todas as atividades** vinculadas à tarefa estejam encerradas. Enquanto houver atividades abertas, as opções de encerramento ficam indisponíveis.

---

## Quem pode editar uma tarefa?

| Perfil | O que pode fazer |
|---|---|
| **Owner da tarefa** | Editar todos os campos; encerrar a tarefa |
| **Temp Owner** | Editar campos gerais; não pode encerrar |
| **ADMIN** | Acesso total a todas as tarefas |
| **Outros usuários** | Somente leitura |

Se você não consegue editar uma tarefa, verifique se você é o Owner ou Temp Owner, ou solicite ao administrador que ajuste as permissões.

---

## Prioridades e suas cores

| Prioridade | Cor | Quando usar |
|---|---|---|
| 🔴 **Alta** | Vermelho | Tarefa crítica, impacto imediato no cliente |
| 🟡 **Média** | Amarelo/Laranja | Tarefa importante, mas com prazo menos urgente |
| 🔵 **Baixa** | Azul/Verde | Tarefa de rotina, sem urgência |

---

## Dicas de uso

- Use a aba **Filter** para localizar rapidamente uma tarefa específica antes de editar.
- Quando criar uma tarefa para uma conta com múltiplos CSMs, use o campo **Temp Owner** para registrar um responsável secundário.
- O campo **% Concluído** é atualizado automaticamente quando a tarefa possui atividades — não é necessário editar manualmente.
- Ao criar a tarefa, preencha o máximo de informações possível para facilitar o acompanhamento futuro.

---

## Ver também

- [Visão Geral das Tarefas](./visao_geral_tarefas.md) — painel de monitoramento e KPIs
- [Atividades, RACI e Histórico](./atividades_raci_historico.md) — gerenciar sub-atividades
- [Follow-Up](./follow_up.md) — próximos contatos agendados
- [Relatórios de Tarefas](./relatorios_tarefas.md) — gerar relatórios exportáveis
