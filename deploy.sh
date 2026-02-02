#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."
cd /root/joias-vendas

echo "📥 Baixando últimas alterações..."
git pull

HASH=$(git rev-parse --short HEAD)
echo "📦 Versão: $HASH"

echo "🔨 Buildando API..."
docker compose build api

echo "🔨 Buildando Web..."
docker compose build --build-arg GIT_HASH=$HASH web

echo "🗄️ Aplicando migrations do banco..."
docker compose run --rm api npx prisma migrate deploy

echo "🔄 Reiniciando serviços..."
docker compose up -d api web

echo "✅ Deploy concluído! Versão: $HASH"
echo "📊 Status dos containers:"
docker compose ps
