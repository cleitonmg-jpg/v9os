import { createRequire } from 'node:module';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { criarBancaTenant } from './tenantInit.js';
import { masterDb, getTenantUrl, DB_TYPE } from './masterDb.js';

const require = createRequire(import.meta.url);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'v9-secret-key-2024';

app.use(cors());
app.use(express.json());

// ── Cache de clientes Prisma por CNPJ (uma conexão por empresa) ────────────────
const tenantCache = new Map<string, PrismaClient>();

function getTenantPrisma(cnpj: string): PrismaClient {
  if (!tenantCache.has(cnpj)) {
    const url = getTenantUrl(cnpj);
    let prisma: PrismaClient;

    if (DB_TYPE === 'sqlite') {
      // SQLite: adapter libsql
      const { PrismaLibSql } = require('@prisma/adapter-libsql');
      const adapter = new PrismaLibSql({ url });
      prisma = new PrismaClient({ adapter } as any);
    } else if (DB_TYPE === 'postgresql' || DB_TYPE === 'postgres') {
      // PostgreSQL: adapter pg (Prisma 7 exige driver adapter)
      const { Pool } = require('pg');
      const { PrismaPg } = require('@prisma/adapter-pg');
      const pool = new Pool({ connectionString: url });
      const adapter = new PrismaPg(pool);
      prisma = new PrismaClient({ adapter } as any);
    } else {
      // MySQL: adapter mysql2 (Prisma 7)
      const { createPool } = require('mysql2/promise');
      const { PrismaMySQL } = require('@prisma/adapter-mysql');
      const pool = createPool(url);
      const adapter = new PrismaMySQL(pool);
      prisma = new PrismaClient({ adapter } as any);
    }

    tenantCache.set(cnpj, prisma);
  }
  return tenantCache.get(cnpj)!;
}

// ── Tipos do Token JWT ─────────────────────────────────────────────────────────
interface TokenPayload {
  id: number;
  username: string;
  role: string;
  name: string;
  cnpj: string | null;  // null = usuário Root
  isRoot: boolean;
}

interface AuthRequest extends Request {
  user?: TokenPayload;
}

// ── Middleware: valida JWT e injeta req.user ───────────────────────────────────
const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ message: 'Token não fornecido' }); return; }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as TokenPayload;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

// ── Middleware: somente Root pode acessar ──────────────────────────────────────
const soRoot = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isRoot) { res.status(403).json({ message: 'Acesso restrito ao administrador Root' }); return; }
  next();
};

