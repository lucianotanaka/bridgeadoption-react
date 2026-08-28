# Farol — Saúde dos Clientes

> **Público:** CSMs, GMs e gestores  
> **Onde encontrar:** Menu lateral → **Portfolio** → **Farol**  
> **Última atualização:** 2026-08

---

## O que é o Farol?

O **Farol** é um painel visual de semáforo que mostra o status de cobertura contratual de cada cliente por solução Cisco. O nome "farol" faz referência às cores do semáforo — verde, amarelo e vermelho — que indicam rapidamente a saúde contratual de cada solução.

É uma ferramenta de análise rápida: em uma única tela você enxerga todo o portfólio de soluções de um cliente e identifica quais precisam de atenção.

---

## Como usar o Farol

### Passo 1 — Selecionar o Vendor

No topo da página, selecione o **Vendor** (fabricante). Por padrão, o Farol carrega com **CISCO** selecionado.

### Passo 2 — Selecionar o Cliente

No campo **Cliente**, pesquise e selecione o cliente que deseja analisar. O campo aceita busca por nome — comece a digitar e as opções aparecerão.

### Passo 3 — Gerar o Farol

Clique no botão **Generate Farol** para carregar os dados do cliente selecionado.

---

## Lendo o Grid do Farol

O Farol exibe um **grid** organizado por:

- **Linhas:** Arquiteturas Cisco (ex: Security, Collaboration, Networking, Data Center)
- **Colunas:** Soluções dentro de cada arquitetura

Cada célula do grid exibe um **emoji de semáforo** com o status de cobertura daquela solução:

| Emoji | Status | Significado |
|---|---|---|
| 🟢 | **Active** | Cobertura ativa — contrato vigente |
| 🟡 | **Signed – Pending Activation** | Contrato assinado, aguardando ativação |
| 🔴 | **Expired or Never Covered** | Cobertura expirada ou nunca contratada |
| ⚪ | **Non-Existent or Other Partner** | Solução não existe para este cliente ou é de outro parceiro |

A **legenda** de status aparece acima do grid para referência rápida.

---

## Exportando os dados

Clique em **Export CSV** para baixar os dados do Farol em formato de planilha. O arquivo contém todas as informações exibidas no grid, útil para análises externas ou apresentações ao cliente.

---

## Atualizando os dados

Clique em **Refresh** para recarregar os dados do cliente ativo sem precisar navegar para outra página.

---

## Dicas de uso

- Use o Farol antes de reuniões com o cliente para ter uma visão rápida do estado contratual.
- Células 🔴 (vermelho) são oportunidades de renovação ou expansão — identifique proativamente soluções expiradas.
- Células 🟡 (amarelo) exigem acompanhamento para garantir que a ativação ocorra no prazo.
- O Farol é atualizado periodicamente via importação automática de dados Cisco.

---

## Ver também

- [Ativos e Contratos](./assets.md) — portfólio detalhado de hardware e licenças
- [Visão Geral do Cliente](./visao_geral_cliente.md) — visão 360° integrada do cliente
