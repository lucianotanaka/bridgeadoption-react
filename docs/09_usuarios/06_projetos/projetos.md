# Projetos de Clientes

> **Público:** CSMs, GMs, AMs e gestores  
> **Onde encontrar:** Menu lateral → **Projects**  
> **Última atualização:** 2026-08

---

## O que é o módulo Projects?

O módulo **Projects** é o portfólio de projetos dos clientes (**Customer Projects Portfolio**). Nele você visualiza, cria e gerencia os projetos de adoção tecnológica vinculados a cada cliente, além da equipe alocada em cada projeto.

---

## Como usar o módulo Projects

### Modo 1 — Pesquisar por Cliente

1. No campo **Customer**, pesquise e selecione um cliente
2. O painel de **Account Team** do cliente aparece automaticamente (badges com os profissionais alocados)
3. A tabela **Project Detail** exibe os projetos do cliente
4. Clique em um projeto para ver a **Project Team** (equipe do projeto) no painel lateral

### Modo 2 — Pesquisar por OV

Se você conhece o número da OV (Ordem de Venda) do projeto:

1. Digite a OV no campo **OV Search** (sem necessidade de selecionar cliente)
2. Clique em **Search** ou pressione Enter
3. O sistema localiza o(s) projeto(s) associado(s) à OV e exibe os resultados
4. O Account Team do cliente do projeto aparece automaticamente

> **Formatos aceitos para busca por OV:** `81822`, `#68924`, `#68924_#69056` (múltiplas OVs separadas por `_`)

---

## Filtros disponíveis

### OV Filter (com cliente selecionado)

Quando um cliente está selecionado, um filtro de **OV** aparece permitindo filtrar os projetos por número de OV específico. O filtro é aplicado instantaneamente sem nova busca.

### Filtro de Status

No cabeçalho da tabela de projetos, um select de **Status** permite filtrar por status do projeto:

| Status | Descrição |
|---|---|
| **Not Started** | Projeto criado mas ainda não iniciado |
| **In Progress** | Projeto em execução |
| **Business Model** | Em fase de modelagem de negócio |
| **Unidentified** | Status não identificado |
| Outros | Conforme configuração |

Para ver todos os projetos independente do status, selecione **— All statuses —**.

### Botão Clear Filters

O botão **Clear Filters** aparece quando há algum filtro ativo. Clique nele para resetar todos os filtros e seleções de uma vez.

---

## Tabela de projetos (Project Detail)

A tabela exibe os projetos do cliente com as seguintes colunas:

| Coluna | Descrição |
|---|---|
| **OV** | Número da Ordem de Venda |
| **Project Name** | Nome do projeto |
| **Status** | Status atual (badge colorido) |
| **Start** | Data de início |
| **End** | Data de encerramento |

A tabela é **paginada** — escolha quantas linhas exibir por página (5, 10, 25 ou 50).

Clique em qualquer linha para ver a equipe do projeto no painel **Project Team**.

---

## Equipe do Projeto (Project Team)

Ao selecionar um projeto, o painel **Project Team** exibe os membros alocados:

| Coluna | Descrição |
|---|---|
| **Name** | Nome do membro (badge **Lead** para o technical lead) |
| **Type** | Nível do recurso |
| **Dept** | Departamento |
| **Start** | Início da alocação |
| **End** | Fim da alocação |

---

## Criar e Editar Projetos (ADMIN)

> Esta funcionalidade está disponível apenas para usuários com perfil **ADMIN**.

### Criar um novo projeto

1. Selecione o cliente no campo **Customer**
2. Clique no botão **+ Add Project**
3. Preencha o formulário:

**Campos obrigatórios:**
- **OV** — Número da Ordem de Venda (pode conter múltiplas OVs separadas por `_`, ex: `52757_68924`)

**Campos principais:**
- **Project Name** — Nome do projeto
- **Owner (Department)** — Departamento responsável
- **Status** — Status inicial
- **Methodology** — Metodologia do projeto (Agile, Scrum, PMBOK, etc.)

**Seções opcionais (clique para expandir):**
- **Dates** — Data de internacionalização, início e fim
- **Project Details** — Descrição, escopo, objetivos, cenário atual, produtos-chave, justificativa, observações
- **Financial** — Moeda, Sprint Timebox e campos de custo

4. Clique em **Save** para criar o projeto

### Editar um projeto existente

1. Localize o projeto na tabela **Project Detail**
2. Clique no ícone de **editar** (✏️) na linha do projeto
3. O formulário abre preenchido com os dados atuais
4. Faça as alterações e clique em **Save**

---

## Gerenciar Equipe do Projeto (ADMIN)

> Esta funcionalidade está disponível apenas para usuários com perfil **ADMIN**.

### Adicionar um membro

1. Selecione um projeto na tabela
2. No painel **Project Team**, clique em **+ Add Member**
3. Preencha o formulário:

| Campo | Descrição |
|---|---|
| **Person** | Busque pelo nome (mínimo 2 caracteres) |
| **Department** | Departamento do membro |
| **Level** | Nível do recurso |
| **Working Time (%)** | Percentual de alocação (0-100%) |
| **Technical Lead** | Marque se for o líder técnico do projeto |
| **Allocation Start** | Data de início da alocação |
| **Allocation End** | Data de fim da alocação |

4. Clique em **Save**

### Editar um membro

1. No painel **Project Team**, clique no ícone de **editar** (✏️) na linha do membro
2. Ajuste os campos necessários
3. Clique em **Save**

### Remover um membro

1. No painel **Project Team**, clique no ícone de **remover** (🗑️) na linha do membro
2. Confirme a remoção

---

## Dicas de uso

- Use a busca por **OV** quando você sabe o número da ordem mas não lembra o cliente — é mais rápido.
- O badge **Lead** amarelo na equipe identifica o Technical Lead do projeto de forma imediata.
- Mantenha as **datas de alocação** da equipe atualizadas para facilitar o planejamento de capacidade.
- Preencha o campo **Methodology** nos projetos para padronizar a visão do portfólio por metodologia.
- Use o campo **OV** com múltiplas ordens separadas por `_` quando o projeto abrange mais de uma Ordem de Venda.

---

## Ver também

- [Equipe de Conta](../04_portfolio/account_team.md) — profissionais alocados no cliente
- [LCI Status](../05_adoption/lci_status.md) — vincular soluções LCI a projetos
- [Criar e Gerenciar Tarefas](../03_tarefas/gerenciar_tarefas.md) — vincular tarefas a projetos
