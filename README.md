# Joias Vendas (TypeScript + PWA + API)

Projeto fullstack para registro de vendas, clientes, parcelas/carnê, despesas e envio de lembretes de WhatsApp.

## Stack
- Frontend: React + Vite + TS + Tailwind, PWA (offline + instalação)
- Backend: Fastify + TS + Prisma + Postgres
- Envio WhatsApp: Provider configurável (Twilio ou Meta WhatsApp Business API)
- Deploy: Docker Compose (api, web, db, proxy)

## Variáveis de Ambiente
Crie `apps/api/.env` baseado em `apps/api/.env.example`.

## Rodar local
```bash
# instalar dependências (cada app)
cd apps/api && npm install && cd ../../apps/web && npm install

# backend (dev)
cd ../api && npm run dev

# frontend (dev)
cd ../web && npm run dev
```

## Deploy (VPS sem domínio)
```bash
# na VPS (Ubuntu 24.04)
sudo apt-get update && sudo apt-get install -y curl git
curl -fsSL https://get.docker.com | sudo sh

# copiar .env e docker-compose.yml para a VPS
# ajustar variáveis (DB e WhatsApp)

# subir containers
sudo docker compose up -d --build
```

A aplicação web ficará acessível em `http://<IP>:8080` e a API em `http://<IP>:3000` (ajustável no compose).

## Próximos passos
- Configurar tokens do WhatsApp (Twilio ou Meta) em `.env` e habilitar envio automático de lembretes.
- Habilitar HTTPS quando tiver um domínio.