// ── Helper: registra auditoria no banco tenant ─────────────────────────────────
async function registrarAuditoria(
  prisma: PrismaClient,
  tecnicoId: number,
  acao: string,
  entidade: string,
  entidadeId: number,
  detalhes?: string,
) {
  try {
    await (prisma as any).logAuditoria.create({
      data: { tecnicoId, acao, entidade, entidadeId, detalhes },
    });
  } catch {
    // Auditoria não deve impedir operações principais
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/auth/login
 * Body: { cnpj?, username, password }
 * - Se cnpj ausente e username === 'Master' → login Root no master.db
 * - Caso contrário → login de usuário no tenant identificado pelo CNPJ
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { cnpj, username, password } = req.body;
    const cnpjLimpo = cnpj ? String(cnpj).replace(/\D/g, '') : null;

    // ── Login Root ────────────────────────────────────────────────────────────
    if (!cnpjLimpo) {
      const rows = await masterDb.execute({
        sql: 'SELECT id, usuario, senha, nome FROM administradores WHERE usuario = ?',
        args: [username],
      });
      const admin = rows.rows[0];
      if (!admin) { res.status(401).json({ message: 'Usuário Root não encontrado' }); return; }

      const valid = await bcrypt.compare(password, String(admin.senha));
      if (!valid) { res.status(401).json({ message: 'Senha incorreta' }); return; }

      const payload: TokenPayload = {
        id: Number(admin.id), username: String(admin.usuario),
        role: 'root', name: String(admin.nome),
        cnpj: null, isRoot: true,
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token, user: payload });
      return;
    }

    // ── Login Empresa (tenant) ────────────────────────────────────────────────
    const empRows = await masterDb.execute({
      sql: 'SELECT id, cnpj, banco_dados, ativo FROM empresas WHERE cnpj = ?',
      args: [cnpjLimpo],
    });
    const empresa = empRows.rows[0];
    if (!empresa) { res.status(401).json({ message: 'Empresa não encontrada ou CNPJ inválido' }); return; }
    if (!empresa.ativo) { res.status(401).json({ message: 'Empresa inativa. Entre em contato com o suporte.' }); return; }

    const prisma = getTenantPrisma(cnpjLimpo);
    const user = await (prisma as any).tecnico.findUnique({ where: { usuario: username } });
    if (!user || !user.ativo) { res.status(401).json({ message: 'Usuário não encontrado ou inativo' }); return; }

    const valid = await bcrypt.compare(password, user.senhaHash);
    if (!valid) { res.status(401).json({ message: 'Senha incorreta' }); return; }

    const payload: TokenPayload = {
      id: user.id, username: user.usuario,
      role: user.cargo, name: user.nome,
      cnpj: cnpjLimpo, isRoot: false,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: payload });
  } catch (e) {
    console.error('[auth/login]', e);
    res.status(500).json({ message: 'Erro interno no login' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRO PÚBLICO DE EMPRESA
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/register
 * Body: { nome, cnpj, endereco?, telefone?, email?, observacao?, usuario, senha }
 * Cria a empresa no master e inicializa o banco tenant.
 */
app.post('/api/register', async (req, res) => {
  try {
    const { nome, cnpj, endereco, telefone, email, observacao, usuario, senha } = req.body;

    if (!nome || !cnpj || !usuario || !senha) {
      res.status(400).json({ message: 'Campos obrigatórios: nome, cnpj, usuario, senha' });
      return;
    }

    const cnpjLimpo = String(cnpj).replace(/\D/g, '');
    if (cnpjLimpo.length < 11) {
      res.status(400).json({ message: 'CNPJ/CPF inválido' });
      return;
    }

    const existe = await masterDb.execute({
      sql: 'SELECT id FROM empresas WHERE cnpj = ?',
      args: [cnpjLimpo],
    });
    if (existe.rows.length > 0) {
      res.status(400).json({ message: 'CNPJ já cadastrado no sistema' });
      return;
    }

    const bancoDados = await criarBancaTenant(cnpjLimpo, usuario, senha, `Admin ${nome}`);
    const senhaHash = await bcrypt.hash(senha, 10);

    await masterDb.execute({
      sql: `INSERT INTO empresas
              (nome, cnpj, endereco, telefone, email, observacao, banco_dados, usuario_admin, senha_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [nome, cnpjLimpo, endereco || null, telefone || null, email || null,
             observacao || null, bancoDados, usuario, senhaHash],
    });

    res.status(201).json({ message: 'Empresa cadastrada com sucesso!', cnpj: cnpjLimpo });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ message: 'Erro ao cadastrar empresa' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ROOT — Gerenciamento de Empresas
// ══════════════════════════════════════════════════════════════════════════════

// Lista todas as empresas
app.get('/api/admin/empresas', auth, soRoot, async (_req, res) => {
  try {
    const rows = await masterDb.execute(
      'SELECT id, nome, cnpj, endereco, telefone, email, data_cadastro, observacao, ativo, banco_dados, usuario_admin FROM empresas ORDER BY nome ASC'
    );
    res.json(rows.rows);
  } catch {
    res.status(500).json({ message: 'Erro ao buscar empresas' });
  }
});

// Cadastra nova empresa (pelo Root)
app.post('/api/admin/empresas', auth, soRoot, async (req, res) => {
  try {
    const { nome, cnpj, endereco, telefone, email, observacao, usuario, senha } = req.body;
    if (!nome || !cnpj || !usuario || !senha) {
      res.status(400).json({ message: 'Campos obrigatórios: nome, cnpj, usuario, senha' });
      return;
    }

    const cnpjLimpo = String(cnpj).replace(/\D/g, '');
    const existe = await masterDb.execute({ sql: 'SELECT id FROM empresas WHERE cnpj = ?', args: [cnpjLimpo] });
    if (existe.rows.length > 0) { res.status(400).json({ message: 'CNPJ já cadastrado' }); return; }

    const bancoDados = await criarBancaTenant(cnpjLimpo, usuario, senha, `Admin ${nome}`);
    const senhaHash = await bcrypt.hash(senha, 10);

    await masterDb.execute({
      sql: `INSERT INTO empresas
              (nome, cnpj, endereco, telefone, email, observacao, banco_dados, usuario_admin, senha_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [nome, cnpjLimpo, endereco || null, telefone || null, email || null,
             observacao || null, bancoDados, usuario, senhaHash],
    });

    res.status(201).json({ message: 'Empresa cadastrada com sucesso!' });
  } catch (e) {
    console.error('[admin/empresas POST]', e);
    res.status(500).json({ message: 'Erro ao cadastrar empresa' });
  }
});

// Atualiza dados de uma empresa (e opcionalmente redefine senha do admin)
app.put('/api/admin/empresas/:id', auth, soRoot, async (req, res) => {
  try {
    const { nome, endereco, telefone, email, observacao, senha } = req.body;
    const id = Number(req.params.id);

    await masterDb.execute({
      sql: 'UPDATE empresas SET nome=?, endereco=?, telefone=?, email=?, observacao=? WHERE id=?',
      args: [nome, endereco || null, telefone || null, email || null, observacao || null, id],
    });

    // Se nova senha informada, atualiza no master e no banco do tenant
    if (senha && senha.trim()) {
      const senhaHash = await bcrypt.hash(senha.trim(), 10);
      await masterDb.execute({
        sql: 'UPDATE empresas SET senha_admin=? WHERE id=?',
        args: [senhaHash, id],
      });
      // Atualiza também no banco tenant do técnico admin
      const rows = await masterDb.execute({
        sql: 'SELECT cnpj, usuario_admin FROM empresas WHERE id=?',
        args: [id],
      });
      const emp = rows.rows[0];
      if (emp) {
        try {
          const prisma = getTenantPrisma(String(emp.cnpj));
          await (prisma as any).tecnico.updateMany({
            where: { usuario: String(emp.usuario_admin), cargo: 'admin' },
            data: { senhaHash },
          });
        } catch (e) {
          console.warn('[admin/empresas PUT] Não foi possível atualizar senha no tenant:', e);
        }
      }
    }

    res.json({ message: 'Empresa atualizada' });
  } catch (e) {
    console.error('[admin/empresas PUT]', e);
    res.status(500).json({ message: 'Erro ao atualizar empresa' });
  }
});

// Atualiza credenciais do próprio usuário Root
app.put('/api/admin/perfil', auth, soRoot, async (req: AuthRequest, res) => {
  try {
    const { nome, senhaAtual, novaSenha } = req.body;
    const id = req.user!.id;

    if (novaSenha) {
      const rows = await masterDb.execute({
        sql: 'SELECT senha FROM administradores WHERE id=?',
        args: [id],
      });
      const admin = rows.rows[0];
      if (!admin) { res.status(404).json({ message: 'Usuário não encontrado' }); return; }
      const valid = await bcrypt.compare(senhaAtual || '', String(admin.senha));
      if (!valid) { res.status(400).json({ message: 'Senha atual incorreta' }); return; }
      const hash = await bcrypt.hash(novaSenha, 10);
      await masterDb.execute({
        sql: 'UPDATE administradores SET nome=?, senha=? WHERE id=?',
        args: [nome, hash, id],
      });
    } else {
      await masterDb.execute({
        sql: 'UPDATE administradores SET nome=? WHERE id=?',
        args: [nome, id],
      });
    }

    res.json({ message: 'Perfil atualizado com sucesso' });
  } catch (e) {
    console.error('[admin/perfil]', e);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

// Ativa ou desativa uma empresa
app.patch('/api/admin/empresas/:id/ativo', auth, soRoot, async (req, res) => {
  try {
    const { ativo } = req.body;
    await masterDb.execute({
      sql: 'UPDATE empresas SET ativo=? WHERE id=?',
      args: [ativo ? 1 : 0, Number(req.params.id)],
    });
    res.json({ message: `Empresa ${ativo ? 'ativada' : 'desativada'}` });
  } catch {
    res.status(500).json({ message: 'Erro ao alterar status' });
  }
});

// Exclui uma empresa
app.delete('/api/admin/empresas/:id', auth, soRoot, async (req, res) => {
  try {
    await masterDb.execute({ sql: 'DELETE FROM empresas WHERE id=?', args: [Number(req.params.id)] });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Erro ao excluir empresa' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROTAS TENANT — usam getTenantPrisma(req.user.cnpj)
// ══════════════════════════════════════════════════════════════════════════════

// Middleware que garante que a requisição vem de um usuário de empresa (não Root)
const tenantAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  auth(req, res, () => {
    if (req.user?.isRoot) { res.status(403).json({ message: 'Root não acessa dados de empresa diretamente' }); return; }
    if (!req.user?.cnpj) { res.status(401).json({ message: 'CNPJ não identificado no token' }); return; }
    next();
  });
};

// ── Clients ────────────────────────────────────────────────────────────────────
app.get('/api/clients', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    res.json(await (prisma as any).cliente.findMany({ include: { veiculos: true }, orderBy: { nome: 'asc' } }));
  } catch { res.status(500).json({ message: 'Erro ao buscar clientes' }); }
});

app.post('/api/clients', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const data = { ...req.body, cpfCnpj: req.body.cpfCnpj?.trim() || null };
    const cliente = await (prisma as any).cliente.create({ data });
    await registrarAuditoria(prisma, req.user!.id, 'CREATE', 'Cliente', cliente.id, `Cliente: ${cliente.nome}`);
    res.json(cliente);
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(400).json({ message: 'CPF/CNPJ já cadastrado' }); return; }
    res.status(500).json({ message: 'Erro ao criar cliente' });
  }
});

app.put('/api/clients/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const { veiculos, ordensServico, criadoEm, atualizadoEm, id, ...rest } = req.body;
    const data = { ...rest, cpfCnpj: rest.cpfCnpj?.trim() || null };
    const cliente = await (prisma as any).cliente.update({ where: { id: Number(req.params.id) }, data });
    await registrarAuditoria(prisma, req.user!.id, 'UPDATE', 'Cliente', cliente.id, `Cliente: ${cliente.nome}`);
    res.json(cliente);
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(400).json({ message: 'CPF/CNPJ já cadastrado' }); return; }
    res.status(500).json({ message: 'Erro ao atualizar cliente' });
  }
});

app.delete('/api/clients/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    await (prisma as any).cliente.delete({ where: { id: Number(req.params.id) } });
    await registrarAuditoria(prisma, req.user!.id, 'DELETE', 'Cliente', Number(req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ message: 'Erro ao excluir cliente' }); }
});

