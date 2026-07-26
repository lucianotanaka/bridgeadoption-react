#!/usr/bin/env bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

#echo -e "${YELLOW}[1/4] Compilando o Frontend React (com 1.5GB de memória)...${NC}"
#if NODE_OPTIONS="--max-old-space-size=1536" npm run build; then

echo -e "${YELLOW}[1/4] Compilando o Frontend React (com 2GB de memória)...${NC}"
if NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
    echo -e "${GREEN}✔ Build concluído!${NC}"
else
    echo -e "${RED}❌ Erro no build. Abortando.${NC}"
    exit 1
fi

echo -e "${YELLOW}[2/4] Atualizando arquivos no Apache...${NC}"
sudo rm -rf /var/www/bridgeadoption/*
sudo cp -r dist/* /var/www/bridgeadoption/

echo -e "${YELLOW}[3/4] Ajustando permissões do Apache...${NC}"
sudo chown -R apache:apache /var/www/bridgeadoption

echo -e "${YELLOW}[4/4] Reiniciando servidor Apache...${NC}"
if sudo systemctl restart httpd; then
    echo -e "${GREEN}🎉 DEPLOY DO NOVO PROJETO CONCLUÍDO COM SUCESSO!${NC}"
else
    echo -e "${RED}❌ Erro ao reiniciar o Apache.${NC}"
    exit 1
fi

