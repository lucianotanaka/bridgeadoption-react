# API — Asset Endpoints

> **Base URL:** `/api/portfolio`
> **Autenticação:** Bearer Token JWT (header `Authorization: Bearer <token>`)
> **Tag FastAPI:** `portfolio`
> **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`
> **Última atualização:** 2026-08-18
> **Módulo frontend:** `AssetPage.tsx`

---

## Autenticação

Todos os endpoints requerem token JWT válido. O token é obtido via `POST /api/auth/login`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## GET `/asset-clients`

Retorna a lista de **clientes que possuem assets** cadastrados — usada para popular o seletor de clientes na `AssetPage`.

**Fonte:** `AssetRepository.filter_asset_clients()` → `tbAssetContractSummaryByCustomer`

**Sem parâmetros.**

**Response:** `List[AssetClient]`

```json
[
  { "client_id": 12, "client_name": "ACME CORP" },
  { "client_id": 47, "client_name": "BANCO CSF S/A" },
  { "client_id": 83, "client_name": "COMPANHIA DE DISTRIBUIÇÃO" }
]
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `client_id` | int | ID do cliente (`customer_id` em `tbAssetContractSummaryByCustomer`) |
| `client_name` | string | Nome do cliente (`customer_name`) |

> **Cache (React Query):** query `["asset-clients"]` com `staleTime = 10 min`.
>
> **Nota:** Retorna apenas clientes que têm ao menos um asset na view `tbAssetContractSummaryByCustomer`. Clientes sem assets não aparecem no seletor.

---

## GET `/assets`

Retorna todos os assets (contratos Vendor + NTT) de um cliente específico.

**Fonte:** `AssetRepository.get_asset_contracts(client_id)` → `tbAssetContractEndMismatch`

**Query Params:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `customer_id` | int | **Sim** | ID do cliente |

**Exemplo de requisição:**
```http
GET /api/portfolio/assets?customer_id=12
```

**Response:** `List[AssetRow]`

```json
[
  {
    "asset_id": 10042,
    "asset_serial_number": "FDO2451G0YP",
    "asset_instance_number": null,
    "asset_subscription_id": null,
    "asset_parent_level": "MAJOR",
    "asset_parent_serial_number": null,
    "asset_parent_instance_number": null,
    "product_id": 501,
    "product_name": "C9300-48UXM",
    "product_manufacturer_id": 1,
    "product_manufacturer_name": "CISCO",
    "product_family": "Catalyst 9000",
    "product_group": "Switches",
    "product_subtype": "Hardware",
    "vendorasset_contract_num": "93847201",
    "vendorasset_customer_id": 12,
    "vendorasset_customer_name": "ACME CORP",
    "vendorasset_vendor_id": 1,
    "vendorasset_vendor_name": "CISCO",
    "vendorasset_start": "2023-01-01",
    "vendorasset_end": "2026-12-31",
    "nttasset_contract_number": "NTT-2023-00412",
    "nttasset_entitlement_id": 88,
    "nttasset_entitlement_contract": "ENT-00412",
    "nttasset_customer_id": 12,
    "nttasset_customer_name": "ACME CORP",
    "nttasset_contract_start": "2023-01-01",
    "nttasset_contract_end": "2026-12-31",
    "end_date_diff_days": 500,
    "start_date_diff_days": 0,
    "customer_mismatch_flag": null,
    "status_consolidated": "Active",
    "alert_reason": null,
    "product_eos": "2028-01-31",
    "product_ldos": "2030-01-31",
    "eos_status": "Active",
    "ldos_status": "Active"
  }
]
```

**Campos de retorno:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `asset_id` | int | PK de `tbAsset` |
| `asset_serial_number` | string\|null | Número de série do asset |
| `asset_instance_number` | string\|null | Número de instância (licenças) |
| `asset_subscription_id` | string\|null | ID de assinatura (SaaS/ELA) |
| `asset_parent_level` | string\|null | `MAJOR` = ativo pai, `MINOR` = componente filho |
| `asset_parent_serial_number` | string\|null | Serial do asset pai (para MINORs) |
| `asset_parent_instance_number` | string\|null | Instance do asset pai |
| `product_name` | string\|null | Nome do produto |
| `product_manufacturer_name` | string\|null | Nome do fabricante (ex: CISCO) |
| `product_family` | string\|null | Família do produto |
| `product_group` | string\|null | Grupo do produto |
| `product_subtype` | string\|null | Tipo do asset (Hardware / Software / License) |
| `vendorasset_contract_num` | string\|null | Número do contrato do Vendor (ex: SmartNet) |
| `vendorasset_customer_name` | string\|null | Nome do cliente no contrato Vendor |
| `vendorasset_vendor_name` | string\|null | Nome do Vendor (ex: CISCO) |
| `vendorasset_start` | string\|null | Data de início do contrato Vendor (ISO 8601) |
| `vendorasset_end` | string\|null | Data de fim do contrato Vendor (ISO 8601) |
| `nttasset_contract_number` | string\|null | Número do contrato NTT |
| `nttasset_entitlement_contract` | string\|null | Número do entitlement NTT |
| `nttasset_customer_name` | string\|null | Nome do cliente no contrato NTT |
| `nttasset_contract_start` | string\|null | Data de início do contrato NTT (ISO 8601) |
| `nttasset_contract_end` | string\|null | Data de fim do contrato NTT (ISO 8601) |
| `end_date_diff_days` | int\|null | Diferença em dias entre datas de fim Vendor vs NTT |
| `start_date_diff_days` | int\|null | Diferença em dias entre datas de início Vendor vs NTT |
| `customer_mismatch_flag` | string\|null | Flag de divergência de cliente entre contratos |
| `status_consolidated` | string\|null | Status consolidado do asset (ex: `Active`, `Expired`) |
| `alert_reason` | string\|null | Motivo de alerta (ex: `End Date Mismatch`) |
| `product_eos` | string\|null | Data de End-of-Support do produto (ISO 8601) |
| `product_ldos` | string\|null | Data de Last Day of Support do produto (ISO 8601) |
| `eos_status` | string\|null | Status EoS: `Active`, `EoS Reached`, etc. |
| `ldos_status` | string\|null | Status LDOS: `Active`, `LDOS Reached`, etc. |

