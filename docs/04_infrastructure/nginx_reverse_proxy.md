# Nginx Reverse Proxy Deployment Guide
## Streamlit Application – RHEL / CentOS

Documento baseado na implementação validada em ambiente LAB.

Escopo:

- Instalação
- Ajuste do nginx.conf
- Criação do bridgeadoption.conf
- Testes de configuração
- Adequação do SELinux
- Configuração do Firewalld (se aplicável)
- Validação funcional

---

# 1. Pré-requisitos
- Sistema: RHEL / CentOS / Rocky / Alma
- Acesso root ou sudo
- Streamlit já funcional (ex: porta 8501)
- SELinux em modo Enforcing (recomendado)

Verificar SELinux:
$ getenforce

Esperado:
$ Enforcing

---

# 2. Instalação do Nginx

## 2.1 Instalar pacote

$ dnf install nginx -y

ou:

$ yum install nginx -y

## 2.2 Confirmar instalação

$ rpm -q nginx

## 2.3 Verificar status (não deve estar ativo)

$ systemctl status nginx

Esperado:
$ inactive (dead)

---

# 3. Ajuste do nginx.conf
O arquivo principal não deve conter bloco server ativo.

Editar:
vi /etc/nginx/nginx.conf

Localizar e comentar completamente o bloco padrão:

# server {
#     listen       80;
#     listen       [::]:80;
#     server_name  _;
#     root         /usr/share/nginx/html;
#
#     include /etc/nginx/default.d/*.conf;
#
#     error_page 404 /404.html;
#     location = /404.html {
#     }
#
#     error_page 500 502 503 504 /50x.html;
#     location = /50x.html {
#     }
# }

Salvar e sair.

4. Criar configuração do Reverse Proxy

Criar novo arquivo:
# vi /etc/nginx/conf.d/bridgeadoption.conf

Conteúdo:

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8501;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

Salvar.

5. Teste de Sintaxe
Antes de iniciar o serviço:

nginx -t
Esperado:

# syntax is ok
# test is successful

Se houver warning de conflito, revisar nginx.conf.

6. Ajuste do SELinux (Obrigatório em RHEL/CentOS)
Por padrão, o SELinux bloqueia o Nginx de conectar em portas internas.

Aplicar:

# setsebool -P httpd_can_network_connect 1

Validar:
# getsebool httpd_can_network_connect

Esperado:
# httpd_can_network_connect --> on

Esse comando:

Não causa downtime
Não reinicia serviços
É seguro aplicar previamente em produção

7. Validar Streamlit
Garantir que o Streamlit está escutando na porta correta:
# ss -tulnp | grep 8501

Recomendado:
# 127.0.0.1:8501

Se necessário, ajustar no start:

--server.port 8501
--server.address 127.0.0.1

Testar localmente:

# curl http://127.0.0.1:8501

Deve retornar HTML.

8. Iniciar o Nginx
# stemctl start nginx

Verificar:
# systemctl status nginx

Confirmar porta 80 ativa:
# ss -tulnp | grep :80

Esperado:
# nginx

9. Teste Funcional
Acessar via navegador:

http://IP_DO_SERVIDOR
Fluxo esperado:
Browser → 80 → Nginx → 127.0.0.1:8501 → Streamlit

10. Testes de Diagnóstico (Se houver erro 502)
10.1 Verificar SELinux
# getenforce

10.2 Verificar boolean
# getsebool httpd_can_network_connect

10.3 Testar backend direto
# curl http://127.0.0.1:8501

10.4 Logs do Nginx
# tail -f /var/log/nginx/error.log

11. Habilitar no Boot (Opcional Produção)

---

# 11. Configuração do Firewalld (Se Aplicável)

Em ambientes RHEL/CentOS, o `firewalld` pode estar ativo e bloqueando a porta 80.

## 11.1 Verificar status do firewalld

```bash
systemctl status firewalld
```text

Se estiver ativo:


---

## 11.2 Verificar portas atualmente liberadas

```bash
firewall-cmd --list-all
```text

Verificar se o serviço `http` ou a porta `80/tcp` já está liberada.

---

## 11.3 Liberar porta 80 permanentemente

### Opção recomendada (serviço http):

```bash
firewall-cmd --permanent --add-service=http
```text

ou explicitamente por porta:

```bash
firewall-cmd --permanent --add-port=80/tcp
```text

---

## 11.4 Recarregar regras

```bash
firewall-cmd --reload
```text

---

## 11.5 Validar liberação

```bash
firewall-cmd --list-all
```text

Deve constar:
services: http

ou

ports: 80/tcp



---

# Observações Importantes

- Não é necessário liberar a porta 8501.
- A porta 8501 deve permanecer acessível apenas via localhost.
- Apenas a porta 80 deve estar exposta externamente.

---

# Arquitetura com Firewall
Internet ↓ Firewall (porta 80 liberada) ↓ Nginx :80 ↓ 127.0.0.1:8501 ↓ Streamlit


Após validação:
# systemctl enable nginx

12. Arquitetura Final
Internet
   ↓
Nginx :80
   ↓
127.0.0.1:8501
   ↓
Streamlit


13. Checklist de Pré-Produção

---

# Checklist Atualizado

| Item | Status Esperado |
|------|-----------------|
| firewalld ativo | ✅ |
| Porta 80 liberada | ✅ |
| Porta 8501 NÃO liberada | ✅ |
| SELinux Enforcing | ✅ |
| httpd_can_network_connect ON | ✅ |
| Nginx ativo | ✅ |
| Teste via navegador OK | ✅ |

---

Deixar no boot
sudo systemctl enable nginx