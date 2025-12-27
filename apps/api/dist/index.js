import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { createProvider } from './whatsapp-providers.js';
import { generateCardText } from './card-generator.js';
const app = Fastify({ logger: true });
app.register(cors, { origin: true });
app.register(multipart);
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev';
// WhatsApp provider (dinâmico via settings)
let provider = createProvider('mock', {});
// Auth
app.post('/auth/register', async (req, reply) => {
    const { email, password } = req.body || {};
    if (!email || !password)
        return reply.code(400).send({ error: 'Missing email/password' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
        return reply.code(409).send({ error: 'Email exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash: hash } });
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return { token };
});
app.post('/auth/login', async (req, reply) => {
    const { email, password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return reply.code(401).send({ error: 'Invalid credentials' });
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid)
        return reply.code(401).send({ error: 'Invalid credentials' });
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return { token };
});
app.post('/auth/change-password', async (req, reply) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
        return reply.code(400).send({ error: 'Missing fields' });
    // Extrair user ID do token
    const auth = req.headers.authorization;
    const token = auth?.slice(7);
    if (!token)
        return reply.code(401).send({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
        if (!user)
            return reply.code(404).send({ error: 'User not found' });
        // Verificar senha atual
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid)
            return reply.code(401).send({ error: 'Incorrect current password' });
        // Atualizar com nova senha
        const hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hash }
        });
        return { success: true, message: 'Password changed successfully' };
    }
    catch (error) {
        return reply.code(401).send({ error: 'Invalid token' });
    }
});
app.post('/auth/admin-password', async (req, reply) => {
    const { adminPassword } = req.body || {};
    if (!adminPassword)
        return reply.code(400).send({ error: 'Missing adminPassword' });
    // Extrair user ID do token
    const auth = req.headers.authorization;
    const token = auth?.slice(7);
    if (!token)
        return reply.code(401).send({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
        if (!user)
            return reply.code(404).send({ error: 'User not found' });
        // Salvar senha de admin (hash)
        const hash = await bcrypt.hash(adminPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { adminPasswordHash: hash }
        });
        return { success: true, message: 'Admin password configured successfully' };
    }
    catch (error) {
        return reply.code(401).send({ error: 'Invalid token' });
    }
});
app.post('/auth/create-user', async (req, reply) => {
    const { email, password } = req.body || {};
    if (!email || !password)
        return reply.code(400).send({ error: 'Missing email/password' });
    // Verificar se usuário já existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
        return reply.code(409).send({ error: 'Email já cadastrado' });
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
app.put('/users/:id', async (req, reply) => {
    const { id } = req.params;
    const { email, password } = req.body || {};
    try {
        const data = {};
        if (email)
            data.email = email;
        if (password)
            data.passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: Number(id) },
            data
        });
        return { success: true };
    }
    catch (error) {
        return reply.code(400).send({ error: error.message || 'Erro ao atualizar' });
    }
});
// Excluir usuário
app.delete('/users/:id', async (req, reply) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({
            where: { id: Number(id) }
        });
        return { success: true };
    }
    catch (error) {
        return reply.code(400).send({ error: error.message || 'Erro ao excluir' });
    }
});
// Simple auth hook (optional)
app.addHook('preHandler', async (req, reply) => {
    const path = req.url || req.routerPath || '';
    if (path.startsWith('/auth'))
        return;
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return reply.code(401).send({ error: 'No token' });
    try {
        const token = auth.slice(7);
        jwt.verify(token, JWT_SECRET);
    }
    catch {
        return reply.code(401).send({ error: 'Invalid token' });
    }
});
// Entities
app.post('/clients', async (req) => {
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
app.put('/clients/:id', async (req) => {
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
app.get('/clients/:id/sales', async (req) => {
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
app.post('/sales', async (req) => {
    const { clientId, itemName, itemCode, factor, itemType, baseValue, totalValue, paymentMethod, installments, roundUpInstallments, customInstallmentValues, saleDate, observations, sellerName, commission, imageBase64, sendCard } = req.body;
    const sale = await prisma.sale.create({
        data: { clientId, itemName, itemCode, factor, itemType, baseValue, totalValue, paymentMethod, installments, saleDate, observations, sellerName, commission }
    });
    // save image if provided
    if (imageBase64) {
        const dir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${sale.id}.jpg`);
        const data = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        fs.writeFileSync(file, Buffer.from(data, 'base64'));
    }
    // create installments
    const inst = [];
    if (customInstallmentValues && Array.isArray(customInstallmentValues) && customInstallmentValues.length === installments) {
        // Usar valores personalizados das parcelas
        for (let i = 0; i < installments; i++) {
            const due = new Date(saleDate || new Date());
            due.setMonth(due.getMonth() + i);
            inst.push({ saleId: sale.id, sequence: i + 1, amount: customInstallmentValues[i], dueDate: due });
        }
    }
    else if (roundUpInstallments && installments > 1) {
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
    }
    else {
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
                const cardData = {
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
        }
        catch (error) {
            app.log.error('Erro ao enviar cartão:', error);
        }
    }
    return sale;
});
app.post('/installments/:id/pay', async (req, reply) => {
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
app.put('/installments/:id', async (req) => {
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
app.post('/expenses', async (req) => {
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
    const config = {};
    settings.forEach(s => { config[s.key] = s.value; });
    const remindersEnabled = config.remindersEnabled === 'true';
    if (!remindersEnabled)
        return;
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
        }
        catch (e) {
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
app.get('/dashboard/recent-sales', async () => {
    return prisma.sale.findMany({
        take: 10,
        orderBy: { saleDate: 'desc' },
        include: { client: true }
    });
});
app.get('/dashboard/pending-installments', async () => {
    const now = new Date();
    return prisma.installment.findMany({
        where: {
            paid: false,
            dueDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
        include: { sale: { include: { client: true } } }
    });
});
app.get('/dashboard/monthly-revenue', async () => {
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
});
// Clientes
app.get('/clients', async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return { error: 'No token' };
    const decoded = jwt.verify(token, JWT_SECRET);
    const clients = await prisma.client.findMany({
        orderBy: { name: 'asc' }
    });
    return clients;
});
app.get('/clients/:id', async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return { error: 'No token' };
    jwt.verify(token, JWT_SECRET);
    const client = await prisma.client.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { sales: { include: { installmentsR: true } } }
    });
    return client;
});
app.post('/clients/import', async (req, reply) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return reply.code(401).send({ error: 'No token' });
    try {
        jwt.verify(token, JWT_SECRET);
    }
    catch {
        return reply.code(401).send({ error: 'Invalid token' });
    }
    const data = await req.file();
    if (!data)
        return reply.code(400).send({ error: 'No file uploaded' });
    const buffer = await data.toBuffer();
    const text = buffer.toString('utf-8');
    const lines = text.trim().split('\n');
    const clients = [];
    // Detectar formato (CSV, JSON, WhatsApp ou vCard .vcf)
    let format = 'csv';
    if (text.includes('BEGIN:VCARD'))
        format = 'vcf';
    else if (text.includes('{'))
        format = 'json';
    else if (text.includes('Contact') && text.includes('Phone'))
        format = 'whatsapp';
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
    }
    else if (format === 'whatsapp') {
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
    }
    else if (format === 'vcf') {
        // vCard (.vcf) - múltiplos cartões
        const entries = text.split(/BEGIN:VCARD/i).slice(1).map((s) => 'BEGIN:VCARD' + s);
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
            const cellMatches = Array.from(entry.matchAll(/(?:^|\n)TEL[^:]*TYPE=(?:CELL|MOBILE)[^:]*:(.+)/gi)).map(m => (m[1] || '').trim());
            const allTelMatches = Array.from(entry.matchAll(/(?:^|\n)TEL[^:]*:(.+)/gi)).map(m => (m[1] || '').trim());
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
    }
    else {
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
app.get('/sales/analytics', async (req) => {
    const { period = 'month', clientIds = '[]' } = req.query;
    // Parse clientIds from query string
    let selectedClients = [];
    try {
        selectedClients = JSON.parse(Array.isArray(clientIds) ? clientIds[0] : clientIds);
    }
    catch {
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
    const where = {
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
    const grouped = {};
    const clientSales = {};
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
    const periodTotals = {};
    Object.keys(grouped).forEach(period => {
        const periodSales = grouped[period];
        periodTotals[period] = {
            count: periodSales.length,
            total: periodSales.reduce((sum, s) => sum + s.totalValue, 0),
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
    const config = {};
    settings.forEach(s => {
        config[s.key] = s.value;
    });
    return config;
});
app.put('/settings', async (req) => {
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
        const config = {};
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
app.post('/sales/:id/send-card', async (req, reply) => {
    const saleId = parseInt(req.params.id);
    const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: { client: true, installmentsR: true }
    });
    if (!sale) {
        return reply.code(404).send({ error: 'Sale not found' });
    }
    const cardData = {
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
    }
    catch (error) {
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
        }
        catch (error) {
            app.log.error(error);
        }
    }
    return { success: true, cardSent: true };
});
// Teste de envio de WhatsApp
app.post('/settings/test-whatsapp', async (req, reply) => {
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
    }
    catch (error) {
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
app.post('/settings/test-email', async (req, reply) => {
    const { email } = req.body;
    if (!email) {
        return reply.code(400).send({ error: 'Email required' });
    }
    try {
        // Buscar configurações de email
        const settings = await prisma.settings.findMany();
        const config = {};
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
    }
    catch (error) {
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
app.get('/health', async () => ({ ok: true }));
app.listen({ port: 3000, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