// ── Vehicles ───────────────────────────────────────────────────────────────────
app.get('/api/vehicles', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    res.json(await (prisma as any).veiculo.findMany({ include: { cliente: true }, orderBy: { placa: 'asc' } }));
  } catch { res.status(500).json({ message: 'Erro ao buscar veículos' }); }
});

app.post('/api/vehicles', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const veiculo = await (prisma as any).veiculo.create({ data: req.body });
    await registrarAuditoria(prisma, req.user!.id, 'CREATE', 'Veiculo', veiculo.id, `Placa: ${veiculo.placa}`);
    res.json(veiculo);
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(400).json({ message: 'Placa já cadastrada' }); return; }
    res.status(500).json({ message: 'Erro ao criar veículo' });
  }
});

app.put('/api/vehicles/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const { cliente, ordensServico, criadoEm, atualizadoEm, id, ...data } = req.body;
    const veiculo = await (prisma as any).veiculo.update({ where: { id: Number(req.params.id) }, data });
    await registrarAuditoria(prisma, req.user!.id, 'UPDATE', 'Veiculo', veiculo.id, `Placa: ${veiculo.placa}`);
    res.json(veiculo);
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(400).json({ message: 'Placa já cadastrada' }); return; }
    res.status(500).json({ message: 'Erro ao atualizar veículo' });
  }
});

