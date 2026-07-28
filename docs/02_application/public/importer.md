# Módulo Importer — Public

> **Rota:** `/public/importer`  
> **resource_key:** `public.importer`  
> **Arquivo frontend:** `frontend/src/pages/public/ImporterPage.tsx`

---

## 1. Propósito

Painel de agendamento e monitoramento de importações de dados externos (Cisco, NTT). Permite ao time de operações/sustentação agendar manualmente a execução dos importadores sem acesso direto ao servidor.

---

## 2. Componentes

- **Seletor de tipo de importação** — lista os importadores disponíveis
- **Campo de agendamento** — data/hora opcional (vazio = executar agora)
- **Botão "Agendar Importação"** — submete o agendamento
- **Histórico** — tabela com as últimas execuções: tipo, status, data, mensagem de erro

---

## 3. Tipos de importação disponíveis

| Importador | Descrição |
|---|---|
| Cisco Ready | Dados de oportunidades Cisco Ready |
| Cisco Subscription (CCW) | Dados de assinaturas CCW |
| Cisco Enterprise Agreement | Licenças e consumo EA |
| Cisco LCI | Dados de incentivos LCI |
| Company Names | Atualização de nomes de empresas |

---

## 4. Endpoints

```
GET  /api/public/import-types     → lista tipos disponíveis
POST /api/public/import           → agenda importação
GET  /api/public/import-history   → histórico de execuções
```

**Request (POST):**
```json
{
  "import_type": "cisco_ea",
  "scheduled_at": null   // null = executar imediatamente
}
```

**Response:**
```json
{ "message": "Import scheduled", "job_id": 123 }
```

---

## 5. Backend

**Arquivo:** `backend/app/modules/public_router.py` + `public_service.py`

O agendamento registra em `tbImportLog` e dispara o processo via fila ou execução direta.

---

## 6. Segurança

- Requer permissão `public.importer` em `tbAuthPermission`
- **Não requer role ADMIN**, mas deve ser restrito ao grupo de operação/sustentação
- Recomendação: criar uma role `OPERATION` específica para esse acesso

---

## 7. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Importação não aparece no histórico | Job não executou | Verificar logs do backend (`journalctl -u bridgeadoption-backend`) |
| Erro na importação | Dado inválido ou API Cisco indisponível | Verificar mensagem de erro no histórico |
| Lista de tipos vazia | Endpoint `/import-types` com erro | Verificar `GET /api/public/import-types` |
