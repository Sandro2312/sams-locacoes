import express from "express";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { ENV } from "./_core/env";

let _pool: mysql.Pool | null = null;
function getPool() {
  if (!_pool) _pool = mysql.createPool(ENV.databaseUrl);
  return _pool;
}

const db = async (sql: string, params: any[] = []) => {
  const [rows] = await getPool().execute(sql, params);
  return rows as any[];
};

async function getSession(token: string) {
  if (!token) return null;
  const now = Date.now();
  const rows = await db(
    "SELECT s.*, u.id as userId, u.name, u.email, u.role FROM crm_sessions s JOIN crm_users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ?",
    [token, now]
  );
  return rows[0] || null;
}

function requireAuth(req: any, res: any, next: any) {
  const token = req.cookies?.crm_session || req.headers["x-crm-token"];
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSession(token).then((user) => {
    if (!user) return res.status(401).json({ error: "Sessão inválida" });
    req.crmUser = user;
    next();
  }).catch(() => res.status(401).json({ error: "Erro de autenticação" }));
}

function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, () => {
    if (req.crmUser.role !== "admin" && req.crmUser.role !== "manager") {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  });
}

export function registerCrmAdminRoutes(app: any) {
  const r = express.Router();
  r.use(express.json({ limit: "10mb" }));

  // ── Admin: Usuários ──────────────────────────────────────────────────────────
  r.get("/users", requireAdmin, async (_req, res) => {
    try {
      const rows = await db(
        "SELECT id, name, email, role, active, last_login, created_at FROM crm_users ORDER BY name ASC"
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  r.post("/users", requireAdmin, async (req, res) => {
    try {
      const { name, email, password, role = "vendedor", active = 1, permissions } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: "Nome, email e senha obrigatórios" });
      // Verificar email duplicado
      const existing = await db("SELECT id, active FROM crm_users WHERE email = ?", [email.trim().toLowerCase()]);
      if (existing.length > 0) return res.status(409).json({ error: "Email já cadastrado" });
      const hash = await bcrypt.hash(password, 10);
      const permJson = permissions ? JSON.stringify(permissions) : null;
      const [result] = await getPool().execute(
        "INSERT INTO crm_users (name, email, password, role, active, permissions_json) VALUES (?,?,?,?,?,?)",
        [name, email.trim().toLowerCase(), hash, role, active, permJson]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  r.put("/users/:id", requireAdmin, async (req, res) => {
    try {
      const { name, email, role, active, password, permissions } = req.body;
      const updates: string[] = [];
      const params: any[] = [];
      if (name !== undefined) { updates.push("name=?"); params.push(name); }
      if (email !== undefined) { updates.push("email=?"); params.push(email.trim().toLowerCase()); }
      if (role !== undefined) { updates.push("role=?"); params.push(role); }
      if (active !== undefined) { updates.push("active=?"); params.push(active); }
      if (permissions !== undefined) { updates.push("permissions_json=?"); params.push(JSON.stringify(permissions)); }
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        updates.push("password=?");
        params.push(hash);
      }
      if (updates.length === 0) return res.json({ ok: true });
      params.push(req.params.id);
      await db(`UPDATE crm_users SET ${updates.join(",")} WHERE id=?`, params);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  r.delete("/users/:id", requireAdmin, async (req, res) => {
    try {
      await db("DELETE FROM crm_users WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  r.patch("/users/:id/deactivate", requireAdmin, async (req, res) => {
    try {
      await db("UPDATE crm_users SET active=0 WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Admin: Auditoria ─────────────────────────────────────────────────────────
  r.get("/auditoria", requireAdmin, async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query as any;
      const rows = await db(
        "SELECT a.*, u.name as user_nome FROM crm_auditoria a LEFT JOIN crm_users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?",
        [parseInt(limit), parseInt(offset)]
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Admin: Settings ──────────────────────────────────────────────────────────
  r.get("/settings", requireAdmin, async (_req, res) => {
    try {
      const rows = await db("SELECT chave, valor FROM crm_settings");
      const settings: Record<string, any> = {};
      rows.forEach((r: any) => {
        try { settings[r.chave] = JSON.parse(r.valor); } catch { settings[r.chave] = r.valor; }
      });
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  r.put("/settings", requireAdmin, async (req, res) => {
    try {
      const entries = Object.entries(req.body);
      for (const [chave, valor] of entries) {
        const valorStr = typeof valor === "string" ? valor : JSON.stringify(valor);
        await getPool().execute(
          "INSERT INTO crm_settings (chave, valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=?",
          [chave, valorStr, valorStr]
        );
      }
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Admin: Comissão Regras ───────────────────────────────────────────────────
  r.get("/comissao-regras", requireAdmin, async (_req, res) => {
    try {
      const rows = await db("SELECT * FROM crm_comissao_regras WHERE ativo=1 ORDER BY nome ASC");
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  r.post("/comissao-regras", requireAdmin, async (req, res) => {
    try {
      const { nome, tipo, percentual, valor_fixo, condicoes } = req.body;
      const [result] = await getPool().execute(
        "INSERT INTO crm_comissao_regras (nome, tipo, percentual, valor_fixo, condicoes) VALUES (?,?,?,?,?)",
        [nome, tipo, percentual || 0, valor_fixo || 0, condicoes ? JSON.stringify(condicoes) : null]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  r.put("/comissao-regras/:id", requireAdmin, async (req, res) => {
    try {
      const { nome, tipo, percentual, valor_fixo, condicoes } = req.body;
      await db(
        "UPDATE crm_comissao_regras SET nome=?, tipo=?, percentual=?, valor_fixo=?, condicoes=? WHERE id=?",
        [nome, tipo, percentual || 0, valor_fixo || 0, condicoes ? JSON.stringify(condicoes) : null, req.params.id]
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  r.delete("/comissao-regras/:id", requireAdmin, async (req, res) => {
    try {
      await db("UPDATE crm_comissao_regras SET ativo=0 WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/api/admin", r);

  // ── CRM: Transações (Financeiro) ─────────────────────────────────────────────
  const rt = express.Router();
  rt.use(express.json({ limit: "10mb" }));

  rt.get("/", requireAuth, async (req, res) => {
    try {
      const { tipo, status, ano, mes } = req.query as any;
      let sql = "SELECT t.*, c.nome as cliente_nome, e.nome as evento_nome FROM crm_transacoes t LEFT JOIN crm_clientes c ON t.cliente_id = c.id LEFT JOIN crm_eventos e ON t.evento_id = e.id WHERE 1=1";
      const params: any[] = [];
      if (tipo) { sql += " AND t.tipo=?"; params.push(tipo); }
      if (status) { sql += " AND t.status=?"; params.push(status); }
      if (ano) { sql += " AND YEAR(t.data)=?"; params.push(parseInt(ano)); }
      if (mes) { sql += " AND MONTH(t.data)=?"; params.push(parseInt(mes)); }
      sql += " ORDER BY t.data DESC, t.created_at DESC LIMIT 500";
      const rows = await db(sql, params);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rt.post("/", requireAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const { descricao, tipo, valor, status = "pendente", centro_custo, data, observacoes, evento_id, cliente_id, recorrencia, recorrencia_grupo_id, recorrencia_indice } = req.body;
      if (!descricao || !tipo || valor === undefined) return res.status(400).json({ error: "Campos obrigatórios: descricao, tipo, valor" });
      const [result] = await getPool().execute(
        "INSERT INTO crm_transacoes (descricao, tipo, valor, status, centro_custo, data, observacoes, evento_id, cliente_id, created_by, recorrencia, recorrencia_grupo_id, recorrencia_indice) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [descricao, tipo, parseFloat(valor), status, centro_custo || null, data || null, observacoes || null, evento_id || null, cliente_id || null, u.userId, recorrencia || null, recorrencia_grupo_id || null, recorrencia_indice || null]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rt.put("/:id", requireAuth, async (req, res) => {
    try {
      const { descricao, tipo, valor, status, centro_custo, data, observacoes, evento_id, cliente_id } = req.body;
      await db(
        "UPDATE crm_transacoes SET descricao=?, tipo=?, valor=?, status=?, centro_custo=?, data=?, observacoes=?, evento_id=?, cliente_id=? WHERE id=?",
        [descricao, tipo, parseFloat(valor), status, centro_custo || null, data || null, observacoes || null, evento_id || null, cliente_id || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rt.delete("/:id", requireAuth, async (req, res) => {
    try {
      await db("DELETE FROM crm_transacoes WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/api/crm/transacoes", rt);

  // ── CRM: Tarefas ─────────────────────────────────────────────────────────────
  const rtarefas = express.Router();
  rtarefas.use(express.json({ limit: "10mb" }));

  rtarefas.get("/", requireAuth, async (req, res) => {
    try {
      const { status, responsavel_id } = req.query as any;
      let sql = "SELECT t.*, u.name as responsavel_nome, c.nome as cliente_nome FROM crm_tarefas t LEFT JOIN crm_users u ON t.responsavel_id = u.id LEFT JOIN crm_clientes c ON t.cliente_id = c.id WHERE 1=1";
      const params: any[] = [];
      if (status) { sql += " AND t.status=?"; params.push(status); }
      if (responsavel_id) { sql += " AND t.responsavel_id=?"; params.push(responsavel_id); }
      sql += " ORDER BY t.data_vencimento ASC, t.created_at DESC LIMIT 200";
      const rows = await db(sql, params);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rtarefas.post("/", requireAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const { titulo, descricao, status = "pendente", prioridade = "media", responsavel_id, evento_id, cliente_id, data_vencimento } = req.body;
      if (!titulo) return res.status(400).json({ error: "Título obrigatório" });
      const [result] = await getPool().execute(
        "INSERT INTO crm_tarefas (titulo, descricao, status, prioridade, responsavel_id, evento_id, cliente_id, data_vencimento, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
        [titulo, descricao || null, status, prioridade, responsavel_id || null, evento_id || null, cliente_id || null, data_vencimento || null, u.userId]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rtarefas.put("/:id", requireAuth, async (req, res) => {
    try {
      const { titulo, descricao, status, prioridade, responsavel_id, evento_id, cliente_id, data_vencimento } = req.body;
      await db(
        "UPDATE crm_tarefas SET titulo=?, descricao=?, status=?, prioridade=?, responsavel_id=?, evento_id=?, cliente_id=?, data_vencimento=? WHERE id=?",
        [titulo, descricao || null, status, prioridade, responsavel_id || null, evento_id || null, cliente_id || null, data_vencimento || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rtarefas.delete("/:id", requireAuth, async (req, res) => {
    try {
      await db("DELETE FROM crm_tarefas WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/api/crm/tarefas-admin", rtarefas);
  app.use("/api/tarefas-admin", rtarefas); // alias para compatibilidade

  // ── CRM: Contatos ─────────────────────────────────────────────────────────────
  const rcontatos = express.Router();
  rcontatos.use(express.json());

  rcontatos.get("/", requireAuth, async (req, res) => {
    try {
      const { cliente_id } = req.query as any;
      let sql = "SELECT * FROM crm_contatos WHERE 1=1";
      const params: any[] = [];
      if (cliente_id) { sql += " AND cliente_id=?"; params.push(cliente_id); }
      sql += " ORDER BY nome ASC";
      const rows = await db(sql, params);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rcontatos.post("/", requireAuth, async (req, res) => {
    try {
      const { nome, email, telefone, cargo, empresa, cliente_id, observacoes } = req.body;
      if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
      const [result] = await getPool().execute(
        "INSERT INTO crm_contatos (nome, email, telefone, cargo, empresa, cliente_id, observacoes) VALUES (?,?,?,?,?,?,?)",
        [nome, email || null, telefone || null, cargo || null, empresa || null, cliente_id || null, observacoes || null]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rcontatos.put("/:id", requireAuth, async (req, res) => {
    try {
      const { nome, email, telefone, cargo, empresa, cliente_id, observacoes } = req.body;
      await db(
        "UPDATE crm_contatos SET nome=?, email=?, telefone=?, cargo=?, empresa=?, cliente_id=?, observacoes=? WHERE id=?",
        [nome, email || null, telefone || null, cargo || null, empresa || null, cliente_id || null, observacoes || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rcontatos.delete("/:id", requireAuth, async (req, res) => {
    try {
      await db("DELETE FROM crm_contatos WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/api/crm/contatos", rcontatos);

  // ── CRM: Projetos ─────────────────────────────────────────────────────────────
  const rprojetos = express.Router();
  rprojetos.use(express.json({ limit: "10mb" }));

  rprojetos.get("/", requireAuth, async (_req, res) => {
    try {
      const rows = await db(
        "SELECT p.*, c.nome as cliente_nome, e.nome as evento_nome, u.name as responsavel_nome FROM crm_projetos p LEFT JOIN crm_clientes c ON p.cliente_id = c.id LEFT JOIN crm_eventos e ON p.evento_id = e.id LEFT JOIN crm_users u ON p.responsavel_id = u.id ORDER BY p.created_at DESC"
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rprojetos.get("/:id", requireAuth, async (req, res) => {
    try {
      const rows = await db("SELECT * FROM crm_projetos WHERE id=?", [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Projeto não encontrado" });
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rprojetos.post("/", requireAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const { titulo, descricao, status = "em_andamento", cliente_id, evento_id, data_inicio, data_fim, valor, responsavel_id } = req.body;
      if (!titulo) return res.status(400).json({ error: "Título obrigatório" });
      const [result] = await getPool().execute(
        "INSERT INTO crm_projetos (titulo, descricao, status, cliente_id, evento_id, data_inicio, data_fim, valor, responsavel_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [titulo, descricao || null, status, cliente_id || null, evento_id || null, data_inicio || null, data_fim || null, valor || null, responsavel_id || null, u.userId]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rprojetos.put("/:id", requireAuth, async (req, res) => {
    try {
      const { titulo, descricao, status, cliente_id, evento_id, data_inicio, data_fim, valor, responsavel_id } = req.body;
      await db(
        "UPDATE crm_projetos SET titulo=?, descricao=?, status=?, cliente_id=?, evento_id=?, data_inicio=?, data_fim=?, valor=?, responsavel_id=? WHERE id=?",
        [titulo, descricao || null, status, cliente_id || null, evento_id || null, data_inicio || null, data_fim || null, valor || null, responsavel_id || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rprojetos.post("/:id/duplicar", requireAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const rows = await db("SELECT * FROM crm_projetos WHERE id=?", [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Projeto não encontrado" });
      const orig = rows[0];
      const [result] = await getPool().execute(
        "INSERT INTO crm_projetos (titulo, descricao, status, cliente_id, evento_id, data_inicio, data_fim, valor, responsavel_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [`${orig.titulo} (cópia)`, orig.descricao, "em_andamento", orig.cliente_id, orig.evento_id, orig.data_inicio, orig.data_fim, orig.valor, orig.responsavel_id, u.userId]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rprojetos.delete("/:id", requireAuth, async (req, res) => {
    try {
      await db("DELETE FROM crm_projetos WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/api/crm/projetos", rprojetos);

  // ── CRM: Memoriais ────────────────────────────────────────────────────────────
  const rmemoriais = express.Router();
  rmemoriais.use(express.json({ limit: "10mb" }));

  rmemoriais.get("/", requireAuth, async (_req, res) => {
    try {
      const rows = await db(
        "SELECT m.*, c.nome as cliente_nome, e.nome as evento_nome FROM crm_memoriais m LEFT JOIN crm_clientes c ON m.cliente_id = c.id LEFT JOIN crm_eventos e ON m.evento_id = e.id ORDER BY m.created_at DESC"
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rmemoriais.get("/:id", requireAuth, async (req, res) => {
    try {
      const rows = await db("SELECT * FROM crm_memoriais WHERE id=?", [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Memorial não encontrado" });
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rmemoriais.post("/", requireAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const { titulo, conteudo, tipo, cliente_id, evento_id, projeto_id } = req.body;
      if (!titulo) return res.status(400).json({ error: "Título obrigatório" });
      const [result] = await getPool().execute(
        "INSERT INTO crm_memoriais (titulo, conteudo, tipo, cliente_id, evento_id, projeto_id, created_by) VALUES (?,?,?,?,?,?,?)",
        [titulo, conteudo || null, tipo || null, cliente_id || null, evento_id || null, projeto_id || null, u.userId]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rmemoriais.put("/:id", requireAuth, async (req, res) => {
    try {
      const { titulo, conteudo, tipo, cliente_id, evento_id, projeto_id } = req.body;
      await db(
        "UPDATE crm_memoriais SET titulo=?, conteudo=?, tipo=?, cliente_id=?, evento_id=?, projeto_id=? WHERE id=?",
        [titulo, conteudo || null, tipo || null, cliente_id || null, evento_id || null, projeto_id || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rmemoriais.post("/:id/duplicar", requireAuth, async (req, res) => {
    try {
      const u = (req as any).crmUser;
      const rows = await db("SELECT * FROM crm_memoriais WHERE id=?", [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Memorial não encontrado" });
      const orig = rows[0];
      const [result] = await getPool().execute(
        "INSERT INTO crm_memoriais (titulo, conteudo, tipo, cliente_id, evento_id, projeto_id, created_by) VALUES (?,?,?,?,?,?,?)",
        [`${orig.titulo} (cópia)`, orig.conteudo, orig.tipo, orig.cliente_id, orig.evento_id, orig.projeto_id, u.userId]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rmemoriais.delete("/:id", requireAuth, async (req, res) => {
    try {
      await db("DELETE FROM crm_memoriais WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/api/crm/memoriais", rmemoriais);

  // ── CRM: Metas ────────────────────────────────────────────────────────────────
  const rmetas = express.Router();
  rmetas.use(express.json());

  rmetas.get("/", requireAuth, async (req, res) => {
    try {
      const { ano, mes } = req.query as any;
      let sql = "SELECT m.*, u.name as user_nome FROM crm_metas m LEFT JOIN crm_users u ON m.user_id = u.id WHERE 1=1";
      const params: any[] = [];
      if (ano) { sql += " AND m.ano=?"; params.push(parseInt(ano)); }
      if (mes) { sql += " AND m.mes=?"; params.push(parseInt(mes)); }
      sql += " ORDER BY m.created_at DESC";
      const rows = await db(sql, params);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rmetas.post("/", requireAuth, async (req, res) => {
    try {
      const { titulo, tipo, valor_meta, periodo, ano, mes, user_id } = req.body;
      if (!titulo) return res.status(400).json({ error: "Título obrigatório" });
      const [result] = await getPool().execute(
        "INSERT INTO crm_metas (titulo, tipo, valor_meta, periodo, ano, mes, user_id) VALUES (?,?,?,?,?,?,?)",
        [titulo, tipo || null, valor_meta || 0, periodo || null, ano || null, mes || null, user_id || null]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rmetas.put("/:id", requireAuth, async (req, res) => {
    try {
      const { titulo, tipo, valor_meta, valor_atual, periodo, ano, mes, user_id } = req.body;
      await db(
        "UPDATE crm_metas SET titulo=?, tipo=?, valor_meta=?, valor_atual=?, periodo=?, ano=?, mes=?, user_id=? WHERE id=?",
        [titulo, tipo || null, valor_meta || 0, valor_atual || 0, periodo || null, ano || null, mes || null, user_id || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  rmetas.delete("/:id", requireAuth, async (req, res) => {
    try {
      await db("DELETE FROM crm_metas WHERE id=?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/api/crm/metas", rmetas);
  app.use("/api/metas", rmetas); // alias

  // ── CRM: Dashboard Comercial ──────────────────────────────────────────────────
  app.get("/api/comercial/dashboard", requireAuth, async (_req: any, res: any) => {
    try {
      const [leads] = await getPool().execute("SELECT COUNT(*) as total FROM crm_leads");
      const [clientes] = await getPool().execute("SELECT COUNT(*) as total FROM crm_clientes");
      const [eventos] = await getPool().execute("SELECT COUNT(*) as total FROM crm_eventos");
      const [receita] = await getPool().execute(
        "SELECT COALESCE(SUM(valor), 0) as total FROM crm_transacoes WHERE tipo IN ('receita','receber','contas a receber') AND YEAR(data) = YEAR(NOW())"
      );
      const [despesas] = await getPool().execute(
        "SELECT COALESCE(SUM(valor), 0) as total FROM crm_transacoes WHERE tipo IN ('despesa','pagar','contas a pagar') AND YEAR(data) = YEAR(NOW())"
      );
      res.json({
        leads: (leads as any[])[0].total,
        clientes: (clientes as any[])[0].total,
        eventos: (eventos as any[])[0].total,
        receita_ano: (receita as any[])[0].total,
        despesas_ano: (despesas as any[])[0].total,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── CRM: Settings Projetos ────────────────────────────────────────────────────
  app.get("/api/crm/settings/projetos", requireAuth, async (_req: any, res: any) => {
    try {
      const rows = await db("SELECT valor FROM crm_settings WHERE chave='projetos_config'");
      if (rows.length && rows[0].valor) {
        try { return res.json(JSON.parse(rows[0].valor)); } catch {}
      }
      res.json({ tipos: [], status: [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── CRM: Briefings extras ─────────────────────────────────────────────────────
  app.post("/api/crm/briefings/:id/duplicar", requireAuth, async (req: any, res: any) => {
    try {
      const u = req.crmUser;
      const rows = await db("SELECT * FROM crm_briefings WHERE id=?", [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Briefing não encontrado" });
      const orig = rows[0];
      const [result] = await getPool().execute(
        "INSERT INTO crm_briefings (cliente_id, evento_id, titulo, conteudo, status, created_by) VALUES (?,?,?,?,?,?)",
        [orig.cliente_id, orig.evento_id, `${orig.titulo || 'Briefing'} (cópia)`, orig.conteudo, "rascunho", u.userId]
      );
      res.json({ id: (result as any).insertId, ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/crm/briefings/:id/generate-html", requireAuth, async (req: any, res: any) => {
    try {
      const rows = await db("SELECT * FROM crm_briefings WHERE id=?", [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Briefing não encontrado" });
      const b = rows[0];
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${b.titulo || 'Briefing'}</title></head><body><h1>${b.titulo || 'Briefing'}</h1><div>${b.conteudo || ''}</div></body></html>`;
      res.json({ html });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── CRM: Contas a receber comprovante ─────────────────────────────────────────
  app.get("/api/crm/contas-receber/:id/comprovante", requireAuth, async (req: any, res: any) => {
    try {
      const rows = await db(
        "SELECT cr.*, c.nome as cliente_nome FROM crm_contas_receber cr LEFT JOIN crm_clientes c ON cr.cliente_id = c.id WHERE cr.id=?",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Conta não encontrada" });
      const cr = rows[0];
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprovante</title></head><body>
        <h1>Comprovante de Pagamento</h1>
        <p><strong>Cliente:</strong> ${cr.cliente_nome || '-'}</p>
        <p><strong>Descrição:</strong> ${cr.descricao || '-'}</p>
        <p><strong>Valor:</strong> R$ ${parseFloat(cr.valor || 0).toFixed(2)}</p>
        <p><strong>Status:</strong> ${cr.status || '-'}</p>
        <p><strong>Data:</strong> ${cr.data_vencimento || '-'}</p>
      </body></html>`;
      res.json({ html });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── CRM: Eventos import-url ───────────────────────────────────────────────────
  app.post("/api/crm/eventos/import-url", requireAuth, async (req: any, res: any) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL obrigatória" });
      // Retorna estrutura básica para o frontend processar
      res.json({ url, titulo: url, descricao: "", ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
