// SAMS Locações CRM/ERP — Rotas Express
// Autenticação própria via cookie crm_session (separada do OAuth do site)
import { Router, Request, Response, NextFunction } from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";

// Helper para parsear cookies do header
function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const parsed = parseCookieHeader(header);
  return parsed[name];
}

// ─── DB helper ────────────────────────────────────────────────────────────────
let _pool: mysql.Pool | null = null;
function getPool() {
  if (!_pool) {
    _pool = mysql.createPool(ENV.databaseUrl);
  }
  return _pool;
}
async function db<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}
async function dbOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await db<T>(sql, params);
  return rows[0] ?? null;
}

/// ─── Session store (MySQL — persiste entre reinicializações do servidor) ────────────
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 horas

async function createSession(userId: number, role: string, name: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL;
  await db(
    "INSERT INTO crm_sessions (token, user_id, role, name, expires_at) VALUES (?, ?, ?, ?, ?)",
    [token, userId, role, name, expiresAt]
  );
  return token;
}

async function getSession(token: string): Promise<{ userId: number; role: string; name: string; expiresAt: number } | null> {
  const now = Date.now();
  const row = await dbOne<{ user_id: number; role: string; name: string; expires_at: number }>(
    "SELECT user_id, role, name, expires_at FROM crm_sessions WHERE token = ? AND expires_at > ?",
    [token, now]
  );
  if (!row) return null;
  return { userId: row.user_id, role: row.role, name: row.name, expiresAt: Number(row.expires_at) };
}

async function deleteSession(token: string): Promise<void> {
  await db("DELETE FROM crm_sessions WHERE token = ?", [token]).catch(() => {});
}

// Exportado para uso em outros módulos (ex: crm-acervo.ts)
export async function getSessionFromCrm(token: string) {
  return getSession(token);
}

// ─── Middleware de autenticação CRM ────────────────────────────────────────────
function requireCrmAuth(req: Request, res: Response, next: NextFunction) {
  const token = getCookie(req, "crm_session");
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSession(token).then(session => {
    if (!session) return res.status(401).json({ error: "Sessão expirada" });
    (req as any).crmUser = session;
    next();
  }).catch(() => res.status(500).json({ error: "Erro interno" }));
}

const CRM_ADMIN_ROLES = ["admin", "manager", "administrador", "gerente", "gerencia"];

function requireCrmAdmin(req: Request, res: Response, next: NextFunction) {
  requireCrmAuth(req, res, () => {
    const user = (req as any).crmUser;
    if (!CRM_ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Acesso restrito" });
    }
    next();
  });
}

