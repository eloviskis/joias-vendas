#!/bin/bash
cd /root/joias-vendas
git pull
HASH=$(git rev-parse --short HEAD)
docker compose build --build-arg GIT_HASH=$HASH web
docker compose up -d web
echo "Deploy concluído! Versão: $HASH"
