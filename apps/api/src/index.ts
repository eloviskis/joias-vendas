import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { createProvider, WhatsAppProvider } from './whatsapp-providers.js';
import { generateCardText, CardData } from './card-generator.js';
import { createCanvas } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });
app.register(cors, { origin: true });
app.register(multipart);

// Servir arquivos estáticos (uploads)
app.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
  decorateReply: false
});

// Allow overriding the database URL to support desktop (SQLite) or server (Postgres)
const prisma = process.env.DATABASE_URL
  ? new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
  : new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev';

// WhatsApp provider (dinâmico via settings)
let provider: WhatsAppProvider = createProvider('mock', {});

// Auth
app.post('/auth/register', async (req: any, reply) => {
  const { email, password } = req.body || {};
  if (!email || !password) return reply.code(400).send({ error: 'Missing email/password' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return reply.code(409).send({ error: 'Email exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash: hash } });
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  return { token };
});

app.post('/auth/login', async (req: any, reply) => {
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(401).send({ error: 'Invalid credentials' });
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return reply.code(401).send({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  return { token };
});

app.post('/auth/change-password', async (req: any, reply) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return reply.code(400).send({ error: 'Missing fields' });
  
  // Extrair user ID do token
  const auth = req.headers.authorization;
  const token = auth?.slice(7);
  if (!token) return reply.code(401).send({ error: 'No token' });
  
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return reply.code(404).send({ error: 'User not found' });
    
    // Verificar senha atual
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return reply.code(401).send({ error: 'Incorrect current password' });
    
    // Atualizar com nova senha
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash }
    });
    
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
});

app.post('/auth/admin-password', async (req: any, reply) => {
  const { adminPassword } = req.body || {};
  if (!adminPassword) return reply.code(400).send({ error: 'Missing adminPassword' });
  
  // Extrair user ID do token
  const auth = req.headers.authorization;
  const token = auth?.slice(7);
  if (!token) return reply.code(401).send({ error: 'No token' });
  
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return reply.code(404).send({ error: 'User not found' });
    
    // Salvar senha de admin (hash)
    const hash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { adminPasswordHash: hash }
    });
    
    return { success: true, message: 'Admin password configured successfully' };
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
});

app.post('/auth/create-user', async (req: any, reply) => {
  const { email, password } = req.body || {};
  if (!email || !password) return reply.code(400).send({ error: 'Missing email/password' });
  
  // Verificar se usuário já existe
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return reply.code(409).send({ error: 'Email já cadastrado' });
  
  // Criar novo usuário
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, passwordHash: hash } });
  
  return { success: true, message: 'User created successfully' };
});

// Listar usuários
app.get('/users', async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true
    },
    orderBy: { id: 'asc' }
  });
  return users;
});

// Atualizar usuário
app.put('/users/:id', async (req: any, reply) => {
  const { id } = req.params;
  const { email, password } = req.body || {};
  
  try {
    const data: any = {};
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.user.update({
      where: { id: Number(id) },
      data
    });
    
    return { success: true };
  } catch (error: any) {
    return reply.code(400).send({ error: error.message || 'Erro ao atualizar' });
  }
});

// Excluir usuário
app.delete('/users/:id', async (req: any, reply) => {
  const { id } = req.params;
  
  try {
    await prisma.user.delete({
      where: { id: Number(id) }
    });
    
    return { success: true };
  } catch (error: any) {
    return reply.code(400).send({ error: error.message || 'Erro ao excluir' });
  }
});

