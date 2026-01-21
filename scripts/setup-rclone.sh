#!/bin/bash
# Instalação e configuração do rclone para Google Drive

echo "=== Instalando rclone ==="

# Instalar rclone
if ! command -v rclone &> /dev/null; then
    curl https://rclone.org/install.sh | bash
    echo "✓ rclone instalado"
else
    echo "✓ rclone já instalado"
fi

echo ""
echo "=== Configuração do Google Drive ==="
echo ""
echo "Execute os seguintes comandos no servidor:"
echo ""
echo "  1. rclone config"
echo "  2. Escolha 'n' para novo remote"
echo "  3. Nome: gdrive"
echo "  4. Tipo: Google Drive (número correspondente)"
echo "  5. Client ID e Secret: deixe em branco (pressione Enter)"
echo "  6. Scope: 1 (Full access)"
echo "  7. Service Account: deixe em branco"
echo "  8. Auto config: n (pois é um servidor remoto)"
echo "  9. COPIE o link que aparecer"
echo "  10. Abra o link no navegador e autorize"
echo "  11. COLE o código de autorização"
echo "  12. Configure como Team Drive? n"
echo "  13. Confirme: y"
echo ""
echo "Após configurar, teste com:"
echo "  rclone lsd gdrive:"
echo ""
