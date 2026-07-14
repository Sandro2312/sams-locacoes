// SAMS Locações CRM/ERP — Rotas Express
// Autenticação própria via cookie crm_session (separada do OAuth do site)
import { Router, Request, Response, NextFunction } from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { sendEmail, buildPasswordResetEmail } from "./crm-email";
import { storagePut } from "./storage";

// Helper para LIMIT/OFFSET seguros — evita SQL injection por interpolação
function safeInt(val: any, defaultVal: number, min = 0, max = 10000): number {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.max(min, Math.min(max, n));
}
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
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias

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
  // Tentar cookie primeiro (padrão)
  let token = getCookie(req, "crm_session");
  // Fallback: header Authorization: Bearer <token> (para browsers que bloqueiam cookies)
  if (!token) {
    const authHeader = req.headers["authorization"] || req.headers["x-crm-token"];
    if (authHeader) {
      const parts = String(authHeader).split(" ");
      token = parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : parts[0];
    }
  }
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

const _rateBuckets = new Map<string, { count: number; resetAt: number }>();
function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cur = _rateBuckets.get(key);
  if (!cur || now >= cur.resetAt) {
    _rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (cur.count >= limit) return { ok: false, remaining: 0, resetAt: cur.resetAt };
  cur.count += 1;
  _rateBuckets.set(key, cur);
  return { ok: true, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt };
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

  const aiEnabled = () => {
    try {
      return !!(ENV.forgeApiKey && String(ENV.forgeApiKey).trim());
    } catch {
      return false;
    }
  };
  const clampText = (v: any, maxLen: number) => {
    if (v == null) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    const t = s.length > maxLen ? s.slice(0, maxLen) : s;
    return t.trim();
  };
  const jsonTryParse = (s: any) => {
    try {
      if (typeof s !== "string") return null;
      const t = s.trim();
      if (!t) return null;
      return JSON.parse(t);
    } catch {
      return null;
    }
  };
  const deepMerge = (base: any, overlay: any) => {
    if (!overlay || typeof overlay !== "object") return base;
    const out = Array.isArray(base) ? [...base] : { ...(base || {}) };
    for (const k of Object.keys(overlay)) {
      const bv = base ? (base as any)[k] : undefined;
      const ov = (overlay as any)[k];
      if (ov && typeof ov === "object" && !Array.isArray(ov) && bv && typeof bv === "object" && !Array.isArray(bv)) {
        (out as any)[k] = deepMerge(bv, ov);
      } else {
        (out as any)[k] = ov;
      }
    }
    return out;
  };
  const experimentVariant = (userId: number, key: string, variants: string[]) => {
    const input = `${userId}:${key}`;
    const hex = crypto.createHash("sha256").update(input).digest("hex").slice(0, 8);
    const n = parseInt(hex, 16);
    const idx = Number.isFinite(n) ? (n % variants.length) : 0;
    return variants[idx] || variants[0];
  };

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
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    // sameSite="lax" + secure=true em HTTPS garante compatibilidade com:
    // - Chrome/Android, Safari/iOS, Firefox mobile
    // - Brave, Samsung Internet, WebView
    // sameSite="lax" permite cookies em navegação normal (links, redirects top-level)
    // mas bloqueia em requests cross-site (proteção CSRF adequada)
    res.cookie("crm_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      maxAge: SESSION_TTL,
      path: "/",
    });
    // Também enviar token no body para fallback em browsers que bloqueiam cookies 3rd-party
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, _sessionToken: token });
  });

  r.post("/logout", async (req, res) => {
    const token = getCookie(req, "crm_session");
    if (token) await deleteSession(token);
    res.clearCookie("crm_session", { path: "/" });
    res.json({ ok: true });
  });

  // ── Recuperação de Senha ────────────────────────────────────────────────────
  // POST /api/crm/forgot-password — solicita reset, envia email
  r.post("/forgot-password", async (req, res) => {
    const { email } = req.body ?? {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email obrigatório" });
    }
    // Rate limit: 3 tentativas por email por hora
    const rl = consumeRateLimit(`forgot:${email.trim().toLowerCase()}`, 3, 60 * 60 * 1000);
    if (!rl.ok) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde 1 hora e tente novamente." });
    }
    const user = await dbOne<any>(
      "SELECT id, name, email, active FROM crm_users WHERE email = ? AND active = 1",
      [email.trim().toLowerCase()]
    );
    // Sempre retornar sucesso para não revelar se email existe
    if (!user) {
      return res.json({ ok: true, message: "Se este email estiver cadastrado, você receberá as instruções em breve." });
    }
    // Gerar token seguro (expira em 1 hora)
    const resetToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hora
    // Invalidar tokens anteriores deste usuário
    await db("DELETE FROM crm_password_resets WHERE user_id = ? AND used_at IS NULL", [user.id]).catch(() => {});
    await db(
      "INSERT INTO crm_password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, resetToken, expiresAt]
    );
    // Determinar URL base (produção ou dev)
    const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
    const host = req.headers["x-forwarded-host"] || req.headers["host"] || "samslocacoes.com.br";
    const baseUrl = `${proto}://${host}`;
    const resetUrl = `${baseUrl}/crm/index.html?reset_token=${resetToken}`;
    // Enviar email
    const { html, text } = buildPasswordResetEmail(user.name, resetUrl);
    const sent = await sendEmail({
      to: user.email,
      subject: "Recuperação de Senha — SAMS Locações CRM",
      html,
      text,
    });
    if (!sent) {
      console.error(`[CRM] Falha ao enviar email de reset para ${user.email}`);
    }
    await audit(user.id, "forgot_password", "crm_users", user.id, null, req.ip);
    return res.json({ ok: true, message: "Se este email estiver cadastrado, você receberá as instruções em breve." });
  });

  // POST /api/crm/reset-password — confirma token e define nova senha
  r.post("/reset-password", async (req, res) => {
    const { token, password } = req.body ?? {};
    if (!token || !password) {
      return res.status(400).json({ error: "Token e nova senha são obrigatórios" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres" });
    }
    const now = Date.now();
    const resetRow = await dbOne<any>(
      "SELECT id, user_id, expires_at, used_at FROM crm_password_resets WHERE token = ?",
      [token]
    );
    if (!resetRow) {
      return res.status(400).json({ error: "Link inválido ou expirado. Solicite um novo." });
    }
    if (resetRow.used_at) {
      return res.status(400).json({ error: "Este link já foi utilizado. Solicite um novo." });
    }
    if (Number(resetRow.expires_at) < now) {
      return res.status(400).json({ error: "Link expirado. Solicite um novo." });
    }
    // Atualizar senha
    const hash = await bcrypt.hash(password, 10);
    await db("UPDATE crm_users SET password = ? WHERE id = ?", [hash, resetRow.user_id]);
    // Marcar token como usado
    await db("UPDATE crm_password_resets SET used_at = NOW() WHERE id = ?", [resetRow.id]);
    // Invalidar todas as sessões ativas deste usuário
    await db("DELETE FROM crm_sessions WHERE user_id = ?", [resetRow.user_id]).catch(() => {});
    await audit(resetRow.user_id, "reset_password", "crm_users", resetRow.user_id, null, req.ip);
    return res.json({ ok: true, message: "Senha redefinida com sucesso! Faça login com sua nova senha." });
  });

  // GET /api/crm/validate-reset-token — verifica se token é válido (sem consumir)
  r.get("/validate-reset-token", async (req, res) => {
    const { token } = req.query as any;
    if (!token) return res.status(400).json({ valid: false, error: "Token não informado" });
    const now = Date.now();
    const row = await dbOne<any>(
      "SELECT id, expires_at, used_at FROM crm_password_resets WHERE token = ?",
      [token]
    );
    if (!row || row.used_at || Number(row.expires_at) < now) {
      return res.json({ valid: false, error: "Link inválido ou expirado" });
    }
    return res.json({ valid: true });
  });

  r.get("/me", requireCrmAuth, async (req, res) => {
    const session = (req as any).crmUser;
    // Recuperar o token atual (cookie ou header Authorization) para retornar como fallback
    const currentToken = getCookie(req, "crm_session")
      || (() => {
          const h = String(req.headers["authorization"] || req.headers["x-crm-token"] || "");
          const parts = h.split(" ");
          return parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : (parts[0] || null);
        })() || null;
    // Buscar dados completos do usuário incluindo modules_json e permissions_json
    const userRow = await dbOne<any>(
      "SELECT id, name, email, role, active, modules_json, permissions_json FROM crm_users WHERE id = ?",
      [session.userId]
    );
    if (!userRow) return res.json({ user: session, _sessionToken: currentToken });
    res.json({
      user: {
        ...session,
        id: userRow.id,
        email: userRow.email,
        modules_json: userRow.modules_json,
        permissions_json: userRow.permissions_json,
      },
      // Retornar token para que browsers que bloqueiam cookies possam persistir a sessão
      _sessionToken: currentToken,
    });
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
    const limitNum = safeInt(limit, 50, 1, 500);
    const offsetNum = safeInt(offset, 0, 0, 100000);
    const rows = await db(
      `SELECT l.*, u.name as responsavel_nome FROM crm_leads l LEFT JOIN crm_users u ON l.responsavel_id = u.id ${where} ORDER BY l.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
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
    const n = (v: any) => (v === undefined ? null : v);
    const [result] = await getPool().execute(
      "INSERT INTO crm_leads (nome, email, telefone, whatsapp, status, origem, segmento, evento_interesse, metragem_estimada, responsavel_id, temperatura, proximo_contato, observacoes, utm_source, utm_medium, utm_campaign) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [n(nome), n(email), n(telefone), n(whatsapp), n(status), n(origem), n(segmento), n(evento_interesse), n(metragem_estimada), n(responsavel_id), n(temperatura), n(proximo_contato), n(observacoes), n(utm_source), n(utm_medium), n(utm_campaign)]
    );
    const id = (result as any).insertId;
    await audit(u.userId, "create", "crm_leads", id, { nome }, req.ip);
    res.json({ id, ok: true });
  });

  r.put("/leads/:id", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const idNum = parseInt(req.params.id);
    if (!Number.isFinite(idNum)) return res.status(400).json({ error: "ID inválido" });

    const current = await dbOne<any>("SELECT * FROM crm_leads WHERE id = ?", [idNum]);
    if (!current) return res.status(404).json({ error: "Lead não encontrado" });

    const body: any = req.body ?? {};
    const pick = (key: string, fallback: any) => (body[key] !== undefined ? body[key] : fallback);
    const norm = (v: any) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      if (typeof v === "string") {
        const t = v.trim();
        return t === "" ? null : t;
      }
      return v;
    };

    const nome = norm(pick("nome", current.nome));
    if (!nome) return res.status(400).json({ error: "Nome obrigatório" });

    const email = norm(pick("email", current.email));
    const telefone = norm(pick("telefone", current.telefone));
    const whatsapp = norm(pick("whatsapp", current.whatsapp));
    const status = norm(pick("status", current.status));
    const origem = norm(pick("origem", current.origem));
    const segmento = norm(pick("segmento", current.segmento));
    const evento_interesse = norm(pick("evento_interesse", current.evento_interesse));
    const metragem_estimada = norm(pick("metragem_estimada", current.metragem_estimada));
    const responsavel_id = norm(pick("responsavel_id", current.responsavel_id));
    const temperatura = norm(pick("temperatura", current.temperatura));
    const proximo_contato = norm(pick("proximo_contato", current.proximo_contato));
    const observacoes = norm(pick("observacoes", current.observacoes));
    const scoreRaw = pick("score", current.score ?? 0);
    const score = scoreRaw == null ? 0 : (Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : 0);

    await db(
      "UPDATE crm_leads SET nome=?, email=?, telefone=?, whatsapp=?, status=?, origem=?, segmento=?, evento_interesse=?, metragem_estimada=?, responsavel_id=?, temperatura=?, proximo_contato=?, observacoes=?, score=?, last_activity_at=NOW() WHERE id=?",
      [nome, email, telefone, whatsapp, status, origem, segmento, evento_interesse, metragem_estimada, responsavel_id, temperatura, proximo_contato, observacoes, score, idNum]
    );
    await audit(u.userId, "update", "crm_leads", idNum, body, req.ip);
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
    const lim = safeInt(limit, 50, 1, 500); const off = safeInt(offset, 0, 0, 100000);
    const rows = await db(`SELECT * FROM crm_clientes ${where} ORDER BY nome ASC LIMIT ${lim} OFFSET ${off}`, params);
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
    const n = (v: any) => (v === undefined ? null : v);
    const [result] = await getPool().execute(
      "INSERT INTO crm_clientes (nome, email, telefone, documento, cep, endereco, bairro, cidade, estado, segmento, observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [n(nome), n(email), n(telefone), n(documento), n(cep), n(endereco), n(bairro), n(cidade), n(estado), n(segmento), n(observacoes)]
    );
    const id = (result as any).insertId;
    await audit(u.userId, "create", "crm_clientes", id, { nome }, req.ip);
    res.json({ id, ok: true });
  });

  r.put("/clientes/:id", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const { nome, email, telefone, documento, cep, endereco, bairro, cidade, estado, segmento, status, observacoes } = req.body;
    const nu = (v: any) => (v === undefined ? null : v);
    await db(
      "UPDATE crm_clientes SET nome=?, email=?, telefone=?, documento=?, cep=?, endereco=?, bairro=?, cidade=?, estado=?, segmento=?, status=?, observacoes=? WHERE id=?",
      [nu(nome), nu(email), nu(telefone), nu(documento), nu(cep), nu(endereco), nu(bairro), nu(cidade), nu(estado), nu(segmento), status ?? "Ativo", nu(observacoes), req.params.id]
    );
    await audit(u.userId, "update", "crm_clientes", parseInt(req.params.id), req.body, req.ip);
    res.json({ ok: true });
  });

  r.delete("/clientes/:id", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
    const existing = await dbOne("SELECT id, nome FROM crm_clientes WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Cliente não encontrado" });
    // Verificar vínculos antes de excluir
    const vinculos = await dbOne<any>(
      "SELECT COUNT(*) as total FROM crm_contas_receber WHERE cliente_id = ?",
      [id]
    );
    if (vinculos && vinculos.total > 0) {
      return res.status(409).json({ error: `Este cliente possui ${vinculos.total} conta(s) a receber vinculada(s). Exclua-as antes.` });
    }
    await db("DELETE FROM crm_clientes WHERE id = ?", [id]);
    await audit(u.userId, "delete", "crm_clientes", id, { nome: (existing as any).nome }, req.ip);
    res.json({ ok: true, success: true });
  });

  // ── Briefings ───────────────────────────────────────────────────────────────
  r.get("/briefings", requireCrmAuth, async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.query as any;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (status) { where += " AND status = ?"; params.push(status); }
    const lim = safeInt(limit, 50, 1, 500); const off = safeInt(offset, 0, 0, 100000);
    const rows = await db(`SELECT * FROM crm_briefings ${where} ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`, params);
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

  r.post("/briefings/:id/enviar-projetista", requireCrmAuth, async (req: any, res: any) => {
    const u = req.crmUser;
    const briefingId = parseInt(req.params.id, 10);
    if (!Number.isFinite(briefingId)) return res.status(400).json({ error: "ID inválido" });

    const enviadoParaIdRaw = req.body && req.body.enviado_para_id != null ? String(req.body.enviado_para_id).trim() : "";
    const enviadoParaId = parseInt(enviadoParaIdRaw, 10);
    if (!enviadoParaIdRaw || !Number.isFinite(enviadoParaId)) {
      return res.status(400).json({ error: "Selecione o projetista/engenheiro (enviado_para_id)" });
    }

    const briefing = await dbOne<any>("SELECT * FROM crm_briefings WHERE id = ?", [briefingId]);
    if (!briefing) return res.status(404).json({ error: "Briefing não encontrado" });

    const statusAtual = briefing && briefing.status != null ? String(briefing.status) : "";
    if (String(statusAtual).toLowerCase() === "enviado") {
      return res.status(409).json({ error: "Briefing já foi enviado" });
    }

    const destinatario = await dbOne<any>("SELECT id, name, role, active FROM crm_users WHERE id = ?", [enviadoParaId]);
    if (!destinatario || !destinatario.active) return res.status(400).json({ error: "Projetista/engenheiro inválido ou inativo" });

    const normalizeMoney = (value: any) => {
      const n = typeof value === "string" ? Number(String(value).replace(",", ".")) : Number(value);
      return Number.isFinite(n) ? n : 0;
    };
    const normalizeMetragem = (value: any) => {
      const n = typeof value === "string" ? Number(String(value).replace(",", ".")) : Number(value);
      return Number.isFinite(n) ? n : 0;
    };
    const ymd = (d: Date) => {
      try { return d.toISOString().slice(0, 10); } catch { return null; }
    };

    const metragemM2 = normalizeMetragem(briefing.metragem);
    const orcamentoEstimado = normalizeMoney(briefing.orcamento_estimado);
    const dataHoje = ymd(new Date());

    const custoM2RowUser = await dbOne<any>("SELECT valor FROM crm_settings WHERE chave = ?", [`custo_projeto_m2_user_${destinatario.id}`]);
    const custoM2RowGlobal = await dbOne<any>("SELECT valor FROM crm_settings WHERE chave = ?", ["custo_projeto_m2"]);
    const custoProjetoM2 = normalizeMoney(
      (custoM2RowUser && custoM2RowUser.valor != null ? custoM2RowUser.valor : null) ??
      (custoM2RowGlobal && custoM2RowGlobal.valor != null ? custoM2RowGlobal.valor : 0)
    );
    const valorContaPagar = Math.round((metragemM2 * custoProjetoM2) * 100) / 100;
    const centroCusto = (briefing && briefing.nome_evento != null ? String(briefing.nome_evento).trim() : "") || "Projetos";

    const tituloProjeto = `Projeto - ${briefing.empresa || "Cliente"} - ${briefing.nome_evento || "Evento"}`;
    const descricaoProjeto = `Gerado automaticamente a partir do briefing #${briefingId}.`;
    const statusProjeto = "em_andamento";

    const [projResult] = await getPool().execute(
      "INSERT INTO crm_projetos (titulo, descricao, status, cliente_id, evento_id, data_inicio, data_fim, valor, responsavel_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        tituloProjeto,
        descricaoProjeto,
        statusProjeto,
        null,
        null,
        briefing.data_inicio || null,
        briefing.data_termino || null,
        orcamentoEstimado || null,
        destinatario.id,
        u.userId
      ]
    );
    const projetoId = (projResult as any).insertId;

    let payloadJsonToSave: string | null = briefing.payload_json || null;
    try {
      if (briefing.payload_json) {
        const parsed = JSON.parse(String(briefing.payload_json));
        const next = (parsed && typeof parsed === "object") ? parsed : {};
        next.workflow = next.workflow && typeof next.workflow === "object" ? next.workflow : {};
        next.workflow.enviado_para_id = destinatario.id;
        next.workflow.enviado_em = new Date().toISOString();
        next.workflow.projeto_id = projetoId;
        next.workflow.metragem_m2 = metragemM2;
        payloadJsonToSave = JSON.stringify(next);
      }
    } catch {}

    await db(
      "UPDATE crm_briefings SET status = ?, payload_json = ? WHERE id = ?",
      ["Enviado", payloadJsonToSave, briefingId]
    );
    await audit(u.userId, "send_to_projetista", "crm_briefings", briefingId, { enviado_para_id: destinatario.id, projeto_id: projetoId }, req.ip);

    let transacaoId: number | null = null;
    try {
      const marker = `"briefing_id":${briefingId}`;
      const existing = await dbOne<any>(
        "SELECT id FROM crm_transacoes WHERE descricao LIKE ? AND observacoes LIKE ? LIMIT 1",
        ["Confecção de projeto%", `%${marker}%`]
      );
      if (!existing) {
        const obs = JSON.stringify({
          origem: "briefings.enviar-projetista",
          briefing_id: briefingId,
          projeto_id: projetoId,
          metragem_m2: metragemM2,
          custo_projeto_m2: custoProjetoM2,
          centro_custo: centroCusto,
          nome_evento: briefing.nome_evento || null
        });
        const [txResult] = await getPool().execute(
          "INSERT INTO crm_transacoes (descricao, tipo, valor, status, centro_custo, data, observacoes, evento_id, cliente_id, created_by, recorrencia, recorrencia_grupo_id, recorrencia_indice) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            `Confecção de projeto (Briefing #${briefingId})`,
            "contas a pagar",
            valorContaPagar,
            "pendente",
            centroCusto,
            dataHoje,
            obs,
            null,
            null,
            u.userId,
            null,
            null,
            null
          ]
        );
        transacaoId = (txResult as any).insertId;
      } else {
        transacaoId = existing.id;
      }
    } catch {}

    res.json({ ok: true, projetoId, transacaoId, valorContaPagar, custoProjetoM2, metragemM2, centroCusto });
  });

  r.delete("/briefings/:id", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
    const existing = await dbOne("SELECT id FROM crm_briefings WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Briefing não encontrado" });
    await db("DELETE FROM crm_briefing_checklist WHERE briefing_id = ?", [id]);
    await db("DELETE FROM crm_briefings WHERE id = ?", [id]);
    await audit(u.userId, "delete", "crm_briefings", id, {}, req.ip);
    res.json({ ok: true, success: true });
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

  r.put("/eventos/:id", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
    const { nome, organizadora, local, endereco, data_inicio, data_fim, status, taxas_json, observacoes } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
    await db(
      "UPDATE crm_eventos SET nome=?, organizadora=?, local=?, endereco=?, data_inicio=?, data_fim=?, status=?, taxas_json=?, observacoes=? WHERE id=?",
      [nome, organizadora, local, endereco, data_inicio, data_fim, status ?? "Planejado", taxas_json ? JSON.stringify(taxas_json) : null, observacoes, id]
    );
    await audit(u.userId, "update", "crm_eventos", id, req.body, req.ip);
    res.json({ ok: true });
  });

  r.delete("/eventos/:id", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
    const existing = await dbOne("SELECT id, nome FROM crm_eventos WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Evento não encontrado" });
    await db("DELETE FROM crm_eventos WHERE id = ?", [id]);
    await audit(u.userId, "delete", "crm_eventos", id, { nome: (existing as any).nome }, req.ip);
    res.json({ ok: true, success: true });
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
      `SELECT cr.*, COALESCE(c.nome, '') as cliente_nome FROM crm_contas_receber cr LEFT JOIN crm_clientes c ON cr.cliente_id = c.id ${where} ORDER BY cr.vencimento ASC LIMIT ${safeInt(limit, 50, 1, 500)} OFFSET ${safeInt(offset, 0, 0, 100000)}`,
      params
    );
    const [count] = await db(`SELECT COUNT(*) as total FROM crm_contas_receber cr ${where}`, params);
    res.json({ data: rows, total: (count as any).total });
  });

  r.post("/contas-receber", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const {
      clienteId, cliente_id, vendaId, venda_id,
      centroCusto, centro_custo,
      tipoReceita, tipo_receita,
      descricao, valor, vencimento,
      status, dataPagamento, data_pagamento,
      formaPagamento, forma_pagamento,
      observacoes, comprovanteName, comprovanteMime, comprovanteDataBase64
    } = req.body;

    // Normalizar nomes de campos (aceitar camelCase e snake_case)
    const finalClienteId = clienteId ?? cliente_id ?? null;
    const finalVendaId = vendaId ?? venda_id ?? null;
    const finalCentroCusto = centroCusto ?? centro_custo ?? null;
    const finalTipoReceita = tipoReceita ?? tipo_receita ?? 'stand';
    const finalStatus = (status ?? 'pendente').toString().toLowerCase();
    const finalDataPagamento = dataPagamento ?? data_pagamento ?? null;
    const finalFormaPagamento = formaPagamento ?? forma_pagamento ?? null;

    if (!descricao || !valor || !vencimento) return res.status(400).json({ error: "Campos obrigatórios faltando" });

    // Comprovante agora é opcional - removida validação obrigatória

    let comprovanteUrl = null;
    if (comprovanteDataBase64 && comprovanteName) {
      try {
        const buffer = Buffer.from(comprovanteDataBase64, 'base64');
        const fileName = `contas-receber/${Date.now()}-${comprovanteName}`;
        const { url } = await storagePut(fileName, buffer, comprovanteMime || 'application/octet-stream');
        comprovanteUrl = url;
      } catch (err) {
        console.warn('[CRM] Falha ao salvar comprovante em S3:', err);
      }
    }

    // Garantir que nenhum parâmetro seja undefined (MySQL2 rejeita undefined, exige null)
    const n = (v: any) => (v === undefined ? null : v);
    const [result] = await getPool().execute(
      `INSERT INTO crm_contas_receber
       (cliente_id, venda_id, centro_custo, descricao, valor, vencimento, status, data_pagamento, forma_pagamento, observacoes, comprovante_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [n(finalClienteId), n(finalVendaId), n(finalCentroCusto), n(descricao), n(valor), n(vencimento), n(finalStatus), n(finalDataPagamento), n(finalFormaPagamento), n(observacoes), n(comprovanteUrl)]
    );
    const insertId = (result as any).insertId;
    await audit(u.userId, "create", "crm_contas_receber", insertId, { descricao, valor, cliente_id: finalClienteId }, req.ip);
    res.json({ id: insertId, ok: true });
  });

  r.put("/contas-receber/:id", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const id = req.params.id;
    const { clienteId, cliente_id, vendaId, venda_id, centroCusto, centro_custo, tipoReceita, tipo_receita, descricao, valor, vencimento, status, dataPagamento, data_pagamento, formaPagamento, forma_pagamento, observacoes, comprovanteName, comprovanteMime, comprovanteDataBase64 } = req.body;
    
    const finalClienteId = clienteId ?? cliente_id ?? null;
    const finalVendaId = vendaId ?? venda_id ?? null;
    const finalCentroCusto = centroCusto ?? centro_custo ?? null;
    const finalTipoReceita = tipoReceita ?? tipo_receita ?? 'stand';
    const finalStatus = (status ?? 'pendente').toString().toLowerCase();
    const finalDataPagamento = dataPagamento ?? data_pagamento ?? null;
    const finalFormaPagamento = formaPagamento ?? forma_pagamento ?? null;
    
    // Comprovante agora é opcional - removida validação obrigatória
    
    let comprovanteUrl = null;
    if (comprovanteDataBase64 && comprovanteName) {
      try {
        const buffer = Buffer.from(comprovanteDataBase64, 'base64');
        const fileName = `contas-receber/${Date.now()}-${comprovanteName}`;
        const { url } = await storagePut(fileName, buffer, comprovanteMime || 'application/octet-stream');
        comprovanteUrl = url;
      } catch (err) {
        console.warn('[CRM] Falha ao salvar comprovante em S3:', err);
      }
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (finalClienteId !== undefined) { updates.push("cliente_id=?"); values.push(finalClienteId); }
    if (finalVendaId !== undefined) { updates.push("venda_id=?"); values.push(finalVendaId); }
    if (finalCentroCusto !== undefined) { updates.push("centro_custo=?"); values.push(finalCentroCusto); }
    if (descricao !== undefined) { updates.push("descricao=?"); values.push(descricao); }
    if (valor !== undefined) { updates.push("valor=?"); values.push(valor); }
    if (vencimento !== undefined) { updates.push("vencimento=?"); values.push(vencimento); }
    if (finalStatus !== undefined) { updates.push("status=?"); values.push(finalStatus); }
    if (finalDataPagamento !== undefined) { updates.push("data_pagamento=?"); values.push(finalDataPagamento); }
    if (finalFormaPagamento !== undefined) { updates.push("forma_pagamento=?"); values.push(finalFormaPagamento); }
    if (observacoes !== undefined) { updates.push("observacoes=?"); values.push(observacoes); }
    if (comprovanteUrl !== null) { updates.push("comprovante_url=?"); values.push(comprovanteUrl); }
    
    if (updates.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });
    
    values.push(id);
    await db(`UPDATE crm_contas_receber SET ${updates.join(", ")} WHERE id=?`, values);
    await audit(u.userId, "update", "crm_contas_receber", parseInt(id), { descricao, valor }, req.ip);
    res.json({ ok: true });
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

  r.delete("/contas-receber/:id", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
    const existing = await dbOne("SELECT id, descricao FROM crm_contas_receber WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Conta a receber não encontrada" });
    await db("DELETE FROM crm_contas_receber WHERE id = ?", [id]);
    await audit(u.userId, "delete", "crm_contas_receber", id, { descricao: (existing as any).descricao }, req.ip);
    res.json({ ok: true, success: true });
  });

  r.delete("/contas-receber/:id/comprovante", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
    const existing = await dbOne<any>("SELECT id, comprovante_url FROM crm_contas_receber WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Conta a receber não encontrada" });
    await db("UPDATE crm_contas_receber SET comprovante_url = NULL WHERE id = ?", [id]);
    await audit(u.userId, "delete_comprovante", "crm_contas_receber", id, {}, req.ip);
    res.json({ ok: true, success: true });
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
    const rows = await db("SELECT id, name, email, role, active, last_login, created_at, modules_json, permissions_json FROM crm_users ORDER BY name ASC");
    res.json(rows);
  });

  r.post("/users", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const { name, email, password, role = "vendedor", modules_json, permissions_json } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Nome, email e senha obrigatórios" });
    const hash = await bcrypt.hash(password, 10);
    const mj = modules_json ? (typeof modules_json === 'string' ? modules_json : JSON.stringify(modules_json)) : null;
    const pj = permissions_json ? (typeof permissions_json === 'string' ? permissions_json : JSON.stringify(permissions_json)) : null;
    const [result] = await getPool().execute(
      "INSERT INTO crm_users (name, email, password, role, modules_json, permissions_json) VALUES (?,?,?,?,?,?)",
      [name, email.trim().toLowerCase(), hash, role, mj, pj]
    );
    await audit(u.userId, "create_user", "crm_users", (result as any).insertId, { name, email, role }, req.ip);
    res.json({ id: (result as any).insertId, ok: true });
  });

  r.put("/users/:id", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    // Aceitar tanto modules_json/permissions_json quanto modules/permissions (array)
    const { name, email, role, active } = req.body;
    const rawModules = req.body.modules_json !== undefined ? req.body.modules_json : req.body.modules;
    const rawPerms = req.body.permissions_json !== undefined ? req.body.permissions_json : req.body.permissions;
    const mj = rawModules !== undefined && rawModules !== null
      ? (typeof rawModules === 'string' ? rawModules : JSON.stringify(rawModules))
      : null;
    const pj = rawPerms !== undefined && rawPerms !== null
      ? (typeof rawPerms === 'string' ? rawPerms : JSON.stringify(rawPerms))
      : null;
    if (mj !== null || pj !== null) {
      await db(
        "UPDATE crm_users SET name=?, email=?, role=?, active=?, modules_json=?, permissions_json=? WHERE id=?",
        [name, email, role, active ?? 1, mj, pj, req.params.id]
      );
    } else {
      await db("UPDATE crm_users SET name=?, email=?, role=?, active=? WHERE id=?", [name, email, role, active ?? 1, req.params.id]);
    }
    await audit(u.userId, "update_user", "crm_users", parseInt(req.params.id), req.body, req.ip);
    res.json({ ok: true });
  });

  // Rota dedicada para salvar módulos/permissões de um usuário
  r.put("/users/:id/modules", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const { modules, permissions } = req.body;
    const mj = Array.isArray(modules) ? JSON.stringify(modules) : null;
    const pj = Array.isArray(permissions) ? JSON.stringify(permissions) : null;
    await db("UPDATE crm_users SET modules_json=?, permissions_json=? WHERE id=?", [mj, pj, req.params.id]);
    await audit(u.userId, "update_user_modules", "crm_users", parseInt(req.params.id), { modules, permissions }, req.ip);
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
      `SELECT a.*, u.name as user_nome FROM crm_auditoria a LEFT JOIN crm_users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ${safeInt(limit, 100, 1, 500)} OFFSET ${safeInt(offset, 0, 0, 100000)}`,
      []
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

  r.get("/ui/config", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const role = u && u.role ? String(u.role) : "comercial";
    const ai = aiEnabled();

    const base: any = {
      aiEnabled: ai,
      limits: { maxImageBytes: 2_000_000, maxAudioBytes: 2_000_000 },
      features: {
        aiForms: true,
        aiRewrite: true,
        aiSentiment: true,
        aiImage: true,
        aiPresentation: true,
        aiVoiceTranscription: true,
        personalizationSmartDefaults: true,
        telemetry: true,
      },
      experiments: {
        aiPanels: { key: "aiPanels", variant: "on" },
      },
      role,
    };

    base.experiments.aiPanels.variant = experimentVariant(Number(u.userId || 0), "aiPanels", ["on", "on", "on", "off"]);

    let fromDb: any = null;
    try {
      const row = await dbOne<{ valor: string | null }>("SELECT valor FROM crm_settings WHERE chave = ?", ["ui_config"]);
      if (row && row.valor) fromDb = jsonTryParse(row.valor);
    } catch {}

    const merged = deepMerge(base, fromDb || {});

    if (!merged.aiEnabled) {
      merged.features = merged.features || {};
      merged.features.aiForms = false;
      merged.features.aiRewrite = false;
      merged.features.aiSentiment = false;
      merged.features.aiImage = false;
      merged.features.aiPresentation = false;
      merged.features.aiVoiceTranscription = false;
    }

    if (merged.features && merged.features.telemetry === true) {
      try {
        await audit(Number(u.userId || 0), "ui_config", "crm_ui", null, { role, aiEnabled: merged.aiEnabled }, req.ip);
      } catch {}
    }

    res.json(merged);
  });

  r.post("/ui/event", requireCrmAuth, async (req, res) => {
    const u = (req as any).crmUser;
    const name = clampText(req.body?.name, 80);
    const module = clampText(req.body?.module, 80);
    const metaRaw = req.body?.meta ?? null;
    const meta = metaRaw && typeof metaRaw === "object" ? metaRaw : null;
    if (!name) return res.status(400).json({ error: "Nome do evento obrigatório" });

    const rl = consumeRateLimit(`ui_event:${u.userId}`, 120, 60_000);
    if (!rl.ok) return res.status(429).json({ error: "Muitas requisições" });

    try {
      await audit(Number(u.userId || 0), "ui_event", "crm_ui", null, { name, module, meta }, req.ip);
    } catch {}
    res.json({ ok: true });
  });

  r.get("/metrics/overview", requireCrmAdmin, async (req, res) => {
    const u = (req as any).crmUser;
    const daysRaw = req.query?.days != null ? String(req.query.days) : "7";
    const daysNum = Math.max(1, Math.min(90, parseInt(daysRaw, 10) || 7));
    const start = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
    const startSql = start.toISOString().slice(0, 19).replace("T", " ");

    const maxRows = 20000;
    const rows = await db<{ action: string; created_at: string; details: string | null }>(
      "SELECT action, created_at, details FROM crm_auditoria WHERE created_at >= ? AND action IN ('ui_event','ai_form_assist','ai_sentiment','ai_rewrite','ai_presentation','ai_extract_image','ai_transcribe') ORDER BY created_at DESC LIMIT ?",
      [startSql, maxRows]
    );

    const uiByVariant: Record<string, Record<string, number>> = {};
    const uiByEvent: Record<string, number> = {};
    const uiByModule: Record<string, number> = {};
    const uiDaily: Record<string, number> = {};

    const aiByAction: Record<string, number> = {};
    const aiDaily: Record<string, number> = {};

    const inc = (obj: any, key: string, n = 1) => {
      obj[key] = (obj[key] || 0) + n;
    };
    const getDay = (createdAt: any) => {
      const s = String(createdAt || "");
      return s.includes("T") ? s.split("T")[0] : s.split(" ")[0];
    };

    for (const r0 of rows) {
      const action = String(r0.action || "");
      const day = getDay(r0.created_at);
      const details = r0.details ? jsonTryParse(r0.details) : null;

      if (action === "ui_event") {
        const name = details && details.name != null ? String(details.name) : "unknown";
        const module = details && details.module != null ? String(details.module) : "unknown";
        const meta = details && details.meta && typeof details.meta === "object" ? details.meta : null;
        const variant = meta && meta.exp_aiPanels != null ? String(meta.exp_aiPanels) : "unknown";

        inc(uiDaily, day);
        inc(uiByEvent, name);
        inc(uiByModule, module);
        uiByVariant[variant] = uiByVariant[variant] || {};
        inc(uiByVariant[variant], name);
        continue;
      }

      if (action.startsWith("ai_")) {
        inc(aiDaily, day);
        inc(aiByAction, action);
        continue;
      }
    }

    await audit(Number(u.userId || 0), "metrics_overview", "crm_metrics", null, { days: daysNum }, req.ip);

    res.json({
      range: { days: daysNum, start: start.toISOString() },
      ui: { byVariant: uiByVariant, byEvent: uiByEvent, byModule: uiByModule, daily: uiDaily },
      ai: { byAction: aiByAction, daily: aiDaily },
      limits: { maxRows },
    });
  });

  // ── IA (Forms & Conteúdo) ───────────────────────────────────────────────────
  r.post("/ai/form-assist", requireCrmAuth, async (req, res) => {
    if (!aiEnabled()) return res.status(503).json({ error: "IA não configurada no servidor" });
    const u = (req as any).crmUser;
    const rl = consumeRateLimit(`ai_form_assist:${u.userId}`, 20, 60_000);
    if (!rl.ok) return res.status(429).json({ error: "Muitas requisições" });
    const formType = clampText(req.body?.formType, 40) || "generic";
    const dataRaw = req.body?.data ?? {};
    const data = typeof dataRaw === "object" && dataRaw ? dataRaw : {};
    const payloadForModel = clampText(data, 12000);

    try {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente de CRM focado em preenchimento de formulários. Gere sugestões de preenchimento e validações sem inventar dados pessoais. Se não houver informação suficiente, deixe o campo em branco. Seja conciso. Retorne apenas JSON no schema pedido.",
          },
          {
            role: "user",
            content: `Tipo de formulário: ${formType}\n\nDados atuais (JSON):\n${payloadForModel}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "FormAssistResult",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                autofill: {
                  type: "object",
                  additionalProperties: { type: ["string", "null"] },
                },
                validations: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      field: { type: "string" },
                      severity: { type: "string", enum: ["info", "warning", "error"] },
                      message: { type: "string" },
                      suggestion: { type: ["string", "null"] },
                    },
                    required: ["field", "severity", "message"],
                  },
                },
                contentSuggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      field: { type: "string" },
                      suggestion: { type: "string" },
                    },
                    required: ["field", "suggestion"],
                  },
                },
                inferred: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    temperatura: { type: ["string", "null"], enum: ["frio", "morno", "quente", null] },
                    status: { type: ["string", "null"] },
                  },
                },
              },
              required: ["summary", "autofill", "validations", "contentSuggestions"],
            },
            strict: true,
          },
        },
      });

      const content = result?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      await audit(u.userId, "ai_form_assist", "crm_ai", null, { formType, keys: Object.keys(data || {}).slice(0, 40) }, req.ip);
      res.json(parsed);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao gerar sugestões" });
    }
  });

  r.post("/ai/sentiment", requireCrmAuth, async (req, res) => {
    if (!aiEnabled()) return res.status(503).json({ error: "IA não configurada no servidor" });
    const u = (req as any).crmUser;
    const rl = consumeRateLimit(`ai_sentiment:${u.userId}`, 30, 60_000);
    if (!rl.ok) return res.status(429).json({ error: "Muitas requisições" });
    const text = clampText(req.body?.text, 6000);
    if (!text) return res.status(400).json({ error: "Texto obrigatório" });

    try {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Classifique sentimento e riscos em texto de CRM (pt-BR). Não repita o texto original. Retorne apenas JSON no schema pedido.",
          },
          { role: "user", content: text },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "SentimentResult",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                sentiment: { type: "string", enum: ["positivo", "neutro", "negativo"] },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                flags: { type: "array", items: { type: "string" } },
                suggestions: { type: "array", items: { type: "string" } },
              },
              required: ["sentiment", "confidence", "flags", "suggestions"],
            },
            strict: true,
          },
        },
      });

      const content = result?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      await audit(u.userId, "ai_sentiment", "crm_ai", null, { len: text.length }, req.ip);
      res.json(parsed);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao analisar sentimento" });
    }
  });

  r.post("/ai/rewrite", requireCrmAuth, async (req, res) => {
    if (!aiEnabled()) return res.status(503).json({ error: "IA não configurada no servidor" });
    const u = (req as any).crmUser;
    const rl = consumeRateLimit(`ai_rewrite:${u.userId}`, 20, 60_000);
    if (!rl.ok) return res.status(429).json({ error: "Muitas requisições" });
    const text = clampText(req.body?.text, 8000);
    const instruction = clampText(req.body?.instruction, 240) || "Melhorar clareza e objetividade mantendo o sentido.";
    const tone = clampText(req.body?.tone, 40) || "profissional";
    if (!text) return res.status(400).json({ error: "Texto obrigatório" });

    try {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você reescreve textos de CRM (pt-BR). Preserve significado, não adicione dados pessoais novos e evite promessas. Retorne apenas JSON no schema pedido.",
          },
          {
            role: "user",
            content: `Tom: ${tone}\nInstrução: ${instruction}\n\nTexto:\n${text}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "RewriteResult",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                summary: { type: "string" },
              },
              required: ["text", "summary"],
            },
            strict: true,
          },
        },
      });

      const content = result?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      await audit(u.userId, "ai_rewrite", "crm_ai", null, { tone }, req.ip);
      res.json(parsed);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao reescrever" });
    }
  });

  r.post("/ai/transcribe", requireCrmAuth, async (req, res) => {
    if (!aiEnabled()) return res.status(503).json({ error: "IA não configurada no servidor" });
    const u = (req as any).crmUser;
    const rl = consumeRateLimit(`ai_transcribe:${u.userId}`, 6, 60_000);
    if (!rl.ok) return res.status(429).json({ error: "Muitas requisições" });

    const audioDataUrl = clampText(req.body?.audioDataUrl, 3_200_000);
    const language = clampText(req.body?.language, 10) || "pt";
    const prompt = clampText(req.body?.prompt, 240) || "Transcreva a fala do usuário para texto em pt-BR.";

    if (!audioDataUrl) return res.status(400).json({ error: "Áudio obrigatório" });
    if (!/^data:audio\/[a-z0-9.+-]+;base64,/i.test(audioDataUrl)) {
      return res.status(400).json({ error: "Formato de áudio inválido" });
    }

    const base64 = audioDataUrl.split("base64,").pop() || "";
    const base64Trim = base64.trim();
    if (!base64Trim) return res.status(400).json({ error: "Áudio inválido" });
    const padding = base64Trim.endsWith("==") ? 2 : base64Trim.endsWith("=") ? 1 : 0;
    const approxBytes = Math.max(0, Math.floor((base64Trim.length * 3) / 4) - padding);
    if (approxBytes > 2_000_000) return res.status(413).json({ error: "Áudio muito grande (máx. 2MB)" });

    try {
      const result = await transcribeAudio({ audioUrl: audioDataUrl, language, prompt });
      if ((result as any)?.error) {
        const err = result as any;
        const code = err.code || "SERVICE_ERROR";
        if (code === "FILE_TOO_LARGE") return res.status(413).json({ error: err.error || "Áudio muito grande" });
        if (code === "INVALID_FORMAT") return res.status(400).json({ error: err.error || "Formato inválido" });
        if (code === "TRANSCRIPTION_FAILED") return res.status(502).json({ error: err.error || "Falha na transcrição" });
        return res.status(503).json({ error: err.error || "Serviço indisponível" });
      }
      const payload = result as any;
      await audit(u.userId, "ai_transcribe", "crm_ai", null, { bytes: approxBytes, lang: payload.language || language }, req.ip);
      res.json({ text: payload.text || "", language: payload.language || language, duration: payload.duration ?? null });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao transcrever" });
    }
  });

  r.post("/ai/presentation", requireCrmAuth, async (req, res) => {
    if (!aiEnabled()) return res.status(503).json({ error: "IA não configurada no servidor" });
    const u = (req as any).crmUser;
    const rl = consumeRateLimit(`ai_presentation:${u.userId}`, 10, 60_000);
    if (!rl.ok) return res.status(429).json({ error: "Muitas requisições" });
    const context = clampText(req.body?.context, 12000);
    const audience = clampText(req.body?.audience, 80) || "Cliente";
    if (!context) return res.status(400).json({ error: "Contexto obrigatório" });

    try {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Gere uma apresentação curta e objetiva (pt-BR), com 6 a 10 slides. Retorne apenas JSON no schema pedido. Não inclua dados sensíveis além do que já foi fornecido.",
          },
          { role: "user", content: `Público: ${audience}\n\nContexto:\n${context}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "Presentation",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                slides: {
                  type: "array",
                  minItems: 3,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      bullets: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "bullets"],
                  },
                },
              },
              required: ["title", "slides"],
            },
            strict: true,
          },
        },
      });

      const content = result?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      const slides = Array.isArray((parsed as any)?.slides) ? (parsed as any).slides : [];
      const title = (parsed as any)?.title ? String((parsed as any).title) : "Apresentação";
      const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:24px;line-height:1.35}h1{margin:0 0 18px 0}section{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0}h2{margin:0 0 8px 0;font-size:18px}ul{margin:0;padding-left:18px}li{margin:4px 0}</style></head><body><h1>${title}</h1>${slides
        .map((s: any, idx: number) => {
          const st = s?.title ? String(s.title) : `Slide ${idx + 1}`;
          const bullets = Array.isArray(s?.bullets) ? s.bullets : [];
          return `<section><h2>${st}</h2><ul>${bullets.map((b: any) => `<li>${String(b)}</li>`).join("")}</ul></section>`;
        })
        .join("")}</body></html>`;
      await audit(u.userId, "ai_presentation", "crm_ai", null, { audience, slides: slides.length }, req.ip);
      res.json({ ...parsed, html });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao gerar apresentação" });
    }
  });

  r.post("/ai/extract-image", requireCrmAuth, async (req, res) => {
    if (!aiEnabled()) return res.status(503).json({ error: "IA não configurada no servidor" });
    const u = (req as any).crmUser;
    const rl = consumeRateLimit(`ai_extract_image:${u.userId}`, 8, 60_000);
    if (!rl.ok) return res.status(429).json({ error: "Muitas requisições" });
    const imageDataUrl = clampText(req.body?.imageDataUrl, 2_500_000);
    const purpose = clampText(req.body?.purpose, 40) || "business_card";
    if (!imageDataUrl) return res.status(400).json({ error: "Imagem obrigatória" });
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageDataUrl)) {
      return res.status(400).json({ error: "Formato de imagem inválido" });
    }

    try {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Extraia campos estruturados a partir de uma imagem. Não invente valores; use null quando não encontrar. Retorne apenas JSON no schema pedido.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Propósito: ${purpose}. Extraia nome, empresa, cargo, email, telefone, whatsapp, site.` },
              { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ExtractedFields",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                fields: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    nome: { type: ["string", "null"] },
                    empresa: { type: ["string", "null"] },
                    cargo: { type: ["string", "null"] },
                    email: { type: ["string", "null"] },
                    telefone: { type: ["string", "null"] },
                    whatsapp: { type: ["string", "null"] },
                    site: { type: ["string", "null"] },
                  },
                  required: ["nome", "empresa", "cargo", "email", "telefone", "whatsapp", "site"],
                },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                notes: { type: "string" },
              },
              required: ["fields", "confidence", "notes"],
            },
            strict: true,
          },
        },
      });

      const content = result?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      await audit(u.userId, "ai_extract_image", "crm_ai", null, { purpose }, req.ip);
      res.json(parsed);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao extrair dados da imagem" });
    }
  });

  r.post("/ai/extract-document", requireCrmAuth, async (req, res) => {
    if (!aiEnabled()) return res.status(503).json({ error: "IA não configurada no servidor" });
    const u = (req as any).crmUser;
    const rl = consumeRateLimit(`ai_extract_document:${u.userId}`, 8, 60_000);
    if (!rl.ok) return res.status(429).json({ error: "Muitas requisições" });

    const imageDataUrl = clampText(req.body?.imageDataUrl, 2_500_000);
    const docType = clampText(req.body?.docType, 40) || "cadastro";
    if (!imageDataUrl) return res.status(400).json({ error: "Imagem obrigatória" });
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(imageDataUrl)) {
      return res.status(400).json({ error: "Formato de imagem inválido" });
    }

    try {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Extraia dados de cadastro de empresa/endereço a partir de uma imagem (pt-BR). Não invente valores; use null quando não encontrar. Retorne apenas JSON no schema pedido.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Tipo de documento: ${docType}. Extraia documento (CNPJ/CPF), nome/razão social, email, telefone, CEP, endereço, bairro, cidade e estado (UF).` },
              { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ExtractDocumentFields",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                fields: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    documento: { type: ["string", "null"] },
                    nome: { type: ["string", "null"] },
                    email: { type: ["string", "null"] },
                    telefone: { type: ["string", "null"] },
                    cep: { type: ["string", "null"] },
                    endereco: { type: ["string", "null"] },
                    bairro: { type: ["string", "null"] },
                    cidade: { type: ["string", "null"] },
                    estado: { type: ["string", "null"] },
                  },
                  required: ["documento", "nome", "email", "telefone", "cep", "endereco", "bairro", "cidade", "estado"],
                },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                notes: { type: "string" },
              },
              required: ["fields", "confidence", "notes"],
            },
            strict: true,
          },
        },
      });

      const content = result?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      await audit(u.userId, "ai_extract_document", "crm_ai", null, { docType }, req.ip);
      res.json(parsed);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao extrair dados do documento" });
    }
  });



  // ─── Despesas (Transações) ────────────────────────────────────────────────────────────────
  r.get("/despesas", requireCrmAuth, async (req, res) => {
    try {
      const rows = await db(
        "SELECT * FROM crm_transacoes ORDER BY data DESC, created_at DESC"
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao listar despesas" });
    }
  });

  r.post("/despesas", requireCrmAuth, async (req, res) => {
    try {
      const {
        descricao, tipo, valor, status, centro_custo, data, observacoes,
        evento_id, cliente_id, recorrencia, recorrencia_qtd,
        comprovanteName, comprovanteMime, comprovanteDataBase64
      } = req.body;
      const userId = (req as any).user?.id;

      if (!descricao || !tipo || valor === undefined) {
        return res.status(400).json({ error: "Campos obrigatórios: descricao, tipo, valor" });
      }

      // Upload de comprovante (opcional) — mesma lógica de /contas-receber
      let comprovanteUrl: string | null = null;
      if (comprovanteDataBase64 && comprovanteName) {
        try {
          const buffer = Buffer.from(comprovanteDataBase64, 'base64');
          const fileName = `despesas/${Date.now()}-${comprovanteName}`;
          const { url } = await storagePut(fileName, buffer, comprovanteMime || 'application/octet-stream');
          comprovanteUrl = url;
        } catch (err) {
          console.warn('[CRM] Falha ao salvar comprovante de despesa em S3:', err);
        }
      }

      const result = await db(
        `INSERT INTO crm_transacoes (descricao, tipo, valor, status, centro_custo, data, observacoes, comprovante_url, evento_id, cliente_id, created_by, recorrencia, recorrencia_qtd)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          descricao, tipo, valor, status || "pendente",
          centro_custo || null, data || null, observacoes || null,
          comprovanteUrl,
          evento_id || null, cliente_id || null, userId || null,
          recorrencia || null, recorrencia_qtd || null
        ]
      );

      res.status(201).json({ id: (result as any).insertId, message: "Despesa criada com sucesso" });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao criar despesa" });
    }
  });

  r.put("/despesas/:id", requireCrmAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        descricao, tipo, valor, status, centro_custo, data, observacoes,
        evento_id, cliente_id,
        comprovanteName, comprovanteMime, comprovanteDataBase64
      } = req.body;

      const updates: string[] = [];
      const params: any[] = [];

      if (descricao !== undefined) { updates.push("descricao = ?"); params.push(descricao); }
      if (tipo !== undefined) { updates.push("tipo = ?"); params.push(tipo); }
      if (valor !== undefined) { updates.push("valor = ?"); params.push(valor); }
      if (status !== undefined) { updates.push("status = ?"); params.push(status); }
      if (centro_custo !== undefined) { updates.push("centro_custo = ?"); params.push(centro_custo); }
      if (data !== undefined) { updates.push("data = ?"); params.push(data); }
      if (observacoes !== undefined) { updates.push("observacoes = ?"); params.push(observacoes); }
      if (evento_id !== undefined) { updates.push("evento_id = ?"); params.push(evento_id); }
      if (cliente_id !== undefined) { updates.push("cliente_id = ?"); params.push(cliente_id); }

      // Upload de comprovante — só sobrescreve se um novo arquivo foi enviado
      if (comprovanteDataBase64 && comprovanteName) {
        try {
          const buffer = Buffer.from(comprovanteDataBase64, 'base64');
          const fileName = `despesas/${Date.now()}-${comprovanteName}`;
          const { url } = await storagePut(fileName, buffer, comprovanteMime || 'application/octet-stream');
          updates.push("comprovante_url = ?");
          params.push(url);
        } catch (err) {
          console.warn('[CRM] Falha ao salvar comprovante de despesa em S3:', err);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "Nenhum campo para atualizar" });
      }

      params.push(id);
      await db(`UPDATE crm_transacoes SET ${updates.join(", ")} WHERE id = ?`, params);

      res.json({ message: "Despesa atualizada com sucesso" });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao atualizar despesa" });
    }
  });

  r.delete("/despesas/:id", requireCrmAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await db("DELETE FROM crm_transacoes WHERE id = ?", [id]);
      res.json({ message: "Despesa deletada com sucesso" });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Falha ao deletar despesa" });
    }
  });

  // ── Comissões e Metas ───────────────────────────────────────────────────────
  // Helper: buscar regra de comissão ativa para um vendedor (ou regra global)
  async function getComissaoRegra(vendedorId: number, baseStatus: string) {
    // Tenta regra específica do vendedor primeiro, depois regra global (vendedor_id IS NULL)
    const regra = await dbOne<any>(
      "SELECT * FROM crm_comissao_regras WHERE (vendedor_id = ? OR vendedor_id IS NULL) AND base_status = ? ORDER BY vendedor_id DESC LIMIT 1",
      [vendedorId, baseStatus]
    );
    return regra || { base_percent: 0.03, bonus_percent: 0.05, bonus_threshold: 1.0 };
  }

  // GET /vendedor/performance — performance individual do vendedor logado
  r.get("/vendedor/performance", requireCrmAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const mes = safeInt(req.query.mes, new Date().getMonth() + 1, 1, 12);
      const ano = safeInt(req.query.ano, new Date().getFullYear(), 2020, 2100);
      const base = String(req.query.base_status || 'pagas').trim();
      const statusFilter = base === 'faturadas' ? ['pendente', 'pago'] : ['pago'];
      const placeholders = statusFilter.map(() => '?').join(',');
      // Vendas do período filtradas por status
      const [totRow] = await db<any>(
        `SELECT COALESCE(SUM(valor), 0) as total FROM crm_contas_receber
         WHERE MONTH(vencimento) = ? AND YEAR(vencimento) = ? AND status IN (${placeholders})`,
        [mes, ano, ...statusFilter]
      );
      const vendas_realizadas = Number(totRow?.total || 0);
      // Meta do vendedor para o período
      const metaRow = await dbOne<any>(
        "SELECT valor_meta FROM crm_metas WHERE vendedor_id = ? AND ((tipo='mensal' AND mes_ref=? AND ano_ref=?) OR (tipo='anual' AND ano_ref=? AND mes_ref=0)) ORDER BY tipo ASC LIMIT 1",
        [u.userId, mes, ano, ano]
      );
      const meta_mensal = Number(metaRow?.valor_meta || 0);
      const atingimento_percent = meta_mensal > 0 ? Math.round((vendas_realizadas / meta_mensal) * 100) : null;
      const regra = await getComissaoRegra(u.userId, base === 'faturadas' ? 'faturadas' : 'pagas');
      const rate = atingimento_percent != null && atingimento_percent >= Number(regra.bonus_threshold) * 100
        ? Number(regra.bonus_percent)
        : Number(regra.base_percent);
      res.json({ meta_mensal, vendas_realizadas, atingimento_percent, taxa_comissao: rate });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Falha ao calcular performance' });
    }
  });

  // GET /vendedor/comissoes — extrato de comissões do vendedor logado
  r.get("/vendedor/comissoes", requireCrmAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const mes = safeInt(req.query.mes, new Date().getMonth() + 1, 1, 12);
      const ano = safeInt(req.query.ano, new Date().getFullYear(), 2020, 2100);
      const base = String(req.query.base_status || 'pagas').trim();
      const statusFilter = base === 'faturadas' ? ['pendente', 'pago'] : ['pago'];
      const placeholders = statusFilter.map(() => '?').join(',');
      const rows = await db<any>(
        `SELECT cr.id, cr.descricao, cr.centro_custo, cr.status, cr.valor,
                COALESCE(c.nome, '') as cliente_nome
         FROM crm_contas_receber cr
         LEFT JOIN crm_clientes c ON cr.cliente_id = c.id
         WHERE MONTH(cr.vencimento) = ? AND YEAR(cr.vencimento) = ? AND cr.status IN (${placeholders})
         ORDER BY cr.vencimento ASC`,
        [mes, ano, ...statusFilter]
      );
      const regra = await getComissaoRegra(u.userId, base === 'faturadas' ? 'faturadas' : 'pagas');
      // Calcular atingimento para determinar taxa
      const [totRow] = await db<any>(
        `SELECT COALESCE(SUM(valor), 0) as total FROM crm_contas_receber
         WHERE MONTH(vencimento) = ? AND YEAR(vencimento) = ? AND status IN (${placeholders})`,
        [mes, ano, ...statusFilter]
      );
      const vendas_total = Number(totRow?.total || 0);
      const metaRow = await dbOne<any>(
        "SELECT valor_meta FROM crm_metas WHERE vendedor_id = ? AND ((tipo='mensal' AND mes_ref=? AND ano_ref=?) OR (tipo='anual' AND ano_ref=? AND mes_ref=0)) ORDER BY tipo ASC LIMIT 1",
        [u.userId, mes, ano, ano]
      );
      const meta = Number(metaRow?.valor_meta || 0);
      const atingimento = meta > 0 ? vendas_total / meta : 0;
      const rate = atingimento >= Number(regra.bonus_threshold)
        ? Number(regra.bonus_percent)
        : Number(regra.base_percent);
      const items = rows.map((r: any) => ({
        ...r,
        comissao: Number(r.valor) * rate,
        taxa: rate
      }));
      const total_comissao = items.reduce((s: number, i: any) => s + i.comissao, 0);
      res.json({ items, total_comissao, taxa_aplicada: rate });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Falha ao calcular comissões' });
    }
  });

  // GET /metas/dashboard — painel de metas da equipe (admin/gerente)
  r.get("/metas/dashboard", requireCrmAuth, async (req, res) => {
    try {
      const mes = safeInt(req.query.mes, new Date().getMonth() + 1, 1, 12);
      const ano = safeInt(req.query.ano, new Date().getFullYear(), 2020, 2100);
      const base = String(req.query.base_status || 'pagas').trim();
      const statusFilter = base === 'faturadas' ? ['pendente', 'pago'] : ['pago'];
      const placeholders = statusFilter.map(() => '?').join(',');
      // Todos os vendedores
      const vendedores = await db<any>("SELECT id, name, email FROM crm_users WHERE role='vendedor' ORDER BY name ASC", []);
      // Vendas totais do período
      const [totRow] = await db<any>(
        `SELECT COALESCE(SUM(valor), 0) as total FROM crm_contas_receber
         WHERE MONTH(vencimento) = ? AND YEAR(vencimento) = ? AND status IN (${placeholders})`,
        [mes, ano, ...statusFilter]
      );
      const vendas_total = Number(totRow?.total || 0);
      // Montar dados por vendedor
      const team = await Promise.all(vendedores.map(async (v: any) => {
        const metaRow = await dbOne<any>(
          "SELECT valor_meta FROM crm_metas WHERE vendedor_id = ? AND ((tipo='mensal' AND mes_ref=? AND ano_ref=?) OR (tipo='anual' AND ano_ref=? AND mes_ref=0)) ORDER BY tipo ASC LIMIT 1",
          [v.id, mes, ano, ano]
        );
        const meta = Number(metaRow?.valor_meta || 0);
        const atingimento_percent = meta > 0 ? Math.round((vendas_total / meta) * 100) : null;
        return { id: v.id, nome: v.name, email: v.email, meta_mensal: meta, vendas_realizadas: vendas_total, atingimento_percent };
      }));
      res.json({ team, vendas_total });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Falha ao carregar dashboard de metas' });
    }
  });

  // POST /metas — salvar/atualizar meta de vendedor
  r.post("/metas", requireCrmAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const { vendedor_id, mes_ref, ano_ref, valor_meta, tipo = 'mensal' } = req.body;
      if (!vendedor_id || !ano_ref || valor_meta == null) return res.status(400).json({ error: 'vendedor_id, ano_ref e valor_meta são obrigatórios' });
      const vid = parseInt(vendedor_id, 10);
      const ano = parseInt(ano_ref, 10);
      const mes = tipo === 'anual' ? 0 : safeInt(mes_ref, new Date().getMonth() + 1, 0, 12);
      const val = Number(valor_meta);
      if (!Number.isFinite(vid) || !Number.isFinite(ano) || !Number.isFinite(val)) return res.status(400).json({ error: 'Valores inválidos' });
      // Upsert
      await db(
        "INSERT INTO crm_metas (vendedor_id, ano_ref, mes_ref, valor_meta, tipo) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE valor_meta=VALUES(valor_meta), tipo=VALUES(tipo)",
        [vid, ano, mes, val, tipo]
      );
      await audit(u.userId, 'update', 'crm_metas', vid, { ano_ref: ano, mes_ref: mes, valor_meta: val, tipo }, req.ip);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Falha ao salvar meta' });
    }
  });

  // GET /admin/comissao-regras — listar regras de comissão
  r.get("/admin/comissao-regras", requireCrmAuth, async (req, res) => {
    try {
      const rows = await db<any>(
        "SELECT cr.*, u.name as vendedor_nome FROM crm_comissao_regras cr LEFT JOIN crm_users u ON cr.vendedor_id = u.id ORDER BY cr.vendedor_id ASC",
        []
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Falha ao listar regras' });
    }
  });

  // POST /admin/comissao-regras — criar regra de comissão
  r.post("/admin/comissao-regras", requireCrmAdmin, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const { vendedor_id, base_percent, bonus_percent, bonus_threshold, base_status = 'pagas' } = req.body;
      const bp = Number(base_percent || 0.03);
      const bonp = Number(bonus_percent || 0.05);
      const bont = Number(bonus_threshold || 1.0);
      const vid = vendedor_id ? parseInt(vendedor_id, 10) : null;
      const [result] = await getPool().execute(
        "INSERT INTO crm_comissao_regras (vendedor_id, base_percent, bonus_percent, bonus_threshold, base_status) VALUES (?,?,?,?,?)",
        [vid, bp, bonp, bont, base_status]
      );
      const id = (result as any).insertId;
      await audit(u.userId, 'create', 'crm_comissao_regras', id, req.body, req.ip);
      res.json({ id, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Falha ao criar regra' });
    }
  });

  // DELETE /admin/comissao-regras/:id — excluir regra de comissão
  r.delete("/admin/comissao-regras/:id", requireCrmAdmin, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const id = safeInt(req.params.id, 0, 1, 999999);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      await db("DELETE FROM crm_comissao_regras WHERE id = ?", [id]);
      await audit(u.userId, 'delete', 'crm_comissao_regras', id, {}, req.ip);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Falha ao excluir regra' });
    }
  });

  // Registrar todas as rotas CRM sob /api/crm
  app.use("/api/crm", r);
}