**Lógica de filtro no backend:**

```sql
SELECT ... FROM tbAssetContractEndMismatch
WHERE vendorasset_customer_id = %(id)s
   OR nttasset_customer_id = %(id)s
```

> O filtro com `OR` garante que assets com cobertura apenas pelo Vendor **ou** apenas pela NTT sejam retornados corretamente.

> **Cache (React Query):** query `["portfolio-assets", customerId]` com `staleTime = 5 min`.

---

## Códigos de Resposta

| Código | Significado |
|--------|-------------|
| `200` | Sucesso — retorna array (pode ser `[]` se o cliente não tem assets) |
| `401` | Token inválido ou expirado |
| `422` | `customer_id` ausente ou não é um inteiro válido |
| `500` | Erro interno (verificar logs do backend) |

---

## Exemplos de Uso (frontend)

```typescript
// 1. Carregar lista de clientes com assets
const clients = await apiClient.get<AssetClient[]>('/portfolio/asset-clients');
// → [{ client_id: 12, client_name: "ACME CORP" }, ...]

// 2. Carregar assets de um cliente
const assets = await apiClient.get<AssetRow[]>('/portfolio/assets', {
  params: { customer_id: 12 }
});
// → [{ asset_id: 10042, product_name: "C9300-48UXM", ... }, ...]
```

**Com React Query (padrão da aplicação):**

```typescript
// Seletor de clientes — carregado na montagem da página
const clientsQ = useQuery({
  queryKey: ["asset-clients"],
  queryFn: () => apiClient.get<AssetClient[]>("/portfolio/asset-clients").then(r => r.data),
  staleTime: 10 * 60 * 1000,
});

// Assets do cliente — disparado ao clicar "Load Assets"
const assetsQ = useQuery({
  queryKey: ["portfolio-assets", activeClient?.client_id],
  queryFn: () => apiClient.get<AssetRow[]>("/portfolio/assets", {
    params: { customer_id: activeClient!.client_id }
  }).then(r => r.data),
  enabled: loaded && !!activeClient,
  staleTime: 5 * 60 * 1000,
});
```

---

## Notas de Implementação

### `get_asset_clients()` — correção aplicada
O `sections_service.py` original tentava chamar métodos inexistentes (`load_customer_assets`, `get_assets`) na `AssetRepository`. Na migração React (2026-08-18) foi corrigido para usar os métodos reais:
- `AssetRepository.filter_asset_clients()` → seletor de clientes
- `AssetRepository.get_asset_contracts(client_id)` → dados de assets

### `GET /asset-clients` vs `GET /companies`
- `GET /asset-clients` retorna **somente clientes que têm assets** (via `tbAssetContractSummaryByCustomer`)
- `GET /companies` retorna **todas as empresas válidas** de `tbCompany`

Para o seletor de Assets, usar sempre `/asset-clients` — evita exibir clientes sem dados.

### View `tbAssetContractEndMismatch`
Esta view consolida dados de três tabelas:
- `tbAsset` — dados base do ativo
- `tbContractVendorAsset` — contrato do fabricante/Vendor
- `tbContractNTTAsset` — contrato NTT

A view aplica a lógica de `status_consolidated` e `alert_reason` com base nas datas e status dos contratos.

---

## Referências

- **Documentação do módulo:** `docs/02_application/portfolio/asset.md`
- **Router:** `backend/app/modules/sections_router.py` → `portfolio_router`
- **Service:** `backend/app/modules/sections_service.py`
- **AssetRepository:** `src/infrastructure/database/repositories/asset_repository.py`
- **Streamlit original:** `webapp/pages/portfolio/asset.py`