// Simple auth hook (optional)
app.addHook('preHandler', async (req: any, reply) => {
  const path = req.url || req.routerPath || '';
  // Permitir acesso sem autenticação para /auth e /uploads
  if (path.startsWith('/auth') || path.startsWith('/uploads')) return;
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return reply.code(401).send({ error: 'No token' });
  try {
    const token = auth.slice(7);
    jwt.verify(token, JWT_SECRET);
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
});

// Entities
app.post('/clients', async (req: any) => {
  const { name, phone, cpf, rg, city, address, billingAddress } = req.body;
  // Tentar buscar cliente existente pelo telefone
  const existing = await prisma.client.findUnique({ where: { phone } });
  if (existing) {
    // Atualizar dados se fornecidos
    if (cpf || address || rg || city || billingAddress) {
      return prisma.client.update({
        where: { phone },
        data: { 
          ...(cpf && { cpf }),
          ...(rg && { rg }),
          ...(city && { city }),
          ...(address && { address }),
          ...(billingAddress && { billingAddress })
        }
      });
    }
    return existing;
  }
  return prisma.client.create({ data: { name, phone, cpf, rg, city, address, billingAddress } });
});

// Atualizar cliente
app.put('/clients/:id', async (req: any) => {
  const id = Number(req.params.id);
  const { name, phone, cpf, rg, city, address, billingAddress } = req.body;
  return prisma.client.update({
    where: { id },
    data: { 
      ...(name && { name }),
      ...(phone && { phone }),
      ...(cpf !== undefined && { cpf }),
      ...(rg !== undefined && { rg }),
      ...(city !== undefined && { city }),
      ...(address !== undefined && { address }),
      ...(billingAddress !== undefined && { billingAddress })
    }
  });
});

// Deletar todos os clientes
app.delete('/clients/delete-all', async (req: any, reply) => {
  try {
    const count = await prisma.client.count();
    await prisma.client.deleteMany({});
    return { success: true, deleted: count };
  } catch (error: any) {
    return reply.code(500).send({ error: error.message || 'Erro ao deletar clientes' });
  }
});

app.get('/clients/:id/sales', async (req: any) => {
  const id = Number(req.params.id);
  return prisma.sale.findMany({
    where: { clientId: id },
    include: { installmentsR: true },
    orderBy: { saleDate: 'desc' }
  });
});

app.get('/sales', async () => {
  return prisma.sale.findMany({
    include: { client: true, installmentsR: true },
    orderBy: { saleDate: 'desc' }
  });
});

app.delete('/sales/:id', async (req: any, reply) => {
  const id = Number(req.params.id);
  const { reason, deletedBy } = req.body || {};
  
  if (!reason || !reason.trim()) {
    return reply.code(400).send({ error: 'Motivo é obrigatório' });
  }
  
  try {
    // Buscar dados da venda antes de deletar
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { client: true }
    });
    
    if (!sale) {
      return reply.code(404).send({ error: 'Venda não encontrada' });
    }
    
    // Registrar exclusão
    await prisma.saleDeletion.create({
      data: {
        saleId: id,
        clientName: sale.client.name,
        itemName: sale.itemName,
        totalValue: sale.totalValue,
        saleDate: sale.saleDate,
        deletedBy: deletedBy || 'Usuário',
        reason: reason.trim()
      }
    });
    
    // Deletar parcelas primeiro (cascade)
    await prisma.installment.deleteMany({ where: { saleId: id } });
    
    // Deletar venda
    await prisma.sale.delete({ where: { id } });
    
    return { success: true, message: 'Venda excluída com sucesso' };
  } catch (error: any) {
    return reply.code(500).send({ error: error.message || 'Erro ao excluir venda' });
  }
});

