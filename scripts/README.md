# 📦 Scripts de Backup e Sincronização

## 🚀 Configuração Inicial

### 1. Instalar e Configurar rclone no Servidor

```bash
# Copiar scripts para o servidor
scp -r scripts root@31.97.251.57:/root/joias-vendas/

# Conectar no servidor
ssh root@31.97.251.57

# Executar configuração
cd /root/joias-vendas/scripts
bash setup-rclone.sh
```

Siga as instruções na tela para configurar o Google Drive.

### 2. Testar os Scripts

```bash
# Testar backup completo
bash /root/joias-vendas/scripts/backup-to-gdrive.sh

# Testar sincronização de vendas
bash /root/joias-vendas/scripts/sync-sales-to-sheets.sh
```

## ⏰ Agendar Execução Automática

### Configurar Cron Jobs

```bash
# Editar crontab
crontab -e

# Adicionar as seguintes linhas:

# Backup completo todos os dias às 2h da manhã
0 2 * * * /root/joias-vendas/scripts/backup-to-gdrive.sh >> /var/log/joias-backup.log 2>&1

# Sincronizar vendas todos os dias às 23h
0 23 * * * /root/joias-vendas/scripts/sync-sales-to-sheets.sh >> /var/log/joias-sync.log 2>&1
```

## 📊 Integração com Google Sheets

### Opção 1: Importação Manual (Mais Simples)

1. Acesse https://drive.google.com
2. Vá para a pasta `vendas/`
3. Abra o arquivo CSV mais recente com Google Planilhas
4. Salve como planilha permanente

### Opção 2: Importação Automática (Recomendado)

1. Crie uma planilha no Google Sheets
2. Use a fórmula:
```
=IMPORTDATA("https://drive.google.com/uc?export=download&id=SEU_ID_DO_ARQUIVO")
```
3. Configure para atualizar automaticamente

### Opção 3: Google Apps Script (Avançado)

Criar um script que:
- Lê o CSV do Drive automaticamente
- Atualiza uma planilha específica
- Mantém histórico

## 📁 Estrutura dos Backups

### No Google Drive:

```
backups/
  joias-vendas/
    joias-vendas-backup-20260121_020000.zip
    joias-vendas-backup-20260122_020000.zip
    ...

vendas/
  vendas-20260121.csv
  vendas-20260122.csv
  ...
```

### Conteúdo do Backup ZIP:

```
database.sql          # Dump completo do PostgreSQL
uploads/              # Fotos das peças
docker-compose.yml    # Configuração dos containers
system-info.txt       # Informações do sistema
```

## 🔧 Manutenção

### Ver Logs dos Backups

```bash
# Ver últimos backups
tail -50 /var/log/joias-backup.log

# Ver sincronização de vendas
tail -50 /var/log/joias-sync.log
```

### Limpar Backups Antigos

Os scripts já fazem limpeza automática:
- **Backups locais**: mantém últimos 30
- **CSVs de vendas**: mantém últimos 90 dias

### Restaurar Backup

```bash
# Baixar backup do Google Drive
rclone copy gdrive:backups/joias-vendas/joias-vendas-backup-XXXXXX.zip /tmp/

# Extrair
cd /tmp
unzip joias-vendas-backup-XXXXXX.zip

# Restaurar banco
docker exec -i joias-vendas-db-1 psql -U joias -d joias < database.sql

# Restaurar uploads
cp -r uploads/* /root/joias-vendas/apps/api/uploads/
```

## ⚠️ Importante

- **Credenciais do rclone** ficam em `~/.config/rclone/rclone.conf`
- **Backup desse arquivo** também é importante
- **Teste regularmente** a restauração dos backups
- **Monitore o espaço** no Google Drive (15GB grátis)

## 🆘 Solução de Problemas

### rclone não encontrado

```bash
curl https://rclone.org/install.sh | bash
```

### Erro de permissão

```bash
chmod +x /root/joias-vendas/scripts/*.sh
```

### Google Drive cheio

Configure limpeza automática no Drive ou faça upgrade do plano.

---

**Última atualização**: 21/01/2026
