#!/bin/bash
# Backup automático para Google Drive
# Este script faz backup do banco de dados e código para o Google Drive

set -e

# Configurações
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="joias-vendas-backup-${DATE}"
PROJECT_DIR="/root/joias-vendas"

# Criar diretório de backup
mkdir -p "${BACKUP_DIR}"
cd "${BACKUP_DIR}"

# Criar diretório temporário para este backup
mkdir -p "${BACKUP_NAME}"
cd "${BACKUP_NAME}"

echo "=== Iniciando backup ${DATE} ==="

# 1. Backup do banco de dados PostgreSQL
echo "Fazendo backup do banco de dados..."
docker exec joias-vendas-db-1 pg_dump -U joias -d joias > database.sql
echo "✓ Backup do banco concluído"

# 2. Backup dos uploads (fotos)
echo "Fazendo backup dos uploads..."
if [ -d "${PROJECT_DIR}/apps/api/uploads" ]; then
    cp -r "${PROJECT_DIR}/apps/api/uploads" ./
    echo "✓ Backup dos uploads concluído"
else
    echo "! Pasta uploads não encontrada"
fi

# 3. Backup das configurações
echo "Fazendo backup das configurações..."
cp "${PROJECT_DIR}/docker-compose.yml" ./
cp "${PROJECT_DIR}/.env" ./ 2>/dev/null || echo "Arquivo .env não encontrado"
echo "✓ Backup das configurações concluído"

# 4. Informações do sistema
echo "Coletando informações do sistema..."
cat > system-info.txt << EOF
Data do Backup: ${DATE}
Versão Git: $(cd ${PROJECT_DIR} && git rev-parse --short HEAD)
Containers: $(docker ps --format "{{.Names}} - {{.Status}}")
Espaço em disco: $(df -h / | tail -1)
EOF
echo "✓ Informações coletadas"

# 5. Compactar tudo
echo "Compactando backup..."
cd "${BACKUP_DIR}"
zip -r "${BACKUP_NAME}.zip" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"
echo "✓ Backup compactado: ${BACKUP_NAME}.zip"

# 6. Enviar para Google Drive usando rclone
echo "Enviando para Google Drive..."
if command -v rclone &> /dev/null; then
    rclone copy "${BACKUP_NAME}.zip" gdrive:backups/joias-vendas/ --progress
    echo "✓ Backup enviado para Google Drive"
    
    # Manter apenas os últimos 30 backups locais
    ls -t ${BACKUP_DIR}/joias-vendas-backup-*.zip | tail -n +31 | xargs -r rm
    echo "✓ Backups antigos removidos (mantendo últimos 30)"
else
    echo "! rclone não instalado. Backup salvo apenas localmente em:"
    echo "  ${BACKUP_DIR}/${BACKUP_NAME}.zip"
fi

echo "=== Backup concluído com sucesso! ==="