app.post('/sales', async (req: any) => {
  const { clientId, itemName, itemCode, factor, itemType, baseValue, totalValue, paymentMethod, installments, roundUpInstallments, customInstallmentValues, saleDate, observations, sellerName, commission, imageBase64, sendCard } = req.body;
  const sale = await prisma.sale.create({
    data: { clientId, itemName, itemCode, factor, itemType, baseValue, totalValue, paymentMethod, installments, saleDate, observations, sellerName, commission }
  });
  // save image if provided
  let photoUrl: string | null = null;
  if (imageBase64) {
    const dir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${sale.id}.jpg`);
    const data = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    photoUrl = `/uploads/${sale.id}.jpg`;
    
    // Update sale with photoUrl
    await prisma.sale.update({
      where: { id: sale.id },
      data: { photoUrl }
    });
  }
  // create installments
  const inst = [] as any[];
  
  if (customInstallmentValues && Array.isArray(customInstallmentValues) && customInstallmentValues.length === installments) {
    // Usar valores personalizados das parcelas
    for (let i = 0; i < installments; i++) {
      const due = new Date(saleDate || new Date());
      due.setMonth(due.getMonth() + i);
      inst.push({ saleId: sale.id, sequence: i + 1, amount: customInstallmentValues[i], dueDate: due });
    }
  } else if (roundUpInstallments && installments > 1) {
    // Arredondar parcelas para cima, última parcela menor
    const parcelaArredondada = Math.ceil(totalValue / installments);
    const somaArredondada = parcelaArredondada * (installments - 1);
    const ultimaParcela = totalValue - somaArredondada;
    
    for (let i = 0; i < installments; i++) {
      const due = new Date(saleDate || new Date());
      due.setMonth(due.getMonth() + i);
      const amount = i === installments - 1 ? ultimaParcela : parcelaArredondada;
      inst.push({ saleId: sale.id, sequence: i + 1, amount, dueDate: due });
    }
  } else {
    // Parcelas iguais (comportamento padrão)
    const per = installments && installments > 1 ? totalValue / installments : totalValue;
    for (let i = 0; i < installments; i++) {
      const due = new Date(saleDate || new Date());
      due.setMonth(due.getMonth() + i);
      inst.push({ saleId: sale.id, sequence: i + 1, amount: per, dueDate: due });
    }
  }
  
  await prisma.installment.createMany({ data: inst });

  // Enviar cartão se solicitado e se tiver parcelas
  if (sendCard && installments > 1) {
    try {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      const createdInstallments = await prisma.installment.findMany({ 
        where: { saleId: sale.id },
        orderBy: { sequence: 'asc' }
      });

      if (client) {
        const cardData: CardData = {
          clientName: client.name,
          itemName,
          totalValue,
          saleDate: new Date(saleDate),
          installments: createdInstallments.map(i => ({
            sequence: i.sequence,
            amount: i.amount,
            dueDate: i.dueDate,
            paid: i.paid
          }))
        };

        const cardText = generateCardText(cardData);

        // Enviar para cliente
        await provider.send({
          to: client.phone,
          body: cardText
        });

        await prisma.messageLog.create({
          data: {
            recipient: client.phone,
            message: cardText,
            provider: 'current',
            status: 'sent'
          }
        });

        // Enviar cópia para admin
        const settings = await prisma.settings.findMany();
        const adminPhone = settings.find(s => s.key === 'adminPhone')?.value;
        
        if (adminPhone) {
          await provider.send({
            to: adminPhone,
            body: `[CÓPIA] Cartão enviado para ${client.name}\n\n${cardText}`
          });
        }
      }
    } catch (error: any) {
      app.log.error('Erro ao enviar cartão:', error);
    }
  }

  return sale;
});

app.post('/installments/:id/pay', async (req: any, reply) => {
  const id = Number(req.params.id);
  const { paidAt } = req.body || {};
  const paidDate = paidAt ? new Date(paidAt) : new Date();
  const upd = await prisma.installment.update({ 
    where: { id }, 
    data: { paid: true, paidAt: paidDate },
    include: { sale: { include: { client: true, installmentsR: true } } }
  });
  return upd;
});

// Editar valor de uma parcela
app.put('/installments/:id', async (req: any) => {
  const id = Number(req.params.id);
  const { amount, dueDate } = req.body;
  return prisma.installment.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(dueDate && { dueDate: new Date(dueDate) })
    },
    include: { sale: { include: { client: true } } }
  });
});

app.post('/expenses', async (req: any) => {
  const { description, category, amount, date, paid } = req.body;
  return prisma.expense.create({ data: { description, category, amount, date: new Date(date), paid } });
});

app.get('/expenses', async () => {
  return prisma.expense.findMany({ orderBy: { date: 'desc' } });
});

// Endpoint para buscar todas as parcelas pendentes (para previsão)
app.get('/installments/pending', async () => {
  return prisma.installment.findMany({
    where: { paid: false },
    include: { sale: { include: { client: true } } },
    orderBy: { dueDate: 'asc' }
  });
});

// Reminders cron (daily at 08:00)
// Reminders cron (daily at 08:00)
cron.schedule('0 8 * * *', async () => {
  // Carregar configurações de lembrete
  const settings = await prisma.settings.findMany();
  const config: any = {};
  settings.forEach(s => { config[s.key] = s.value; });

  const remindersEnabled = config.remindersEnabled === 'true';
  if (!remindersEnabled) return;

  const daysBefore = parseInt(config.reminderDaysBefore || '3');
  const template = config.reminderTemplate || 'Olá {{cliente}}! Lembrete da parcela {{parcela}}/{{total}} da joia "{{item}}". Valor: R$ {{valor}}. Vencimento: {{vencimento}}.';

  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + daysBefore);
  
  const due = await prisma.installment.findMany({ 
    where: { paid: false, dueDate: { gte: now, lte: soon } }, 
    include: { sale: { include: { client: true } } } 
  });

  for (const inst of due) {
    const client = inst.sale.client;
    const text = template
      .replace(/\{\{cliente\}\}/g, client.name)
      .replace(/\{\{parcela\}\}/g, String(inst.sequence))
      .replace(/\{\{total\}\}/g, String(inst.sale.installments))
      .replace(/\{\{item\}\}/g, inst.sale.itemName)
      .replace(/\{\{valor\}\}/g, inst.amount.toFixed(2).replace('.', ','))
      .replace(/\{\{vencimento\}\}/g, new Date(inst.dueDate).toLocaleDateString('pt-BR'));

    try {
      await provider.send({ to: client.phone, body: text });
      await prisma.messageLog.create({
        data: {
          recipient: client.phone,
          message: text,
          provider: 'current',
          status: 'sent'
        }
      });
    } catch (e: any) {
      app.log.error(e);
      await prisma.messageLog.create({
        data: {
          recipient: client.phone,
          message: text,
          provider: 'current',
          status: 'error',
          error: e.message
        }
      });
    }
  }
});

// Dashboard endpoints
app.get('/dashboard/stats', async () => {
  const totalSales = await prisma.sale.count();
  const totalRevenue = await prisma.sale.aggregate({ _sum: { totalValue: true } });
  const totalExpenses = await prisma.expense.aggregate({ _sum: { amount: true } });
  const pendingInstallments = await prisma.installment.count({ where: { paid: false } });
  const pendingAmount = await prisma.installment.aggregate({ where: { paid: false }, _sum: { amount: true } });
  
  return {
    totalSales,
    totalRevenue: totalRevenue._sum.totalValue || 0,
    totalExpenses: totalExpenses._sum.amount || 0,
    pendingInstallments,
    pendingAmount: pendingAmount._sum.amount || 0,
    balance: (totalRevenue._sum.totalValue || 0) - (totalExpenses._sum.amount || 0)
  };
});

app.get('/dashboard/recent-sales', async (req: any, reply) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  try {
    const sales = await prisma.sale.findMany({
      take: 10,
      orderBy: { saleDate: 'desc' },
      include: { client: true }
    });
    return Array.isArray(sales) ? sales : [];
  } catch (error: any) {
    console.error('Erro ao buscar vendas recentes:', error);
    return [];
  }
});

app.get('/dashboard/pending-installments', async (req: any, reply) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  try {
    const now = new Date();
    const installments = await prisma.installment.findMany({
      where: {
        paid: false,
        dueDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
      include: { sale: { include: { client: true } } }
    });
    return Array.isArray(installments) ? installments : [];
  } catch (error: any) {
    console.error('Erro ao buscar parcelas pendentes:', error);
    return [];
  }
});

app.get('/dashboard/monthly-revenue', async (req: any, reply) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  try {
    const sales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: new Date(new Date().getFullYear(), 0, 1)
        }
      },
      select: { saleDate: true, totalValue: true }
    });
    
    const monthly = Array(12).fill(0);
    sales.forEach(sale => {
      const month = new Date(sale.saleDate).getMonth();
      monthly[month] += sale.totalValue;
    });
    return monthly;
  } catch (error: any) {
    console.error('Erro ao buscar receita mensal:', error);
    return Array(12).fill(0);
  }
});

// Clientes
app.get('/clients', async (req: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return { error: 'No token' };
  
  const decoded: any = jwt.verify(token, JWT_SECRET);
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' }
  });
  return clients;
});

app.get('/clients/:id', async (req: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return { error: 'No token' };
  
  jwt.verify(token, JWT_SECRET);
  const client = await prisma.client.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { sales: { include: { installmentsR: true } } }
  });
  return client;
});

app.post('/clients/import', async (req: any, reply) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return reply.code(401).send({ error: 'No token' });
  
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  const data = await req.file();
  if (!data) return reply.code(400).send({ error: 'No file uploaded' });

  const buffer = await data.toBuffer();
  const text = buffer.toString('utf-8');
  
  const lines = text.trim().split('\n');
  const clients = [];
  
  // Detectar formato (CSV, JSON, WhatsApp ou vCard .vcf)
  let format = 'csv';
  if (text.includes('BEGIN:VCARD')) format = 'vcf';
  else if (text.includes('{')) format = 'json';
  else if (text.includes('Contact') && text.includes('Phone')) format = 'whatsapp';

  if (format === 'json') {
    // JSON format: [{ "name": "...", "phone": "..." }]
    const parsed = JSON.parse(text);
    for (const item of parsed) {
      if (item.name && item.phone) {
        const phone = item.phone.replace(/\D/g, '');
        const existing = await prisma.client.findUnique({ where: { phone } });
        if (!existing) {
          await prisma.client.create({
            data: { name: item.name, phone }
          });
          clients.push({ name: item.name, phone });
        }
      }
    }
  } else if (format === 'whatsapp') {
    // WhatsApp export format: "Contact,Phone\nName,+5511999999999"
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const phone = parts[1].trim().replace(/\D/g, '');
        if (name && phone) {
          const existing = await prisma.client.findUnique({ where: { phone } });
          if (!existing) {
            await prisma.client.create({
              data: { name, phone }
            });
            clients.push({ name, phone });
          }
        }
      }
    }
  } else if (format === 'vcf') {
    // vCard (.vcf) - múltiplos cartões
    const entries = text.split(/BEGIN:VCARD/i).slice(1).map((s: string) => 'BEGIN:VCARD' + s);
    for (const entry of entries) {
      const fnMatch = entry.match(/(?:^|\n)FN:(.+)/i);
      const nMatch = entry.match(/(?:^|\n)N:(.+)/i);
      let name = fnMatch?.[1]?.trim() || '';
      if (!name && nMatch?.[1]) {
        const parts = nMatch[1].split(';');
        const last = (parts[0] || '').trim();
        const first = (parts[1] || '').trim();
        name = `${first} ${last}`.trim();
      }
      // Priorizar CELL/MOBILE, depois genéricos
      const cellMatches = (Array.from(entry.matchAll(/(?:^|\n)TEL[^:]*TYPE=(?:CELL|MOBILE)[^:]*:(.+)/gi)) as RegExpMatchArray[]).map(m => (m[1] || '').trim());
      const allTelMatches = (Array.from(entry.matchAll(/(?:^|\n)TEL[^:]*:(.+)/gi)) as RegExpMatchArray[]).map(m => (m[1] || '').trim());
      const phoneRaw = cellMatches.find(t => t.replace(/\D/g, '').length >= 8) || allTelMatches.find(t => t.replace(/\D/g, '').length >= 8) || '';
      const phone = phoneRaw.replace(/\D/g, '');
      if (name && phone) {
        const existing = await prisma.client.findUnique({ where: { phone } });
        if (!existing) {
          await prisma.client.create({ data: { name, phone } });
          clients.push({ name, phone });
        }
      }
    }
  } else {
    // CSV format: name,phone
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const phone = parts[1].trim().replace(/\D/g, '');
        if (name && phone) {
          const existing = await prisma.client.findUnique({ where: { phone } });
          if (!existing) {
            await prisma.client.create({
              data: { name, phone }
            });
            clients.push({ name, phone });
          }
        }
      }
    }
  }

  return { imported: clients.length, clients };
});

// Analytics/Relatório endpoint
app.get('/sales/analytics', async (req: any) => {
  const { period = 'month', clientIds = '[]' } = req.query;
  
  // Parse clientIds from query string
  let selectedClients: number[] = [];
  try {
    selectedClients = JSON.parse(Array.isArray(clientIds) ? clientIds[0] : clientIds);
  } catch {
    selectedClients = [];
  }

  // Calculate date range based on period
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - now.getDay());
      break;
    case '15days':
      startDate.setDate(now.getDate() - 15);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  // Build where clause
  const where: any = {
    saleDate: { gte: startDate }
  };
  if (selectedClients.length > 0) {
    where.clientId = { in: selectedClients };
  }

  // Get sales with client info
  const sales = await prisma.sale.findMany({
    where,
    include: { client: true, installmentsR: true },
    orderBy: { saleDate: 'desc' }
  });

  // Group by period
  const grouped: any = {};
  const clientSales: any = {};

  sales.forEach(sale => {
    const saleDate = new Date(sale.saleDate);
    let groupKey = '';

    switch (period) {
      case 'week':
        const weekStart = new Date(saleDate);
        weekStart.setDate(saleDate.getDate() - saleDate.getDay());
        groupKey = `Semana de ${weekStart.toLocaleDateString('pt-BR')}`;
        break;
      case '15days':
        const days = Math.floor((saleDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const period15 = Math.floor(days / 15);
        groupKey = `Período ${period15 + 1} (${15 * period15}-${15 * (period15 + 1)} dias)`;
        break;
      case 'month':
        groupKey = saleDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        break;
      case 'year':
        groupKey = saleDate.getFullYear().toString();
        break;
      default:
        groupKey = saleDate.toLocaleDateString('pt-BR');
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(sale);

    // Also group by client
    const clientName = sale.client.name;
    if (!clientSales[clientName]) {
      clientSales[clientName] = {
        clientId: sale.clientId,
        phone: sale.client.phone,
        sales: [],
        total: 0
      };
    }
    clientSales[clientName].sales.push(sale);
    clientSales[clientName].total += sale.totalValue;
  });

  // Calculate totals by period
  const periodTotals: any = {};
  Object.keys(grouped).forEach(period => {
    const periodSales = grouped[period];
    periodTotals[period] = {
      count: periodSales.length,
      total: periodSales.reduce((sum: number, s: any) => sum + s.totalValue, 0),
      sales: periodSales
    };
  });

  // Calculate grand total
  const grandTotal = sales.reduce((sum, s) => sum + s.totalValue, 0);

  return {
    period,
    startDate,
    endDate: now,
    selectedClients,
    totalSales: sales.length,
    totalRevenue: grandTotal,
    byPeriod: periodTotals,
    byClient: clientSales,
    allSales: sales
  };
});

// Settings endpoints
app.get('/settings', async () => {
  const settings = await prisma.settings.findMany();
  const config: any = {};
  settings.forEach(s => {
    config[s.key] = s.value;
  });
  return config;
});

app.put('/settings', async (req: any) => {
  const updates = req.body || {};
  
  for (const [key, value] of Object.entries(updates)) {
    await prisma.settings.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });
  }

  // Recarregar provider se mudou configuração de WhatsApp
  if (updates.whatsappProvider) {
    const config: any = {};
    const allSettings = await prisma.settings.findMany();
    allSettings.forEach(s => { config[s.key] = s.value; });
    
    provider = createProvider(config.whatsappProvider || 'mock', {
      accountSid: config.twilioAccountSid,
      authToken: config.twilioAuthToken,
      from: config.twilioFrom,
      token: config.metaToken,
      phoneNumberId: config.metaPhoneNumberId
    });
  }

  return { success: true };
});

// Enviar cartão de parcelas
app.post('/sales/:id/send-card', async (req: any, reply) => {
  const saleId = parseInt(req.params.id);
  
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { client: true, installmentsR: true }
  });

  if (!sale) {
    return reply.code(404).send({ error: 'Sale not found' });
  }

  const cardData: CardData = {
    clientName: sale.client.name,
    itemName: sale.itemName,
    totalValue: sale.totalValue,
    saleDate: sale.saleDate,
    installments: sale.installmentsR.map(inst => ({
      sequence: inst.sequence,
      amount: inst.amount,
      dueDate: inst.dueDate,
      paid: inst.paid
    }))
  };

  const cardText = generateCardText(cardData);

  // Enviar para o cliente
  try {
    await provider.send({
      to: sale.client.phone,
      body: cardText
    });

    await prisma.messageLog.create({
      data: {
        recipient: sale.client.phone,
        message: cardText,
        provider: 'current',
        status: 'sent'
      }
    });
  } catch (error: any) {
    await prisma.messageLog.create({
      data: {
        recipient: sale.client.phone,
        message: cardText,
        provider: 'current',
        status: 'error',
        error: error.message
      }
    });
    app.log.error(error);
  }

  // Enviar para admin
  const settings = await prisma.settings.findMany();
  const adminPhone = settings.find(s => s.key === 'adminPhone')?.value;
  
  if (adminPhone) {
    try {
      await provider.send({
        to: adminPhone,
        body: `[CÓPIA] Cartão enviado para ${sale.client.name}\n\n${cardText}`
      });

      await prisma.messageLog.create({
        data: {
          recipient: adminPhone,
          message: cardText,
          provider: 'current',
          status: 'sent'
        }
      });
    } catch (error: any) {
      app.log.error(error);
    }
  }

  return { success: true, cardSent: true };
});

// Teste de envio de WhatsApp
app.post('/settings/test-whatsapp', async (req: any, reply) => {
  const { phone } = req.body;
  
  if (!phone) {
    return reply.code(400).send({ error: 'Phone required' });
  }

  try {
    await provider.send({
      to: phone,
      body: '✅ Teste de envio do sistema Vani e Elo Joias!\n\nSe você recebeu esta mensagem, a configuração do WhatsApp está funcionando corretamente.'
    });

    await prisma.messageLog.create({
      data: {
        recipient: phone,
        message: 'Test message',
        provider: 'current',
        status: 'sent'
      }
    });

    return { success: true };
  } catch (error: any) {
    await prisma.messageLog.create({
      data: {
        recipient: phone,
        message: 'Test message',
        provider: 'current',
        status: 'error',
        error: error.message
      }
    });

    return reply.code(500).send({ error: error.message });
  }
});

// Teste de envio de Email
app.post('/settings/test-email', async (req: any, reply) => {
  const { email } = req.body;
  
  if (!email) {
    return reply.code(400).send({ error: 'Email required' });
  }

  try {
    // Buscar configurações de email
    const settings = await prisma.settings.findMany();
    const config: Record<string, string> = {};
    settings.forEach(s => { config[s.key] = s.value; });

    const smtpHost = config.smtpHost || 'smtp.umbler.com';
    const smtpPort = parseInt(config.smtpPort || '587');
    const smtpUser = config.smtpUser || '';
    const smtpPassword = config.smtpPassword || '';
    const smtpFromName = config.smtpFromName || 'Vani e Elo Joias';
    const smtpSecure = config.smtpSecure === 'true';

    if (!smtpUser || !smtpPassword) {
      return reply.code(400).send({ error: 'Configure as credenciais de email primeiro' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpUser}>`,
      to: email,
      subject: '✅ Teste de Email - Vani e Elo Joias',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #7c3aed, #3b82f6); border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 10px;">
            <h1 style="color: #7c3aed; margin: 0 0 20px 0;">💎 Vani e Elo Joias</h1>
            <p style="font-size: 16px; color: #333;">Este é um email de teste do sistema.</p>
            <p style="font-size: 14px; color: #666;">Se você recebeu esta mensagem, as configurações de email estão funcionando corretamente!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      `
    });

    return { success: true };
  } catch (error: any) {
    console.error('Email error:', error);
    return reply.code(500).send({ error: error.message || 'Erro ao enviar email' });
  }
});

// Logs de mensagens
app.get('/message-logs', async () => {
  return prisma.messageLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
});

// Download de imagem (sem autenticação para permitir compartilhamento)
app.get('/download/:filename', async (req: any, reply) => {
  const { filename } = req.params;
  
  // Validar que o arquivo existe e está no diretório de uploads
  const filepath = path.join(process.cwd(), 'apps', 'api', 'uploads', filename);
  const normalizedPath = path.normalize(filepath);
  const uploadsDir = path.normalize(path.join(process.cwd(), 'apps', 'api', 'uploads'));
  
  // Validar que o caminho está dentro de uploads (evitar directory traversal)
  if (!normalizedPath.startsWith(uploadsDir)) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
  
  if (!fs.existsSync(normalizedPath)) {
    return reply.code(404).send({ error: 'File not found' });
  }
  
  // Servir com headers de download
  reply.type('image/jpeg');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  reply.header('Cache-Control', 'public, max-age=31536000');
  
  const stream = fs.createReadStream(normalizedPath);
  return reply.send(stream);
});

// Mostruário (Showcase)
app.get('/showcase', async (req: any, reply) => {
  // Verificar autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  return prisma.showcase.findMany({
    orderBy: { createdAt: 'desc' }
  });
});

app.post('/showcase', async (req: any, reply) => {
  // Verificar autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  const { name, itemName, itemCode, factor, weight, baseValue, price, description, imageBase64 } = req.body || {};
  
  // Aceitar 'name' ou 'itemName'
  const finalItemName = name || itemName;
  // Aceitar 'weight' ou 'baseValue'
  const finalBaseValue = weight || baseValue;
  // Se não tiver price, calcular baseado no factor e baseValue
  const finalPrice = price || (factor && finalBaseValue ? factor * finalBaseValue : null);
  
  if (!finalItemName || !factor) {
    return reply.code(400).send({ error: 'Missing required fields: name and factor are required' });
  }

  // Salvar imagem se fornecida
  let imageUrl: string | null = null;
  let originalImageUrl: string | null = null;
  if (imageBase64) {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const ts = Date.now();
      const origFilename = `showcase-orig-${ts}.jpg`;
      const filename = `showcase-${ts}.jpg`;
      const origFilepath = path.join(uploadsDir, origFilename);
      const filepath = path.join(uploadsDir, filename);
      
      // Salvar original
      await sharp(buffer).jpeg({ quality: 92 }).toFile(origFilepath);
      originalImageUrl = `/uploads/${origFilename}`;

      // Processar imagem com Sharp + Canvas para adicionar faixa de preço
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;
      
      // Altura da faixa de preço (15% da altura da imagem, mínimo 80px)
      const bannerHeight = Math.max(80, Math.floor(height * 0.15));
      const fontSize = Math.floor(bannerHeight * 0.5);
      
      // Formatar o preço
      const priceText = finalPrice 
        ? `R$ ${finalPrice.toFixed(2).replace('.', ',')}`
        : 'Consulte o preço';
      
      // Criar faixa usando canvas
      const canvas = createCanvas(width, bannerHeight);
      const ctx = canvas.getContext('2d');
      
      // Fundo preto semi-transparente
      ctx.fillStyle = 'rgba(26, 26, 26, 0.92)';
      ctx.fillRect(0, 0, width, bannerHeight);
      
      // Texto em dourado com contorno preto
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Contorno preto
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(priceText, width / 2, bannerHeight / 2);
      
      // Preenchimento dourado
      ctx.fillStyle = '#FFD700';
      ctx.fillText(priceText, width / 2, bannerHeight / 2);
      
      // Converter canvas para buffer
      const bannerBuffer = canvas.toBuffer('image/png');
      
      // Compor imagem original com faixa de preço
      await sharp(buffer)
        .resize(width, height, { fit: 'cover' })
        .composite([{
          input: bannerBuffer,
          gravity: 'south'
        }])
        .jpeg({ quality: 90 })
        .toFile(filepath);
      
      imageUrl = `/uploads/${filename}`;
    } catch (error) {
      console.error('Error saving image:', error);
      return reply.code(500).send({ error: 'Error saving image', details: error });
    }
  }

  try {
    const item = await prisma.showcase.create({
      data: {
        itemName: finalItemName,
        itemCode: itemCode || null,
        factor: Number(factor),
        baseValue: finalBaseValue ? Number(finalBaseValue) : null,
        price: finalPrice ? Number(finalPrice) : null,
        description: description || null,
        imageUrl,
        originalImageUrl
      }
    });

    return item;
  } catch (error: any) {
    console.error('Error creating showcase item:', error);
    return reply.code(500).send({ error: 'Error creating item', details: error.message });
  }
});

app.delete('/showcase/:id', async (req: any, reply) => {
  // Verificar autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const id = parseInt(req.params.id);
  
  // Buscar item para deletar a imagem
  const item = await prisma.showcase.findUnique({ where: { id } });
  
  if (item?.imageUrl) {
    try {
      const filepath = path.join(process.cwd(), item.imageUrl.replace(/^\//, ''));
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }
  
  await prisma.showcase.delete({ where: { id } });
  return { success: true };
});

// Atualizar item do mostruário (campos e/ou imagem)
app.patch('/showcase/:id', async (req: any, reply) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return reply.code(401).send({ error: 'Unauthorized' });

  try {
    const token = authHeader.replace('Bearer ', '');
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }

  const id = Number.parseInt(req.params.id);
  const { name, itemName, itemCode, factor, weight, baseValue, price, description, imageBase64, sold } = req.body || {};

  const item = await prisma.showcase.findUnique({ where: { id } });
  if (!item) return reply.code(404).send({ error: 'Not found' });

  const finalItemName = name || itemName || item.itemName;
  const finalBaseValue = (weight ?? baseValue ?? item.baseValue) as number | null;
  const finalFactor = (factor ?? item.factor) as number;
  let computedPrice: number | null = null;
  if (price ?? false) {
    computedPrice = Number(price);
  } else if (finalFactor && finalBaseValue) {
    computedPrice = Number(finalFactor) * Number(finalBaseValue);
  } else {
    computedPrice = (item.price as number | null) ?? null;
  }
  const finalPrice = computedPrice;
  let newImageUrl = item.imageUrl || null;
  let newOriginalUrl = item.originalImageUrl || null;

  // Se veio nova imagem, processa e substitui
  if (imageBase64) {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const ts = Date.now();
      const origFilename = `showcase-orig-${ts}.jpg`;
      const filename = `showcase-${ts}.jpg`;
      const origFilepath = path.join(uploadsDir, origFilename);
      const filepath = path.join(uploadsDir, filename);

      // Salvar novo original
      await sharp(buffer).jpeg({ quality: 92 }).toFile(origFilepath);
      newOriginalUrl = `/uploads/${origFilename}`;

      // Processar imagem com Sharp + Canvas para adicionar faixa de preço
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;
      const bannerHeight = Math.max(80, Math.floor(height * 0.15));
      const fontSize = Math.floor(bannerHeight * 0.5);
      const priceText = finalPrice ? `R$ ${finalPrice.toFixed(2).replace('.', ',')}` : 'Consulte o preço';
      
      // Criar faixa usando canvas
      const canvas = createCanvas(width, bannerHeight);
      const ctx = canvas.getContext('2d');
      
      // Fundo preto semi-transparente
      ctx.fillStyle = 'rgba(26, 26, 26, 0.92)';
      ctx.fillRect(0, 0, width, bannerHeight);
      
      // Texto em dourado com contorno preto
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Contorno preto
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(priceText, width / 2, bannerHeight / 2);
      
      // Preenchimento dourado
      ctx.fillStyle = '#FFD700';
      ctx.fillText(priceText, width / 2, bannerHeight / 2);
      
      // Converter canvas para buffer
      const bannerBuffer = canvas.toBuffer('image/png');
      
      // Compor imagem original com faixa de preço
      await sharp(buffer)
        .resize(width, height, { fit: 'cover' })
        .composite([{
          input: bannerBuffer,
          gravity: 'south'
        }])
        .jpeg({ quality: 90 })
        .toFile(filepath);

      // Remove a imagem anterior se existir
      if (item.imageUrl) {
        try {
          const oldPath = path.join(process.cwd(), item.imageUrl.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) {
          app.log.warn({ err: e }, 'Failed to delete old showcase image');
        }
      }
      if (item.originalImageUrl) {
        try {
          const oldOrig = path.join(process.cwd(), item.originalImageUrl.replace(/^\//, ''));
          if (fs.existsSync(oldOrig)) fs.unlinkSync(oldOrig);
        } catch (e) {
          app.log.warn({ err: e }, 'Failed to delete old original showcase image');
        }
      }

      newImageUrl = `/uploads/${filename}`;
    } catch (error) {
      console.error('Error updating image:', error);
      return reply.code(500).send({ error: 'Error updating image', details: (error as any)?.message });
    }
  }

  const updated = await prisma.showcase.update({
    where: { id },
    data: {
      itemName: finalItemName,
      itemCode: itemCode ?? item.itemCode,
      factor: Number(finalFactor),
      baseValue: finalBaseValue ?? null,
      price: finalPrice ?? null,
      description: description ?? item.description,
      imageUrl: newImageUrl,
      originalImageUrl: newOriginalUrl,
      sold: (sold ?? item.sold) as boolean
    }
  });

  return updated;
});

// Remover apenas a imagem do item
app.delete('/showcase/:id/image', async (req: any, reply) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return reply.code(401).send({ error: 'Unauthorized' });

  const id = Number.parseInt(req.params.id);
  const item = await prisma.showcase.findUnique({ where: { id } });
  if (!item) return reply.code(404).send({ error: 'Not found' });

  if (item.imageUrl) {
    try {
      const filepath = path.join(process.cwd(), item.imageUrl.replace(/^\//, ''));
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }
  if (item.originalImageUrl) {
    try {
      const filepath = path.join(process.cwd(), item.originalImageUrl.replace(/^\//, ''));
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch (error) {
      console.error('Error deleting original image:', error);
    }
  }

  await prisma.showcase.update({ where: { id }, data: { imageUrl: null, originalImageUrl: null } });
  return { success: true };
});

// Enviar item do mostruário via WhatsApp (com imagem e valor final na faixa)
app.get('/health', async () => ({ ok: true }));

app.listen({ port: Number(process.env.PORT) || 3000, host: process.env.HOST || '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