app.delete('/api/vehicles/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    await (prisma as any).veiculo.delete({ where: { id: Number(req.params.id) } });
    await registrarAuditoria(prisma, req.user!.id, 'DELETE', 'Veiculo', Number(req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ message: 'Erro ao excluir veículo' }); }
});

// ── OS / Orçamentos ─────────────────────────────────────────────────────────────
const osInclude = { cliente: true, veiculo: true, itens: { include: { tecnico: true } } };

const toItemData = (item: any) => ({
  descricao: item.descricao,
  quantidade: Number(item.quantidade),
  precoUnitario: Number(item.precoUnitario),
  precoTotal: Number(item.quantidade) * Number(item.precoUnitario),
  tipo: item.tipo || 'SERVICE',
  tecnicoId: item.tecnicoId ? Number(item.tecnicoId) : null,
});

app.get('/api/os', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    res.json(await (prisma as any).ordemServico.findMany({ include: osInclude, orderBy: { data: 'desc' } }));
  } catch { res.status(500).json({ message: 'Erro ao buscar OS' }); }
});

app.post('/api/os', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const { itens, ...osData } = req.body;
    const last = await (prisma as any).ordemServico.findFirst({ orderBy: { numero: 'desc' } });
    const itemsData = (itens || []).map(toItemData);
    const os = await (prisma as any).ordemServico.create({
      data: {
        ...osData,
        numero: (last?.numero || 0) + 1,
        valorTotal: itemsData.reduce((s: number, i: any) => s + i.precoTotal, 0),
        clienteId: Number(osData.clienteId),
        veiculoId: Number(osData.veiculoId),
        itens: itemsData.length ? { create: itemsData } : undefined,
      },
      include: osInclude,
    });
    await registrarAuditoria(prisma, req.user!.id, 'CREATE', 'OrdemServico', os.id, `OS #${os.numero}`);
    res.json(os);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Erro ao criar OS' }); }
});

