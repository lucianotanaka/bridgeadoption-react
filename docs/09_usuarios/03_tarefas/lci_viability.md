# LCI Viability — Análise de Viabilidade de Tarefas LCI

> **Público:** CSMs com permissão especial (`task.task_lci_viability`)  
> **Onde encontrar:** Menu lateral → **Tasks** → aba **LCI Viability**  
> **Última atualização:** 2026-09

---

## O que é a aba LCI Viability?

A aba **LCI Viability** é uma ferramenta operacional para CSMs e gestores responsáveis pela gestão das tarefas do programa Cisco LCI. Ela exibe os registros LCI elegíveis e permite **definir o status** de cada grupo de tarefas — avançando, colocando em espera ou cancelando — com as regras de negócio do programa aplicadas automaticamente.

> **Acesso restrito:** Esta aba só aparece para usuários que possuem a permissão `task.task_lci_viability`. Se a aba não estiver visível, solicite ao administrador do portal.

---

## Estrutura da tela

A tela é dividida em dois painéis lado a lado:

| Painel | O que exibe |
|---|---|
| **LCI Records** (esquerda) | Lista de registros LCI com filtros e navegação |
| **Tasks** (direita) | Grupos de tarefas do registro selecionado |

---

## Painel LCI Records

### O que é um LCI Record?

Cada registro representa um par **Cliente × Track (solução)** com tarefas LCI associadas.

Cada card exibe:
- Nome do cliente
- Solução/Track LCI
- Se já tem projeto vinculado (**Project: YES / NO**)
- PM responsável

### Navegando pelos registros

Use os botões **←** e **→** na parte inferior do painel para navegar entre os registros. O contador mostra a posição atual (ex: "3 / 47").

### Filtros disponíveis

Clique em **Filter** para exibir os filtros:

| Filtro | Descrição |
|---|---|
| **Client** | Filtrar por nome do cliente |
| **Solution/Track** | Filtrar por trilha LCI |
| **PM** | Filtrar por gerente de projeto responsável |

Selecione "All" para remover o filtro de cada campo.

---

## Painel Tasks (Grupos de Tarefas)

Após selecionar um LCI Record, o painel direito exibe os **grupos de tarefas** daquele registro.

### O que é um grupo de tarefas?

As tarefas LCI são agrupadas por **Track** e **Party ID**. Cada grupo representa um conjunto de tarefas que devem ser tratadas juntas — você deve definir o status para cada grupo.

### Navegando entre grupos

Use os botões **←** e **→** no topo do painel direito para navegar entre os grupos (ex: "Group 1 / 3").

### A tabela de tarefas

Dentro de cada grupo, a tabela exibe as tarefas individuais:

| Coluna | Descrição |
|---|---|
| **Task ID** | Identificador único da tarefa |
| **Subtrack** | Sub-trilha LCI |
| **Deal ID** | Identificador da oportunidade |
| **WS** | Workspace vinculado |
| **Start / End** | Datas de início e fim |
| **Value** | Valor financeiro da tarefa |
| **Status** | Status atual (editável) |

---

## Definindo o status das tarefas

Para cada tarefa do grupo, use o **seletor de Status** na tabela para escolher:

| Status | Quando usar |
|---|---|
| **OPEN** | Tarefa identificada, ainda não iniciada |
| **ON HOLD** | Tarefa em análise/revisão — aguardando decisão |
| **IN PROGRESS** | Tarefa selecionada para execução ativa |
| **CANCELLED** | Tarefa descartada para este ciclo |

### Regras importantes ao salvar

#### Cenário: IN PROGRESS
- Apenas **uma tarefa** do grupo pode ser colocada em IN PROGRESS
- As demais tarefas do grupo serão automaticamente **CANCELLED**
- É **obrigatório** vincular a tarefa a um projeto existente ou criar um novo projeto:

| Opção | Como fazer |
|---|---|
| **Projeto existente** | Selecione no dropdown "Existing Project" |
| **Novo projeto** | Preencha "New OV" e "New Project Name" |

#### Cenário: ON HOLD
- Todas as tarefas do grupo devem ser ON HOLD
- O sistema aplica automaticamente a justificativa "IN REVIEW"

#### Cenário: CANCELLED
- Todas as tarefas do grupo devem ser CANCELLED
- É **obrigatório** selecionar uma **Cancel Justification** na lista disponível

---

## Salvando as alterações

Clique em **Save** para confirmar as alterações do grupo. O botão só fica ativo quando as condições acima forem atendidas.

Para descartar as alterações de um grupo sem salvar, clique em **✕** (Reset) ao lado do botão Save.

Após salvar com sucesso, uma mensagem verde confirma a quantidade de tarefas atualizadas.

---

## Dicas de uso

- Processe os registros que já têm **Project: YES** primeiro — eles estão mais avançados no ciclo LCI.
- Use o filtro de **PM** para focar nos registros sob sua responsabilidade.
- Ao colocar IN PROGRESS, verifique se o projeto selecionado já está cadastrado no módulo **Projects** — isso evita duplicação.
- Registros com **Project: NO** e tarefas em OPEN são os candidatos prioritários para decisão de avançar ou cancelar.

---

## Ver também

- [Cisco LCI](../05_adoption/cisco_lci.md) — visão consolidada do programa LCI
- [LCI Status](../05_adoption/lci_status.md) — elegibilidade de clientes e soluções
- [Projetos de Clientes](../06_projetos/projetos.md) — gerenciar projetos vinculados às tarefas LCI
- [Criar e Gerenciar Tarefas](./gerenciar_tarefas.md) — módulo principal de tarefas
