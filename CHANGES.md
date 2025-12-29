# 📋 Mudanças Implementadas - Sistema de Fotos em Vendas

## ✅ Funcionalidade: Enviar Foto do Item + Carnê via WhatsApp

### Objetivo
Permitir que ao finalizar uma venda, além de enviar o carnê (detalhes das parcelas), o usuário possa enviar também a foto do item via WhatsApp para o cliente.

### Mudanças Realizadas

#### 1. **Backend (API Fastify)**

**Arquivo:** `apps/api/prisma/schema.prisma`
- Adicionado campo `photoUrl: String?` ao modelo `Sale`
- Permite armazenar a URL da foto salva no servidor

**Arquivo:** `apps/api/prisma/schema.sqlite.prisma`
- Mesmo campo adicionado para suporte ao SQLite (desktop)

**Arquivo:** `apps/api/src/index.ts` (POST /sales)
- Modificado handler para salvar `photoUrl` na foto do arquivo
- Arquivo de foto salvo em `/uploads/{saleId}.jpg`
- URL armazenada como `/uploads/{saleId}.jpg` no banco de dados

**Migração:** `apps/api/prisma/migrations/20251229144000_add_photo_url_to_sale`
- Criada automaticamente pelo Prisma
- Adiciona coluna `photoUrl` (nullable) à tabela `Sale`

#### 2. **Frontend (React)**

**Arquivo:** `apps/web/src/App.tsx` - Modal `ShareCarneModal`
- Novo botão: **"Enviar Foto + Carnê"** (ícone 📸)
- Apareça apenas se `sale.photoUrl` existir
- Abre WhatsApp com mensagem contendo:
  - Texto descritivo da peça (nome, código, valor)
  - Link da foto: `{baseUrl}/uploads/{saleId}.jpg`
  - Mensagem incentivando visualização da foto
- Botões adicionais mantidos: "Enviar Carnê", "Copiar Texto", "Imprimir PDF"

### Fluxo de Uso

1. **Registrar Nova Venda**
   - Usuário preenche formulário de venda
   - Tira/seleciona foto do item (via câmera ou arquivo)
   - Clica "Registrar Venda"

2. **Modal de Compartilhamento**
   - Sistema exibe modal com opções de compartilhamento
   - Se houver foto: aparece botão "Enviar Foto + Carnê"
   - Se não houver foto: aparece apenas botão "Enviar Carnê"

3. **Envio via WhatsApp**
   - Clica em "Enviar Foto + Carnê"
   - Abre WhatsApp Web com mensagem pré-preenchida
   - Mensagem inclui link da imagem hospedada no servidor

### URLs Envolvidas

- **Upload da Foto:** `/uploads/{saleId}.jpg` (salvo no servidor)
- **Acesso via Nginx:** `https://vendasvani.online/uploads/{saleId}.jpg`
- **WhatsApp Link:** `https://wa.me/55{phone}?text={mensagem_codificada}`

### Segurança

- ✅ Foto armazenada com ID único da venda (evita conflitos)
- ✅ Nginx serve com cache de 7 dias e HTTPS
- ✅ Requer token JWT para criar vendas (POST /sales)
- ✅ Arquivos públicos (qualquer pessoa pode acessar a foto via link)

### Compatibilidade

- ✅ PostgreSQL (produção) - migração aplicada
- ✅ SQLite (desktop) - schema sincronizado
- ✅ React 18.2.0 - modal atualizado
- ✅ Fastify 4.26.1 - handler POST /sales atualizado
- ✅ Nginx - proxy `/uploads/` configurado

### Teste

1. Criar nova venda com foto
2. Modal deve exibir "Enviar Foto + Carnê"
3. Clicar no botão abre WhatsApp com texto + link da foto
4. Validar que foto está acessível via `https://vendasvani.online/uploads/{saleId}.jpg`

### Commits

```bash
git commit -m "feat: adicionar campo photoUrl ao Sale e botão para enviar foto + carnê via WhatsApp"
```

### Deploy

```bash
cd /root/joias-vendas
git pull origin main
docker compose run --rm api npx prisma migrate deploy
docker compose up -d api web
```

---

**Data:** 2024-12-29  
**Status:** ✅ Implementado e Deployado  
**Próximos Passos:** Remover dependências de provedores de WhatsApp (Twilio/Meta) se não forem usadas
