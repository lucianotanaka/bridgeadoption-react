# CSM Account (Public) — Portfólio de Contas Versão Pública

> **Público:** Usuários com permissão `public.csm_account`  
> **Onde encontrar:** Menu lateral → **Public** → **CSM Account**  
> **Última atualização:** 2026-09

---

## O que é o CSM Account (Public)?

O módulo **CSM Account** na seção **Public** é uma versão de acesso simplificado do portfólio de contas por CSM. Ele exibe as mesmas informações do módulo [CSM Account (Adoption)](../05_adoption/csm_account.md), porém disponibilizado como recurso público para usuários que não têm acesso ao grupo Adoption.

---

## O que você vê na tela

### Filtros disponíveis

| Filtro | Descrição |
|---|---|
| **CSM** | Filtrar por Customer Success Manager |
| **Cliente** | Nome do cliente |
| **AM** | Account Manager responsável |
| **EA** | Filtrar clientes com (Yes) ou sem (No) Enterprise Agreement |
| **Type** | Tipo de atendimento |

Todos os filtros são de **seleção múltipla**. Para limpar todos de uma vez, clique em **Clear all filters**.

### A tabela de contas

A tabela exibe todas as contas com as seguintes colunas:

| Coluna | Descrição |
|---|---|
| **Cliente** | Nome da empresa cliente |
| **CSM** | Customer Success Manager responsável |
| **AM** | Account Manager |
| **EA** | Possui Enterprise Agreement? (Yes/No) |
| **Type** | Tipo de atendimento |

A tabela suporta **ordenação** por qualquer coluna (clique no cabeçalho) e **paginação**.

---

## Tipos de atendimento

| Tipo | Cor | Significado |
|---|---|---|
| **HIGH TOUCH** | 🔴 Vermelho + negrito | Conta estratégica — atenção máxima |
| **SCALE TOUCH** | 🟡 Amarelo | Atenção moderada |
| **DIGITAL TOUCH** | 🔵 Azul | Atendimento principalmente digital |
| **CUSTOMER** | 🟢 Verde | Cliente padrão |

---

## Diferença entre CSM Account (Public) e CSM Account (Adoption)

| Aspecto | Public | Adoption |
|---|---|---|
| **Permissão** | `public.csm_account` | `adoption.report_csm_account` |
| **Localização no menu** | Public → CSM Account | Adoption → CSM Account |
| **Dados exibidos** | Idênticos | Idênticos |

A diferença é apenas de **permissão de acesso** — o conteúdo exibido é o mesmo.

---

## Dicas de uso

- Use o filtro **Type = HIGH TOUCH** para focar nas contas estratégicas.
- Combine filtros **AM + CSM** para entender a distribuição das carteiras entre os times.
- Use **EA = Yes** para identificar rapidamente clientes com Enterprise Agreement ativo.

---

## Ver também

- [CSM Account (Adoption)](../05_adoption/csm_account.md) — versão completa no grupo Adoption
- [Account Team](../04_portfolio/account_team.md) — profissionais alocados por cliente
- [Importer](./importer.md) — outro módulo do grupo Public
