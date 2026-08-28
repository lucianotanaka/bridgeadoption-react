# Relatórios de Tarefas

> **Público:** CSMs, GMs e gestores  
> **Onde encontrar:** Menu lateral → **Tasks** → aba **Reports**  
> **Última atualização:** 2026-08

---

## O que são os Relatórios de Tarefas?

A aba **Reports** permite gerar e exportar relatórios detalhados sobre as tarefas, combinando filtros avançados com duas opções de visualização: **Task List** (lista de tarefas) e **Task Details** (detalhes de uma tarefa específica).

---

## Como gerar um relatório

### Passo 1 — Selecionar o Owner (obrigatório)

O primeiro passo é selecionar **ao menos um Owner** (CSM responsável). Este campo é obrigatório para desbloquear os demais filtros.

1. No campo **Owner**, selecione um ou mais CSMs
2. Os demais filtros são habilitados automaticamente

### Passo 2 — Aplicar filtros opcionais

Após selecionar o Owner, você pode refinar ainda mais os resultados:

| Filtro | Descrição |
|---|---|
| **Task Type** | Tipo de tarefa |
| **Client** | Cliente específico |
| **Status** | Status da tarefa (seleção múltipla) |

Os filtros são **em cascata** — os clientes e tipos disponíveis variam conforme os owners selecionados.

### Passo 3 — Aplicar e visualizar

1. Clique em **Apply** para executar a busca
2. Os resultados aparecem abaixo dos filtros
3. Escolha entre as abas **Task List** ou **Task Details**

---

## Relatório: Task List

O **Task List** exibe uma tabela completa com todas as tarefas que correspondem aos filtros aplicados.

### O que a tabela exibe?

A tabela inclui todas as colunas relevantes de cada tarefa:

- Identificador da tarefa
- Cliente
- Tipo da tarefa
- Owner / Temp Owner
- Status
- Prioridade
- Datas (início, fim, realizadas)
- Valor financeiro
- % Concluído
- Track / WS / Deal ID
- Próximo follow-up
- Projeto vinculado

### Como exportar a Task List

1. Com os resultados carregados na aba **Task List**
2. Clique no botão **Export CSV** ou **Export Excel**
3. O arquivo é gerado e baixado automaticamente pelo navegador

> **Dica:** O arquivo exportado contém os mesmos dados exibidos na tabela, com base nos filtros aplicados.

---

## Relatório: Task Details

O **Task Details** fornece uma visão completa e detalhada de uma tarefa específica, incluindo o cronograma de atividades e gráficos de status.

### Como usar o Task Details

1. Após aplicar os filtros e carregar os resultados, clique na aba **Task Details**
2. No seletor **Task ID**, escolha a tarefa que deseja detalhar
3. O relatório é gerado automaticamente com:

#### O que o Task Details exibe?

| Seção | Conteúdo |
|---|---|
| **Resumo da tarefa** | Dados principais (cliente, tipo, status, datas, valores) |
| **Gráfico de status das atividades** | Pizza com distribuição percentual por status |
| **Cronograma (Schedule)** | Linha do tempo da tarefa + atividades (Gantt simplificado) |
| **Detalhamento de atividades** | Cada atividade com descrição, responsável, datas, escopo e status |

### Como exportar o cronograma

No painel **Schedule**, clique em **Export** para baixar o cronograma no formato disponível.

---

## Dicas de uso

- **Selecione múltiplos owners** para gerar um relatório consolidado de toda a equipe.
- Use o **Task List** para análises em planilha — exporte para Excel e faça pivôs e análises customizadas.
- Use o **Task Details** para preparar apresentações de status de uma tarefa específica para o cliente.
- O **gráfico de pizza** do Task Details é uma forma rápida de mostrar o progresso visual de uma tarefa em reuniões.
- Para relatórios recorrentes, salve os parâmetros de filtro mais usados e reaplicar conforme necessário.

---

## Ver também

- [Visão Geral das Tarefas](./visao_geral_tarefas.md) — painel de monitoramento e KPIs
- [Criar e Gerenciar Tarefas](./gerenciar_tarefas.md) — criar e editar tarefas
- [Atividades, RACI e Histórico](./atividades_raci_historico.md) — gerenciar sub-atividades