// ─── Auditoria ────────────────────────────────────────────────────────────────
async function audit(userId: number | null, action: string, table: string, recordId: number | null, details?: any, ip?: string) {
  try {
    await db(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
      [userId, action, table, recordId, details ? JSON.stringify(details) : null, ip ?? null]
    );
  } catch { /* não bloquear por falha de auditoria */ }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export function registerCrmRoutes(app: any) {
  const r = Router();

  // ── Auth ────────────────────────────────────────────────────────────────────
  r.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });

    const user = await dbOne<any>(
      "SELECT id, name, email, password, role, active FROM crm_users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    if (!user || !user.active) return res.status(401).json({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    await db("UPDATE crm_users SET last_login = NOW() WHERE id = ?", [user.id]);
    await audit(user.id, "login", "crm_users", user.id, null, req.ip);

    const token = await createSession(user.id, user.role, user.name);
    res.cookie("crm_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
      maxAge: SESSION_TTL,
      path: "/",
    });
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  r.post("/logout", async (req, res) => {
    const token = getCookie(req, "crm_session");
    if (token) await deleteSession(token);
    res.clearCookie("crm_session", { path: "/" });
    res.json({ ok: true });
  });

  r.get("/me", requireCrmAuth, (req, res) => {
    res.json({ user: (req as any).crmUser });
  });

  // ── Dashboard KPIs ──────────────────────────────────────────────────────────
  r.get("/dashboard/kpis", requireCrmAuth, async (_req, res) => {
    const [leads, clientes, briefings, receita, oportunidades] = await Promise.all([
      dbOne<any>("SELECT COUNT(*) as total FROM crm_leads WHERE status != 'perdido'"),
      dbOne<any>("SELECT COUNT(*) as total FROM crm_clientes WHERE status = 'Ativo'"),
      dbOne<any>("SELECT COUNT(*) as total FROM crm_briefings WHERE status != 'Cancelado'"),
      dbOne<any>("SELECT COALESCE(SUM(valor_pago),0) as total FROM crm_contas_receber WHERE status='pago' AND MONTH(data_pagamento)=MONTH(NOW()) AND YEAR(data_pagamento)=YEAR(NOW())"),
      dbOne<any>("SELECT COUNT(*) as total FROM crm_oportunidades WHERE etapa NOT IN ('concluido','perdido')"),
    ]);
    res.json({
      leads: leads?.total ?? 0,
      clientes: clientes?.total ?? 0,
      briefings: briefings?.total ?? 0,
      receitaMes: receita?.total ?? 0,
      oportunidades: oportunidades?.total ?? 0,
    });
  });

  // ── Leads ───────────────────────────────────────────────────────────────────
  r.get("/leads", requireCrmAuth, async (req, res) => {
    const { status, temperatura, responsavel_id, limit = 50, offset = 0 } = req.query as any;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (status) { where += " AND l.status = ?"; params.push(status); }
    if (temperatura) { where += " AND l.temperatura = ?"; params.push(temperatura); }
    if (responsavel_id) { where += " AND l.responsavel_id = ?"; params.push(responsavel_id); }
    const rows = await db(
      `SELECT l.*, u.name as responsavel_nome FROM crm_leads l LEFT JOIN crm_users u ON l.responsavel_id = u.id ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [count] = await db(`SELECT COUNT(*) as total FROM crm_leads l ${where}`, params);
    res.json({ data: rows, total: (count as any).total });
  });

  r.get("/leads/:id", requireCrmAuth, async (req, res) => {
    const lead = await dbOne("SELECT l.*, u.name as responsavel_nome FROM crm_leads l LEFT JOIN crm_users u ON l.responsavel_id = u.id WHERE l.id = ?", [req.params.id]);
    if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
    const interactions = await db("SELECT i.*, u.name as user_nome FROM crm_lead_interactions i LEFT JOIN crm_users u ON i.user_id = u.id WHERE i.lead_id = ? ORDER BY i.data_interacao DESC", [req.params.id]);
    res.json({ ...lead, interactions });
  });

  r.post("/leads", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { nome, email, telefone, whatsapp, status = "novo", origem, segmento, evento_interesse, metragem_estimada, responsavel_id, temperatura = "frio", proximo_contato, observacoes, utm_source, utm_medium, utm_campaign } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
    const [result] = await getPool().execute(
      "INSERT INTO crm_leads (nome, email, telefone, whatsapp, status, origem, segmento, evento_interesse, metragem_estimada, responsavel_id, temperatura, proximo_contato, observacoes, utm_source, utm_medium, utm_campaign) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [nome, email, telefone, whatsapp, status, origem, segmento, evento_interesse, metragem_estimada, responsavel_id, temperatura, proximo_contato, observacoes, utm_source, utm_medium, utm_campaign]
    );
    const id = (result as any).insertId;
    await audit(u.userId, "create", "crm_leads", id, { nome }, req.ip);
    res.json({ id, ok: true });
  });

  r.put("/leads/:id", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { nome, email, telefone, whatsapp, status, origem, segmento, evento_interesse, metragem_estimada, responsavel_id, temperatura, proximo_contato, observacoes, score } = req.body;
    await db(
      "UPDATE crm_leads SET nome=?, email=?, telefone=?, whatsapp=?, status=?, origem=?, segmento=?, evento_interesse=?, metragem_estimada=?, responsavel_id=?, temperatura=?, proximo_contato=?, observacoes=?, score=?, last_activity_at=NOW() WHERE id=?",
      [nome, email, telefone, whatsapp, status, origem, segmento, evento_interesse, metragem_estimada, responsavel_id, temperatura, proximo_contato, observacoes, score ?? 0, req.params.id]
    );
    await audit(u.userId, "update", "crm_leads", parseInt(req.params.id), req.body, req.ip);
    res.json({ ok: true });
  });

  r.delete("/leads/:id", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    await db("DELETE FROM crm_leads WHERE id = ?", [req.params.id]);
    await audit(u.userId, "delete", "crm_leads", parseInt(req.params.id), null, req.ip);
    res.json({ ok: true });
  });

  r.post("/leads/:id/interactions", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { tipo = "nota", descricao } = req.body;
    if (!descricao) return res.status(400).json({ error: "Descrição obrigatória" });
    const [result] = await getPool().execute(
      "INSERT INTO crm_lead_interactions (lead_id, user_id, tipo, descricao) VALUES (?,?,?,?)",
      [req.params.id, u.userId, tipo, descricao]
    );
    await db("UPDATE crm_leads SET last_activity_at=NOW() WHERE id=?", [req.params.id]);
    res.json({ id: (result as any).insertId, ok: true });
  });

  // ── Clientes ────────────────────────────────────────────────────────────────
  r.get("/clientes", requireCrmAuth, async (req, res) => {
    const { status, limit = 50, offset = 0, q } = req.query as any;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (status) { where += " AND status = ?"; params.push(status); }
    if (q) { where += " AND (nome LIKE ? OR email LIKE ? OR documento LIKE ?)"; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const rows = await db(`SELECT * FROM crm_clientes ${where} ORDER BY nome ASC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);
    const [count] = await db(`SELECT COUNT(*) as total FROM crm_clientes ${where}`, params);
    res.json({ data: rows, total: (count as any).total });
  });

  r.get("/clientes/:id", requireCrmAuth, async (req, res) => {
    const cliente = await dbOne("SELECT * FROM crm_clientes WHERE id = ?", [req.params.id]);
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json(cliente);
  });

  r.post("/clientes", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { nome, email, telefone, documento, cep, endereco, bairro, cidade, estado, segmento, observacoes } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
    const [result] = await getPool().execute(
      "INSERT INTO crm_clientes (nome, email, telefone, documento, cep, endereco, bairro, cidade, estado, segmento, observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [nome, email, telefone, documento, cep, endereco, bairro, cidade, estado, segmento, observacoes]
    );
    const id = (result as any).insertId;
    await audit(u.userId, "create", "crm_clientes", id, { nome }, req.ip);
    res.json({ id, ok: true });
  });

  r.put("/clientes/:id", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { nome, email, telefone, documento, cep, endereco, bairro, cidade, estado, segmento, status, observacoes } = req.body;
    await db(
      "UPDATE crm_clientes SET nome=?, email=?, telefone=?, documento=?, cep=?, endereco=?, bairro=?, cidade=?, estado=?, segmento=?, status=?, observacoes=? WHERE id=?",
      [nome, email, telefone, documento, cep, endereco, bairro, cidade, estado, segmento, status ?? "Ativo", observacoes, req.params.id]
    );
    await audit(u.userId, "update", "crm_clientes", parseInt(req.params.id), req.body, req.ip);
    res.json({ ok: true });
  });

  // ── Briefings ───────────────────────────────────────────────────────────────
  r.get("/briefings", requireCrmAuth, async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.query as any;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (status) { where += " AND status = ?"; params.push(status); }
    const rows = await db(`SELECT * FROM crm_briefings ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);
    const [count] = await db(`SELECT COUNT(*) as total FROM crm_briefings ${where}`, params);
    res.json({ data: rows, total: (count as any).total });
  });

  r.get("/briefings/:id", requireCrmAuth, async (req, res) => {
    const briefing = await dbOne("SELECT * FROM crm_briefings WHERE id = ?", [req.params.id]);
    if (!briefing) return res.status(404).json({ error: "Briefing não encontrado" });
    const checklist = await db("SELECT * FROM crm_briefing_checklist WHERE briefing_id = ? ORDER BY fase, ordem", [req.params.id]);
    res.json({ ...briefing, checklist });
  });

  r.post("/briefings", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { empresa, responsavel, email, telefone, nome_evento, tipo_evento, data_inicio, data_termino, local_evento, tipo_stand, localizacao_stand, metragem, segmento_principal, orcamento_estimado, payload_json } = req.body;
    if (!empresa || !responsavel || !email || !telefone || !nome_evento || !tipo_evento || !local_evento || !tipo_stand || !localizacao_stand || !metragem || !segmento_principal) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }
    const [result] = await getPool().execute(
      "INSERT INTO crm_briefings (empresa, responsavel, email, telefone, nome_evento, tipo_evento, data_inicio, data_termino, local_evento, tipo_stand, localizacao_stand, metragem, segmento_principal, orcamento_estimado, payload_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [empresa, responsavel, email, telefone, nome_evento, tipo_evento, data_inicio, data_termino, local_evento, tipo_stand, localizacao_stand, metragem, segmento_principal, orcamento_estimado, payload_json ? JSON.stringify(payload_json) : null]
    );
    const id = (result as any).insertId;
    await audit(u.userId, "create", "crm_briefings", id, { empresa, nome_evento }, req.ip);
    res.json({ id, ok: true });
  });

  r.put("/briefings/:id", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { empresa, responsavel, email, telefone, nome_evento, tipo_evento, data_inicio, data_termino, local_evento, tipo_stand, localizacao_stand, metragem, segmento_principal, orcamento_estimado, status, payload_json } = req.body;
    await db(
      "UPDATE crm_briefings SET empresa=?, responsavel=?, email=?, telefone=?, nome_evento=?, tipo_evento=?, data_inicio=?, data_termino=?, local_evento=?, tipo_stand=?, localizacao_stand=?, metragem=?, segmento_principal=?, orcamento_estimado=?, status=?, payload_json=? WHERE id=?",
      [empresa, responsavel, email, telefone, nome_evento, tipo_evento, data_inicio, data_termino, local_evento, tipo_stand, localizacao_stand, metragem, segmento_principal, orcamento_estimado, status ?? "Em Análise", payload_json ? JSON.stringify(payload_json) : null, req.params.id]
    );
    await audit(u.userId, "update", "crm_briefings", parseInt(req.params.id), req.body, req.ip);
    res.json({ ok: true });
  });

  // ── Oportunidades (Kanban) ──────────────────────────────────────────────────
  r.get("/oportunidades", requireCrmAuth, async (req, res) => {
    const { etapa, responsavel_id } = req.query as any;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (etapa) { where += " AND o.etapa = ?"; params.push(etapa); }
    if (responsavel_id) { where += " AND o.responsavel_id = ?"; params.push(responsavel_id); }
    const rows = await db(
      `SELECT o.*, l.nome as lead_nome, l.telefone as lead_telefone, u.name as responsavel_nome, e.nome as evento_nome
       FROM crm_oportunidades o
       LEFT JOIN crm_leads l ON o.lead_id = l.id
       LEFT JOIN crm_users u ON o.responsavel_id = u.id
       LEFT JOIN crm_eventos e ON o.evento_id = e.id
       ${where} ORDER BY o.updated_at DESC`,
      params
    );
    res.json(rows);
  });

  r.post("/oportunidades", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { lead_id, etapa = "novo_lead", valor_estimado, responsavel_id, evento_id, data_evento, observacoes } = req.body;
    if (!lead_id) return res.status(400).json({ error: "lead_id obrigatório" });
    const [result] = await getPool().execute(
      "INSERT INTO crm_oportunidades (lead_id, etapa, valor_estimado, responsavel_id, evento_id, data_evento, observacoes) VALUES (?,?,?,?,?,?,?)",
      [lead_id, etapa, valor_estimado, responsavel_id ?? u.userId, evento_id, data_evento, observacoes]
    );
    const id = (result as any).insertId;
    await audit(u.userId, "create", "crm_oportunidades", id, { lead_id, etapa }, req.ip);
    res.json({ id, ok: true });
  });

  r.patch("/oportunidades/:id/etapa", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { etapa, motivo_perda } = req.body;
    await db("UPDATE crm_oportunidades SET etapa=?, motivo_perda=? WHERE id=?", [etapa, motivo_perda ?? null, req.params.id]);
    await audit(u.userId, "update_etapa", "crm_oportunidades", parseInt(req.params.id), { etapa }, req.ip);
    res.json({ ok: true });
  });

  // ── Eventos ─────────────────────────────────────────────────────────────────
  r.get("/eventos", requireCrmAuth, async (_req, res) => {
    const rows = await db("SELECT * FROM crm_eventos ORDER BY data_inicio DESC");
    res.json(rows);
  });

  r.post("/eventos", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { nome, organizadora, local, endereco, data_inicio, data_fim, status = "Planejado", taxas_json, observacoes } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
    const [result] = await getPool().execute(
      "INSERT INTO crm_eventos (nome, organizadora, local, endereco, data_inicio, data_fim, status, taxas_json, observacoes) VALUES (?,?,?,?,?,?,?,?,?)",
      [nome, organizadora, local, endereco, data_inicio, data_fim, status, taxas_json ? JSON.stringify(taxas_json) : null, observacoes]
    );
    await audit(u.userId, "create", "crm_eventos", (result as any).insertId, { nome }, req.ip);
    res.json({ id: (result as any).insertId, ok: true });
  });

  // ── Contratos ───────────────────────────────────────────────────────────────
  r.get("/contratos", requireCrmAuth, async (req, res) => {
    const { status } = req.query as any;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (status) { where += " AND c.status = ?"; params.push(status); }
    const rows = await db(
      `SELECT c.*, cl.nome as cliente_nome FROM crm_contratos c LEFT JOIN crm_clientes cl ON c.cliente_id = cl.id ${where} ORDER BY c.created_at DESC`,
      params
    );
    res.json(rows);
  });

  r.post("/contratos", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { cliente_id, titulo, valor_contratado, status = "rascunho", data_assinatura, data_inicio, data_fim, condicoes_pagamento, observacoes } = req.body;
    if (!titulo) return res.status(400).json({ error: "Título obrigatório" });
    const numero = `SAMS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const [result] = await getPool().execute(
      "INSERT INTO crm_contratos (cliente_id, responsavel_id, numero, titulo, valor_contratado, status, data_assinatura, data_inicio, data_fim, condicoes_pagamento, observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [cliente_id, u.userId, numero, titulo, valor_contratado ?? 0, status, data_assinatura, data_inicio, data_fim, condicoes_pagamento, observacoes]
    );
    const id = (result as any).insertId;
    await audit(u.userId, "create", "crm_contratos", id, { titulo, numero }, req.ip);
    res.json({ id, numero, ok: true });
  });

  // ── Contas a Receber ────────────────────────────────────────────────────────
  r.get("/contas-receber", requireCrmAuth, async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.query as any;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (status) { where += " AND cr.status = ?"; params.push(status); }
    const rows = await db(
      `SELECT cr.*, c.nome as cliente_nome FROM crm_contas_receber cr LEFT JOIN crm_clientes c ON cr.cliente_id = c.id ${where} ORDER BY cr.vencimento ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [count] = await db(`SELECT COUNT(*) as total FROM crm_contas_receber cr ${where}`, params);
    res.json({ data: rows, total: (count as any).total });
  });

  r.post("/contas-receber", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { cliente_id, descricao, valor, vencimento, observacoes } = req.body;
    if (!descricao || !valor || !vencimento) return res.status(400).json({ error: "Campos obrigatórios faltando" });
    const [result] = await getPool().execute(
      "INSERT INTO crm_contas_receber (cliente_id, descricao, valor, vencimento, observacoes) VALUES (?,?,?,?,?)",
      [cliente_id, descricao, valor, vencimento, observacoes]
    );
    await audit(u.userId, "create", "crm_contas_receber", (result as any).insertId, { descricao, valor }, req.ip);
    res.json({ id: (result as any).insertId, ok: true });
  });

  r.patch("/contas-receber/:id/pagar", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { valor_pago, forma_pagamento, data_pagamento } = req.body;
    await db(
      "UPDATE crm_contas_receber SET status='pago', valor_pago=?, forma_pagamento=?, data_pagamento=? WHERE id=?",
      [valor_pago, forma_pagamento, data_pagamento ?? new Date().toISOString().split("T")[0], req.params.id]
    );
    await audit(u.userId, "pagar", "crm_contas_receber", parseInt(req.params.id), { valor_pago }, req.ip);
    res.json({ ok: true });
  });

  // ── Ordens de Serviço ───────────────────────────────────────────────────────
  r.get("/ordens-servico", requireCrmAuth, async (req, res) => {
    const { status, tipo } = req.query as any;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (status) { where += " AND os.status = ?"; params.push(status); }
    if (tipo) { where += " AND os.tipo = ?"; params.push(tipo); }
    const rows = await db(
      `SELECT os.*, u.name as responsavel_nome, e.nome as evento_nome FROM crm_ordens_servico os LEFT JOIN crm_users u ON os.responsavel_id = u.id LEFT JOIN crm_eventos e ON os.evento_id = e.id ${where} ORDER BY os.data_inicio ASC`,
      params
    );
    res.json(rows);
  });

  r.post("/ordens-servico", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { titulo, tipo = "montagem", contrato_id, evento_id, data_inicio, data_fim, local_evento, observacoes } = req.body;
    if (!titulo) return res.status(400).json({ error: "Título obrigatório" });
    const numero = `OS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const [result] = await getPool().execute(
      "INSERT INTO crm_ordens_servico (titulo, tipo, numero, contrato_id, evento_id, responsavel_id, data_inicio, data_fim, local_evento, observacoes) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [titulo, tipo, numero, contrato_id, evento_id, u.userId, data_inicio, data_fim, local_evento, observacoes]
    );
    await audit(u.userId, "create", "crm_ordens_servico", (result as any).insertId, { titulo, numero }, req.ip);
    res.json({ id: (result as any).insertId, numero, ok: true });
  });

  // ── Usuários (admin) ────────────────────────────────────────────────────────
  r.get("/users", requireCrmAuth, async (_req, res) => {
    const rows = await db("SELECT id, name, email, role, active, last_login, created_at FROM crm_users ORDER BY name ASC");
    res.json(rows);
  });

  r.post("/users", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const { name, email, password, role = "vendedor" } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Nome, email e senha obrigatórios" });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await getPool().execute(
      "INSERT INTO crm_users (name, email, password, role) VALUES (?,?,?,?)",
      [name, email.trim().toLowerCase(), hash, role]
    );
    await audit(u.userId, "create_user", "crm_users", (result as any).insertId, { name, email, role }, req.ip);
    res.json({ id: (result as any).insertId, ok: true });
  });

  r.put("/users/:id", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const { name, email, role, active } = req.body;
    await db("UPDATE crm_users SET name=?, email=?, role=?, active=? WHERE id=?", [name, email, role, active ?? 1, req.params.id]);
    await audit(u.userId, "update_user", "crm_users", parseInt(req.params.id), req.body, req.ip);
    res.json({ ok: true });
  });

  r.post("/users/:id/reset-password", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: "Senha mínima de 8 caracteres" });
    const hash = await bcrypt.hash(password, 10);
    await db("UPDATE crm_users SET password=? WHERE id=?", [hash, req.params.id]);
    await audit(u.userId, "reset_password", "crm_users", parseInt(req.params.id), null, req.ip);
    res.json({ ok: true });
  });

  // ── Auditoria ───────────────────────────────────────────────────────────────
  r.get("/auditoria", requireCrmAdmin, async (req, res) => {
    const { limit = 100, offset = 0 } = req.query as any;
    const rows = await db(
      "SELECT a.*, u.name as user_nome FROM crm_auditoria a LEFT JOIN crm_users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?",
      [parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  });

  // ── Relatórios ──────────────────────────────────────────────────────────────
  r.get("/relatorios/receita-mensal", requireCrmAuth, async (_req, res) => {
    const rows = await db(
      "SELECT DATE_FORMAT(data_pagamento, '%Y-%m') as mes, SUM(valor_pago) as total FROM crm_contas_receber WHERE status='pago' AND data_pagamento >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY mes ORDER BY mes ASC"
    );
    res.json(rows);
  });

  r.get("/relatorios/leads-por-origem", requireCrmAuth, async (_req, res) => {
    const rows = await db("SELECT origem, COUNT(*) as total FROM crm_leads GROUP BY origem ORDER BY total DESC");
    res.json(rows);
  });

  r.get("/relatorios/funil", requireCrmAuth, async (_req, res) => {
    const rows = await db("SELECT etapa, COUNT(*) as total, SUM(valor_estimado) as valor FROM crm_oportunidades GROUP BY etapa ORDER BY FIELD(etapa,'novo_lead','em_contato','briefing_recebido','projeto_em_andamento','proposta_enviada','negociacao','contrato_assinado','em_producao','em_montagem','concluido','perdido')");
    res.json(rows);
  });

  // Registrar todas as rotas CRM sob /api/crm
  app.use("/api/crm", r);
}
