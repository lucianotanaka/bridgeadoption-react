# Guia de Deploy — Bridge Adoption React

> **Última atualização:** 2026-07  
> **Audiência:** Equipe de sustentação e DevOps

---

## 1. Pré-requisitos

| Componente | Versão mínima |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Python | 3.11+ |
| Apache HTTP Server | 2.4+ |
| MySQL / MariaDB | 8.0+ |
| systemd | — |

---

## 2. Estrutura no servidor

```
/opt/bridgeadoption/
├── backend/          → Código Python/FastAPI
├── frontend/         → Código React/Vite (fonte)
└── docs/             → Documentação

/var/www/bridgeadoption/   → Build do frontend (arquivos estáticos)
```

---

## 3. Deploy do Frontend

### 3.1. Script automático

```bash
cd /opt/bridgeadoption/frontend
bash deploy.sh
```

O script executa automaticamente:
1. `npm run build` — compila TypeScript + Tailwind → `dist/`
2. Copia `dist/` para `/var/www/bridgeadoption/`
3. Ajusta permissões (`chown apache:apache`)
4. Reinicia Apache (`systemctl restart httpd`)

### 3.2. Deploy manual (passo a passo)

```bash
cd /opt/bridgeadoption/frontend

# 1. Instalar dependências (apenas se necessário)
npm install

# 2. Build de produção
npm run build

# 3. Copiar arquivos para o diretório web
cp -r dist/* /var/www/bridgeadoption/

# 4. Ajustar permissões
chown -R apache:apache /var/www/bridgeadoption/

# 5. Reiniciar Apache
systemctl restart httpd
```

### 3.3. Verificar build

Após o deploy, verificar:
- Arquivo `dist/index.html` existe
- Arquivos JS/CSS em `dist/assets/`
- Imagens em `/var/www/bridgeadoption/images/`

---

## 4. Deploy do Backend

### 4.1. Reiniciar serviço

```bash
systemctl restart bridgeadoption-backend
```

### 4.2. Verificar status

```bash
systemctl status bridgeadoption-backend --no-pager
```

Saída esperada: `Active: active (running)`

### 4.3. Logs do backend

```bash
# Logs em tempo real
journalctl -u bridgeadoption-backend -f

# Últimas 100 linhas
journalctl -u bridgeadoption-backend -n 100
```

### 4.4. Instalação de novas dependências Python

```bash
cd /opt/bridgeadoption/backend
pip install -r requirements.txt
systemctl restart bridgeadoption-backend
```

---

## 5. Configuração do Apache

### 5.1. VirtualHost típico

```apache
<VirtualHost *:80>
    ServerName <servidor>

    # Arquivos estáticos do React
    DocumentRoot /var/www/bridgeadoption

    # React Router — redirecionar todas as rotas para index.html (SPA)
    <Directory /var/www/bridgeadoption>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>

    # Proxy para a API FastAPI
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:8000/api
    ProxyPassReverse /api http://127.0.0.1:8000/api

    # Logs
    ErrorLog /var/log/httpd/bridgeadoption_error.log
    CustomLog /var/log/httpd/bridgeadoption_access.log combined
</VirtualHost>
```

> **Nota:** Para ambiente lab com subpath `/bridgeadoption/`, ajustar `DocumentRoot` e aliases conforme configuração específica.

### 5.2. Módulos Apache necessários

```bash
# Verificar módulos ativos
httpd -M | grep -E "proxy|rewrite"

# Habilitar se necessário
a2enmod proxy proxy_http rewrite
systemctl restart httpd
```

---

## 6. Configuração do Backend (systemd)

### 6.1. Arquivo de serviço

`/etc/systemd/system/bridgeadoption-backend.service`

```ini
[Unit]
Description=Bridge Adoption Backend (FastAPI)
After=network.target mysql.service

[Service]
User=apache
WorkingDirectory=/opt/bridgeadoption/backend
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
Environment=PYTHONPATH=/opt/bridgeadoption/backend

[Install]
WantedBy=multi-user.target
```

### 6.2. Comandos systemd

```bash
# Recarregar após alterar arquivo .service
systemctl daemon-reload

# Habilitar inicialização automática
systemctl enable bridgeadoption-backend

# Iniciar / parar / reiniciar / status
systemctl start bridgeadoption-backend
systemctl stop bridgeadoption-backend
systemctl restart bridgeadoption-backend
systemctl status bridgeadoption-backend
```

---

## 7. Variáveis de ambiente do backend

Arquivo: `/opt/bridgeadoption/backend/.env`

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pegasus
DB_USER=ba_user
DB_PASSWORD=senha_segura

# JWT
JWT_SECRET_KEY=chave-secreta-muito-longa-e-aleatoria
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=8

# CORS
CORS_ORIGINS=http://<servidor>
```

> **Segurança:** O arquivo `.env` não deve ser versionado no Git. Verificar `.gitignore`.

---

## 8. Checklist de deploy completo

### Frontend
- [ ] `npm run build` executado sem erros
- [ ] Arquivos copiados para `/var/www/bridgeadoption/`
- [ ] Permissões ajustadas (`apache:apache`)
- [ ] Apache reiniciado
- [ ] Portal acessível no browser
- [ ] Login funciona
- [ ] Módulos carregam corretamente

### Backend
- [ ] Arquivo `.env` atualizado (se necessário)
- [ ] `pip install -r requirements.txt` executado (se novas dependências)
- [ ] `systemctl restart bridgeadoption-backend` executado
- [ ] `systemctl status` mostra `active (running)`
- [ ] `POST /api/auth/login` retorna token

---

## 9. Rollback

### Frontend
```bash
# Se o build atual tem problema, restaurar versão anterior
cp -r /var/www/bridgeadoption_backup/* /var/www/bridgeadoption/
systemctl restart httpd
```

### Backend
```bash
# Reverter para commit anterior
cd /opt/bridgeadoption
git log --oneline -5   # ver commits recentes
git checkout <commit-hash> -- backend/
systemctl restart bridgeadoption-backend
```

---

## 10. Troubleshooting

| Problema | Possível causa | Solução |
|---|---|---|
| Portal não carrega | Apache parado ou config errada | `systemctl restart httpd`, verificar logs |
| API retorna 502 | FastAPI não está rodando | `systemctl restart bridgeadoption-backend` |
| Login falha (401) | JWT_SECRET_KEY errado ou banco inacessível | Verificar `.env` e conexão MySQL |
| Rota não encontrada (404) | `FallbackResource` não configurado | Verificar VirtualHost Apache |
| Mudança no código não aparece | Cache do browser | Hard refresh (Ctrl+Shift+R) |
| Build falha (TypeScript) | Erro de tipagem | Verificar erros no output do build |
