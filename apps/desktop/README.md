# Aplicativo Desktop (Windows)

Este diretório adiciona um empacotamento desktop (Electron) que:
- Inicia a API local em SQLite (banco no diretório do usuário)
- Serve o frontend buildado e proxy `/api` para a API local
- Gera instalador Windows via `electron-builder`

## Pré-requisitos
- Node.js 18+
- Ambiente atual com projeto funcionando

## Passos de build
1. Gerar build do frontend:
   ```bash
   cd apps/web
   npm run build
   ```
2. Gerar client Prisma para SQLite:
   ```bash
   cd apps/api
   npx prisma generate --schema prisma/schema.sqlite.prisma
   ```
3. Compilar a API:
   ```bash
   cd apps/api
   npm run build
   ```
4. Criar instalador Windows:
   ```bash
   cd apps/desktop
   npm run dist
   ```

O instalador gerado estará em `apps/desktop/dist/`.

## Banco local
O arquivo do banco (SQLite) é criado em `%APPDATA%/joias-desktop/joias.sqlite` (pasta `userData` do Electron). Backups podem ser feitos copiando este arquivo.
