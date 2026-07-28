# 08 — Frontend Documentation

Documentação do frontend React do Bridge Adoption.

## Stack tecnológica

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18 | Framework UI |
| TypeScript | 5 | Tipagem estática |
| Vite | 5 | Build tool |
| React Router v6 | 6 | Roteamento SPA |
| TanStack Query | 5 | Cache e fetching de dados |
| Zustand | 4 | Estado global (auth, theme) |
| Tailwind CSS | 3 | Estilização |
| react-i18next | — | Internacionalização |
| Lucide React | — | Ícones |

## Estrutura de pastas

```
frontend/src/
  api/              → Clientes HTTP (apiClient, módulos por domínio)
  assets/           → Imagens, fontes (processadas pelo Vite)
  components/
    layout/         → AppLayout, Sidebar (estrutura da aplicação)
    ui/             → Componentes reutilizáveis (ThemeToggle, DataTablePage)
  hooks/            → Hooks customizados (useAuth)
  i18n/
    index.ts        → Configuração do i18next
    locales/        → Arquivos de tradução (pt.json, en.json, es.json)
  pages/            → Páginas por módulo (tasks, adoption, portfolio, etc.)
  router/           → PrivateRoute, PermissionRoute, AdminRoute
  store/            → Zustand stores (authStore, themeStore)
  types/            → Declarações de tipos TypeScript
```

## Arquivos de documentação

| Arquivo | Conteúdo |
|---|---|
| `architecture.md` | Arquitetura geral do SPA, fluxo de dados |
| `state_management.md` | authStore, themeStore, React Query |
| `routing.md` | PrivateRoute, PermissionRoute, AdminRoute |
| `i18n.md` | Internacionalização, locales, uso do t() |
| `components.md` | Componentes principais e padrões de UI |
| `theming.md` | Dark/Light mode, Tailwind, persistência no banco |

## Acesso ao sistema

| Ambiente | URL |
|---|---|
| Portal | `http://<servidor>/` |
| Backend API | `http://<servidor>/api` |

> Substitua `<servidor>` pelo hostname/IP do ambiente desejado.  
> Exemplo lab: `172.30.100.3` (com subpath `/bridgeadoption/`)  
> Exemplo produção: `brcghmdb01.br.didata.com` (sem subpath)

## Build e deploy

```bash
# Build do frontend
cd /opt/bridgeadoption/frontend
bash deploy.sh

# O script executa:
# 1. npm run build (Vite)
# 2. Copia dist/ para /var/www/bridgeadoption/
# 3. Ajusta permissões
# 4. Reinicia Apache
