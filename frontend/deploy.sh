#!/usr/bin/env bash
#
# Deploy do Bridge Adoption (Frontend React)
#
# Este script foi ajustado para lidar com o erro:
#   "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory"
#
# Causa raiz: o build do Vite (transformação de dependências pesadas como
# axios, plotly.js, xlsx, etc.) precisa de mais memória heap do que o limite
# de 1536MB configurado anteriormente via --max-old-space-size. Quando o heap
# do Node se aproxima do limite configurado, o V8 tenta liberar memória via
# GC (Scavenge/Mark-Compact) repetidamente e, se não conseguir, aborta o
# processo (SIGABRT / core dumped), interrompendo o deploy.
#
# Este script:
#   1) Verifica a memória (RAM + swap) disponível no servidor.
#   2) Calcula um valor seguro de heap para o Node com base na memória livre.
#   3) Tenta o build; se falhar por OOM, tenta novamente com valores maiores
#      (até o limite seguro calculado).
#   4) Caso todas as tentativas falhem, orienta o usuário sobre como resolver
#      (aumentar swap, aumentar RAM da VM, ou compilar em outra máquina).

set -uo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# 1) Diagnóstico de memória
# ---------------------------------------------------------------------------
MEM_TOTAL_MB=$(free -m | awk '/^Mem:/{print $2}')
MEM_AVAIL_MB=$(free -m | awk '/^Mem:/{print $7}')
SWAP_TOTAL_MB=$(free -m | awk '/^Swap:/{print $2}')

echo -e "${YELLOW}=== Diagnóstico de memória do servidor ===${NC}"
echo -e "${YELLOW}RAM total:        ${MEM_TOTAL_MB}MB${NC}"
echo -e "${YELLOW}RAM disponível:   ${MEM_AVAIL_MB}MB${NC}"
echo -e "${YELLOW}Swap total:       ${SWAP_TOTAL_MB}MB${NC}"

# ---------------------------------------------------------------------------
# 2) Calcula um heap seguro para o Node (--max-old-space-size)
#    Regra: usar no máximo ~70% da memória disponível (RAM + swap), deixando
#    margem para o próprio SO, o processo bash e outros processos do build
#    (esbuild/rollup rodam em processos/worker adicionais).
# ---------------------------------------------------------------------------
TOTAL_USABLE_MB=$((MEM_AVAIL_MB + SWAP_TOTAL_MB))
SAFE_MAX_HEAP_MB=$((TOTAL_USABLE_MB * 70 / 100))

# Nunca tentar menos que 1536MB (mínimo já conhecido) nem mais que 4096MB
# (acima disso o ganho é marginal e pode indicar outro problema).
if [ "$SAFE_MAX_HEAP_MB" -lt 1536 ]; then
    SAFE_MAX_HEAP_MB=1536
fi
if [ "$SAFE_MAX_HEAP_MB" -gt 4096 ]; then
    SAFE_MAX_HEAP_MB=4096
fi

echo -e "${YELLOW}Heap máximo seguro estimado: ${SAFE_MAX_HEAP_MB}MB${NC}"

# Monta níveis de tentativa crescentes até o limite seguro calculado.
#MEMORY_LEVELS=(1536 2560 3584 "$SAFE_MAX_HEAP_MB")
MEMORY_LEVELS=(2560 3584 "$SAFE_MAX_HEAP_MB")

BUILD_OK=false

echo -e "${YELLOW}[1/4] Compilando o Frontend React...${NC}"
for MB in "${MEMORY_LEVELS[@]}"; do
    # Pula níveis maiores que o limite seguro calculado.
    if [ "$MB" -gt "$SAFE_MAX_HEAP_MB" ]; then
        continue
    fi

    echo -e "${YELLOW}  -> Tentando build com ${MB}MB de heap Node...${NC}"
    if NODE_OPTIONS="--max-old-space-size=${MB}" npm run build; then
        BUILD_OK=true
        break
    else
        echo -e "${RED}  Falhou com ${MB}MB, tentando o próximo nível...${NC}"
    fi
done

if [ "$BUILD_OK" = true ]; then
    echo -e "${GREEN}✔ Build concluído!${NC}"
else
    echo -e "${RED}❌ Erro no build mesmo após aumentar a memória. Abortando.${NC}"
    echo -e "${YELLOW}--------------------------------------------------------${NC}"
    echo -e "${YELLOW}Diagnóstico: RAM+Swap disponível (${TOTAL_USABLE_MB}MB) pode ser${NC}"
    echo -e "${YELLOW}insuficiente para este build. Opções recomendadas:${NC}"
    echo -e "${YELLOW}  1) Adicionar/aumentar swap no servidor, ex.:${NC}"
    echo -e "${YELLOW}       sudo fallocate -l 2G /swapfile${NC}"
    echo -e "${YELLOW}       sudo chmod 600 /swapfile${NC}"
    echo -e "${YELLOW}       sudo mkswap /swapfile${NC}"
    echo -e "${YELLOW}       sudo swapon /swapfile${NC}"
    echo -e "${YELLOW}  2) Aumentar a RAM da VM/servidor.${NC}"
    echo -e "${YELLOW}  3) Compilar em outra máquina/CI com mais memória e${NC}"
    echo -e "${YELLOW}     copiar apenas a pasta 'dist/' resultante para este servidor.${NC}"
    echo -e "${YELLOW}--------------------------------------------------------${NC}"
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
