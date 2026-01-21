#!/bin/bash
# Sincronização de vendas para Google Sheets
# Este script exporta as vendas do banco para CSV e envia para Google Sheets

set -e

# Configurações
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d)
SALES_FILE="vendas-${DATE}.csv"

mkdir -p "${BACKUP_DIR}"
cd "${BACKUP_DIR}"

echo "=== Exportando vendas do dia ${DATE} ==="

# Exportar vendas do banco de dados
docker exec joias-vendas-db-1 psql -U joias -d joias -c "
COPY (
    SELECT 
        s.id,
        s.\"createdAt\" as data_venda,
        c.name as cliente,
        c.phone as telefone,
        s.\"totalValue\" as valor_total,
        s.installments as parcelas,
        s.\"discountValue\" as desconto,
        s.\"sellerName\" as vendedora,
        s.\"pieceCode\" as codigo_peca,
        s.factor as fator,
        s.\"baseValue\" as valor_base
    FROM \"Sale\" s
    LEFT JOIN \"Client\" c ON s.\"clientId\" = c.id
    ORDER BY s.\"createdAt\" DESC
) TO STDOUT WITH CSV HEADER
" > "${SALES_FILE}"

echo "✓ Vendas exportadas para ${SALES_FILE}"

# Enviar para Google Drive
if command -v rclone &> /dev/null; then
    # Enviar CSV para pasta específica
    rclone copy "${SALES_FILE}" gdrive:vendas/ --progress
    
    # Verificar se existe spreadsheet configurado
    # Nota: Para sincronizar direto com Google Sheets, 
    # é necessário usar a API do Google Sheets
    echo "✓ CSV enviado para Google Drive"
    echo ""
    echo "📊 Para importar no Google Sheets:"
    echo "   1. Acesse: https://drive.google.com"
    echo "   2. Abra a pasta 'vendas'"
    echo "   3. Clique com botão direito em ${SALES_FILE}"
    echo "   4. Selecione 'Abrir com' > 'Google Planilhas'"
    echo ""
    echo "   Ou use a função IMPORTDATA no Sheets:"
    echo "   =IMPORTDATA(\"URL_DO_ARQUIVO_CSV\")"
else
    echo "! rclone não instalado. Arquivo salvo em:"
    echo "  ${BACKUP_DIR}/${SALES_FILE}"
fi

# Limpar arquivos antigos (manter últimos 90 dias)
find ${BACKUP_DIR} -name "vendas-*.csv" -mtime +90 -delete 2>/dev/null || true

echo "=== Sincronização concluída! ==="
