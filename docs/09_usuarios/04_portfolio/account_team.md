# Equipe de Conta (Account Team)

> **Público:** CSMs, GMs, AMs e gestores  
> **Onde encontrar:** Menu lateral → **Portfolio** → **Account Team**  
> **Última atualização:** 2026-08

---

## O que é o Account Team?

O módulo **Account Team** exibe a **matriz de profissionais NTT Data alocados em cada cliente**. Ele centraliza a visão de quem é responsável por cada conta, facilitando a comunicação interna e a gestão de equipes.

---

## O que você vê na tela

### Filtros

No topo da página, você pode filtrar a matriz por:

| Filtro | Descrição |
|---|---|
| **Client** | Nome do cliente |
| **DIR** | Diretor responsável |
| **AM** | Account Manager |
| **CDM** | Customer Development Manager |
| **CSM** | Customer Success Manager |

Todos os filtros são de **seleção múltipla** — você pode selecionar vários valores ao mesmo tempo.

### A Matriz (tabela pivot)

A tabela principal exibe uma **matriz empresa × tipo de profissional**, onde cada linha é um cliente e as colunas mostram os profissionais de cada tipo alocados naquele cliente.

As colunas incluem:
- **Cliente** (nome da empresa)
- **Cisco Domain** — domínio Cisco associado ao contrato
- **DIR** — Diretor responsável
- **AM** — Account Manager
- **CDM** — Customer Development Manager
- **CSM** — Customer Success Manager
- Outros tipos de profissional conforme configuração

---

## Como visualizar as colunas

Você pode personalizar quais colunas são exibidas usando o **Toggle de Colunas** (botão de configuração na parte superior da tabela). Isso permite ocultar ou exibir o **Cisco Domain** e outros tipos de profissional conforme sua necessidade.

---

## Exportando os dados

Clique em **Export TSV** para exportar a matriz em formato TSV (Tab-Separated Values), compatível com Excel e Google Sheets.

---

## Modo de Edição (ADMIN e MANAGER)

Se você tem perfil **ADMIN** ou **MANAGER**, um botão de **Edit Mode** fica disponível. Ao ativá-lo, você pode:

### Ativar/Desativar alocações

- Cada célula da matriz exibe um **checkbox** de alocação
- Marcar ou desmarcar salva a alteração automaticamente (auto-save)

### Adicionar um novo membro

1. Ative o **Edit Mode**
2. Clique em **+ Add Member** (Adicionar Membro)
3. Preencha o formulário:

| Campo | Descrição |
|---|---|
| **Person** | Nome da pessoa NTT a alocar |
| **Client** | Cliente ao qual será alocada |
| **Type** | Tipo de profissional (AM, CDM, CSM, DIR, etc.) |
| **Cisco Domain** | Domínio Cisco associado |

4. Clique em **Save**

---

## Tipos de profissional

| Sigla | Cargo |
|---|---|
| **DIR** | Diretor |
| **AM** | Account Manager |
| **CDM** | Customer Development Manager |
| **CSM** | Customer Success Manager |

Outros tipos podem estar disponíveis conforme a configuração da sua equipe.

---

## Dicas de uso

- Use o filtro **Client** para localizar rapidamente um cliente específico em uma carteira grande.
- Use o filtro **CSM** para ver quais clientes um CSM específico atende.
- O **Cisco Domain** ajuda a identificar a qual contrato ou programa Cisco cada alocação está vinculada.
- Antes de reuniões de alinhamento de equipe, use a matriz para confirmar as alocações atuais.

---

## Ver também

- [Iniciativas de Adoção](./iniciativas_de_adocao.md) — acompanhar iniciativas por cliente
- [Projetos de Clientes](../06_projetos/projetos.md) — gerenciamento de projetos com equipe vinculada