app.get('/api/os/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const os = await (prisma as any).ordemServico.findUnique({ where: { id: Number(req.params.id) }, include: osInclude });
    if (!os) { res.status(404).json({ message: 'OS não encontrada' }); return; }
    res.json(os);
  } catch { res.status(500).json({ message: 'Erro ao buscar OS' }); }
});

app.put('/api/os/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const { itens, cliente, veiculo, criadoEm, atualizadoEm, id, numero, ...osData } = req.body;
    const itemsData = (itens || []).map(toItemData);
    await (prisma as any).itemOrdem.deleteMany({ where: { ordemServicoId: Number(req.params.id) } });
    const os = await (prisma as any).ordemServico.update({
      where: { id: Number(req.params.id) },
      data: {
        ...osData,
        valorTotal: itemsData.reduce((s: number, i: any) => s + i.precoTotal, 0),
        clienteId: Number(osData.clienteId),
        veiculoId: Number(osData.veiculoId),
        itens: itemsData.length ? { create: itemsData } : undefined,
      },
      include: osInclude,
    });
    await registrarAuditoria(prisma, req.user!.id, 'UPDATE', 'OrdemServico', os.id, `OS #${os.numero}`);
    res.json(os);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Erro ao atualizar OS' }); }
});

app.delete('/api/os/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    await (prisma as any).ordemServico.delete({ where: { id: Number(req.params.id) } });
    await registrarAuditoria(prisma, req.user!.id, 'DELETE', 'OrdemServico', Number(req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ message: 'Erro ao excluir OS' }); }
});

// ── Stats ──────────────────────────────────────────────────────────────────────
app.get('/api/stats', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [openBudgets, completedOs, pendingAuth, activeVehicles, recentOs] = await Promise.all([
      (prisma as any).ordemServico.count({ where: { tipo: 'BUDGET', status: 'OPEN' } }),
      (prisma as any).ordemServico.count({ where: { tipo: 'OS', status: 'COMPLETED', data: { gte: startOfMonth } } }),
      (prisma as any).ordemServico.count({ where: { status: 'WAITING' } }),
      (prisma as any).ordemServico.count({ where: { tipo: 'OS', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      (prisma as any).ordemServico.findMany({ take: 6, orderBy: { criadoEm: 'desc' }, include: { cliente: true, veiculo: true } }),
    ]);
    res.json({ openBudgets, completedOs, pendingAuth, activeVehicles, recentOs });
  } catch { res.status(500).json({ message: 'Erro ao buscar estatísticas' }); }
});

// ── Technicians ────────────────────────────────────────────────────────────────
app.get('/api/technicians', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const list = await (prisma as any).tecnico.findMany({ orderBy: { nome: 'asc' } });
    res.json(list.map((t: any) => ({ ...t, senhaHash: undefined })));
  } catch { res.status(500).json({ message: 'Erro ao buscar técnicos' }); }
});

