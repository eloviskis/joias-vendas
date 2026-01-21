#!/bin/bash
# Script de backup simples sem Google Drive
# Mantém backups locais e permite sincronização manual

set -e

# Variáveis
BACKUP_DIR="/root/backups"
PROJECT_DIR="/root/joias-vendas"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="joias-backup-${TIMESTAMP}"
TEMP_DIR="/tmp/${BACKUP_NAME}"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Iniciando Backup do Sistema Joias Vendas ===${NC}"
echo "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"

# Criar diretórios
mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEMP_DIR}"

# 1. Backup do banco de dados PostgreSQL
echo -e "${YELLOW}Fazendo backup do banco de dados...${NC}"
docker exec joias-vendas-db-1 pg_dump -U joias -d joias > "${TEMP_DIR}/database.sql"
echo "✓ Banco de dados exportado"

# 2. Backup dos uploads
echo -e "${YELLOW}Copiando arquivos de upload...${NC}"
if [ -d "${PROJECT_DIR}/apps/api/uploads" ]; then
    cp -r "${PROJECT_DIR}/apps/api/uploads" "${TEMP_DIR}/"
    echo "✓ Uploads copiados"
else
    echo "⚠ Diretório de uploads não encontrado"
fi

# 3. Informações do sistema
echo -e "${YELLOW}Coletando informações do sistema...${NC}"
cat > "${TEMP_DIR}/system-info.txt" << EOF
Sistema: Joias Vendas Backup
Data: $(date)
Hostname: $(hostname)
Uptime: $(uptime)

=== Containers Docker ===
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}")

=== Versão do Sistema ===
$(cat /etc/os-release | head -n 3)

=== Uso de Disco ===
$(df -h / | tail -n 1)

=== Uso de Memória ===
$(free -h | grep Mem)
EOF
echo "✓ Informações do sistema coletadas"

# 4. Comprimir tudo
echo -e "${YELLOW}Comprimindo backup...${NC}"
cd /tmp
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
echo "✓ Backup comprimido: ${BACKUP_SIZE}"

# 5. Limpar temp
rm -rf "${TEMP_DIR}"

# 6. Manter apenas os últimos 30 backups
echo -e "${YELLOW}Limpando backups antigos...${NC}"
cd "${BACKUP_DIR}"
ls -t joias-backup-*.tar.gz | tail -n +31 | xargs -r rm --
BACKUP_COUNT=$(ls -1 joias-backup-*.tar.gz 2>/dev/null | wc -l)
echo "✓ Mantidos ${BACKUP_COUNT} backups"

# 7. Resumo final
echo -e "${GREEN}=== Backup Concluído com Sucesso! ===${NC}"
echo "Arquivo: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Tamanho: ${BACKUP_SIZE}"
echo "Total de backups: ${BACKUP_COUNT}"
echo ""
echo "Para baixar este backup, execute:"
echo "  scp root@31.97.251.57:${BACKUP_DIR}/${BACKUP_NAME}.tar.gz ."