app.post('/api/technicians', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const { password, ...data } = req.body;
    if (!password) { res.status(400).json({ message: 'Senha obrigatória' }); return; }
    const tech = await (prisma as any).tecnico.create({
      data: { ...data, senhaHash: await bcrypt.hash(password, 10) },
    });
    await registrarAuditoria(prisma, req.user!.id, 'CREATE', 'Tecnico', tech.id, `Usuário: ${tech.usuario}`);
    res.json({ ...tech, senhaHash: undefined });
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(400).json({ message: 'Usuário já cadastrado' }); return; }
    res.status(500).json({ message: 'Erro ao criar técnico' });
  }
});

app.put('/api/technicians/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const { password, senhaHash: _ph, itensOrdem, logsAuditoria, criadoEm, atualizadoEm, id, ...data } = req.body;
    const updateData: any = { ...data };
    if (password) updateData.senhaHash = await bcrypt.hash(password, 10);
    const tech = await (prisma as any).tecnico.update({ where: { id: Number(req.params.id) }, data: updateData });
    await registrarAuditoria(prisma, req.user!.id, 'UPDATE', 'Tecnico', tech.id, `Usuário: ${tech.usuario}`);
    res.json({ ...tech, senhaHash: undefined });
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(400).json({ message: 'Usuário já cadastrado' }); return; }
    res.status(500).json({ message: 'Erro ao atualizar técnico' });
  }
});

app.delete('/api/technicians/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const tech = await (prisma as any).tecnico.update({
      where: { id: Number(req.params.id) },
      data: { ativo: false },
    });
    await registrarAuditoria(prisma, req.user!.id, 'DELETE', 'Tecnico', tech.id, `Desativado: ${tech.usuario}`);
    res.json({ success: true });
  } catch { res.status(500).json({ message: 'Erro ao desativar técnico' }); }
});

// ── Catálogo (ItemCatalogo) ────────────────────────────────────────────────────
app.get('/api/catalog', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    res.json(await (prisma as any).itemCatalogo.findMany({ orderBy: { descricao: 'asc' } }));
  } catch { res.status(500).json({ message: 'Erro ao buscar catálogo' }); }
});

app.post('/api/catalog', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const item = await (prisma as any).itemCatalogo.create({ data: req.body });
    await registrarAuditoria(prisma, req.user!.id, 'CREATE', 'ItemCatalogo', item.id, `Item: ${item.descricao}`);
    res.json(item);
  } catch { res.status(500).json({ message: 'Erro ao criar item' }); }
});

app.put('/api/catalog/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    const { id, criadoEm, atualizadoEm, ...data } = req.body;
    const item = await (prisma as any).itemCatalogo.update({ where: { id: Number(req.params.id) }, data });
    await registrarAuditoria(prisma, req.user!.id, 'UPDATE', 'ItemCatalogo', item.id, `Item: ${item.descricao}`);
    res.json(item);
  } catch { res.status(500).json({ message: 'Erro ao atualizar item' }); }
});

app.delete('/api/catalog/:id', tenantAuth, async (req: AuthRequest, res) => {
  try {
    const prisma = getTenantPrisma(req.user!.cnpj!);
    await (prisma as any).itemCatalogo.delete({ where: { id: Number(req.params.id) } });
    await registrarAuditoria(prisma, req.user!.id, 'DELETE', 'ItemCatalogo', Number(req.params.id));
    res.json({ success: true });
  } catch { res.status(500).json({ message: 'Erro ao excluir item' }); }
});

// ── Serve frontend estático (build de produção) ────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const distPath   = path.join(__dirname, '../dist');

app.use(express.static(distPath));
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor V9 MultiEmpresa rodando na porta ${PORT}`);
  console.log(`   DB: ${DB_TYPE.toUpperCase()} | Root: Master / Belvedere640@`);
});
