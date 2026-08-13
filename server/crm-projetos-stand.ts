import { Request, Response, Router } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };
const PROJECT_STATUSES = new Set(["planejado", "em_orcamento", "contratado", "em_producao", "em_montagem", "concluido", "cancelado"]);
const FINANCE_MANAGER_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"]);

let pool: mysql.Pool | null = null;
function getPool() {
  if (!pool) pool = mysql.createPool(ENV.databaseUrl);
  return pool;
}
async function db<T = any>(sql: string, params: any[] = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}
async function dbOne<T = any>(sql: string, params: any[] = []) {
  const rows = await db<T>(sql, params);
  return rows[0] ?? null;
}
function safeInt(value: unknown, defaultValue: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : defaultValue;
}
function text(value: unknown, max = 255) {
  return String(value ?? "").trim().slice(0, max);
}
function nullableText(value: unknown, max = 255) {
  const normalized = text(value, max);
  return normalized || null;
}
function getSessionToken(req: Request) {
  const cookie = parseCookieHeader(req.headers.cookie || "");
  const cookieToken = cookie.crm_session;
  const auth = String(req.headers.authorization || req.headers["x-crm-token"] || "").trim();
  const headerToken = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : auth;
  return cookieToken || headerToken || "";
}
function requireCrmAuth(req: Request, res: Response, next: () => void) {
  const token = getSessionToken(req);
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSessionFromCrm(token).then((session) => {
    if (!session) return res.status(401).json({ error: "Sessão expirada" });
    (req as any).crmUser = session;
    next();
  }).catch(() => res.status(500).json({ error: "Não foi possível validar a sessão" }));
}
function requireFinanceManager(req: Request, res: Response, next: () => void) {
  requireCrmAuth(req, res, () => {
    const role = String((req as any).crmUser?.role || "").trim().toLowerCase();
    if (!FINANCE_MANAGER_ROLES.has(role)) return res.status(403).json({ error: "Acesso restrito à gestão financeira" });
    next();
  });
}
async function audit(user: CrmSession, action: string, projectId: number | null, details: Record<string, unknown>) {
  try {
    await db(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
      [user.userId, action, "crm_projetos_stand", projectId, JSON.stringify(details), null],
    );
  } catch (error) {
    console.warn("[ProjetosStand] Falha não bloqueante ao registrar auditoria", error);
  }
}
async function validateRelations(eventoId: number, clienteId: number) {
  const [evento, cliente] = await Promise.all([
    dbOne<{ id: number }>("SELECT id FROM crm_eventos WHERE id = ?", [eventoId]),
    dbOne<{ id: number }>("SELECT id FROM crm_clientes WHERE id = ?", [clienteId]),
  ]);
  if (!evento) throw new Error("EVENTO_INVALIDO");
  if (!cliente) throw new Error("CLIENTE_INVALIDO");
}
function generatedCode(eventoId: number, clienteId: number) {
  return `PS-${eventoId}-${clienteId}-${Date.now().toString(36).toUpperCase()}`;
}

export function registerProjetosStandRoutes(app: any) {
  const r = Router();

  r.get("/", requireCrmAuth, async (req, res) => {
    try {
      const eventoId = safeInt(req.query.evento_id ?? req.query.eventoId, 0, 0, Number.MAX_SAFE_INTEGER);
      const clienteId = safeInt(req.query.cliente_id ?? req.query.clienteId, 0, 0, Number.MAX_SAFE_INTEGER);
      const status = text(req.query.status, 30).toLowerCase();
      const search = text(req.query.busca ?? req.query.q, 120);
      const limit = safeInt(req.query.limit, 50, 1, 100);
      const offset = safeInt(req.query.offset, 0, 0, 100000);
      const where: string[] = ["1=1"];
      const params: any[] = [];
      if (eventoId) { where.push("ps.evento_id = ?"); params.push(eventoId); }
      if (clienteId) { where.push("ps.cliente_id = ?"); params.push(clienteId); }
      if (status && PROJECT_STATUSES.has(status)) { where.push("ps.status = ?"); params.push(status); }
      if (search) {
        where.push("(ps.codigo LIKE ? OR ps.nome LIKE ? OR ps.referencia_stand LIKE ? OR c.nome LIKE ? OR e.nome LIKE ?)");
        const term = `%${search}%`;
        params.push(term, term, term, term, term);
      }
      const whereSql = where.join(" AND ");
      const data = await db<any>(
        `SELECT ps.*, e.nome AS evento_nome, c.nome AS cliente_nome,
                COALESCE((SELECT SUM(t.valor) FROM crm_transacoes t
                          WHERE t.projeto_stand_id = ps.id
                            AND LOWER(TRIM(COALESCE(t.tipo, ''))) IN ('despesa','pagar','contas a pagar')
                            AND LOWER(TRIM(COALESCE(t.status, ''))) <> 'cancelado'), 0) AS custos_diretos,
                COALESCE((SELECT SUM(cr.valor) FROM crm_contas_receber cr
                          WHERE cr.projeto_stand_id = ps.id
                            AND LOWER(TRIM(COALESCE(cr.status, ''))) <> 'cancelado'), 0) AS receitas_previstas
         FROM crm_projetos_stand ps
         JOIN crm_eventos e ON e.id = ps.evento_id
         JOIN crm_clientes c ON c.id = ps.cliente_id
         WHERE ${whereSql}
         ORDER BY e.nome ASC, c.nome ASC, ps.nome ASC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      );
      const count = await dbOne<{ total: number }>(
        `SELECT COUNT(*) AS total FROM crm_projetos_stand ps
         JOIN crm_eventos e ON e.id = ps.evento_id
         JOIN crm_clientes c ON c.id = ps.cliente_id
         WHERE ${whereSql}`,
        params,
      );
      res.json({ data, total: Number(count?.total || 0), limit, offset });
    } catch (error) {
      console.error("[ProjetosStand] erro ao listar", error);
      res.status(500).json({ error: "Não foi possível carregar os Projetos de Stand" });
    }
  });

  r.get("/:id/resumo", requireCrmAuth, async (req, res) => {
    try {
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const projeto = await dbOne<any>(
        `SELECT ps.*, e.nome AS evento_nome, c.nome AS cliente_nome
         FROM crm_projetos_stand ps
         JOIN crm_eventos e ON e.id = ps.evento_id
         JOIN crm_clientes c ON c.id = ps.cliente_id
         WHERE ps.id = ?`,
        [id],
      );
      if (!projeto) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      const [despesas, receitas] = await Promise.all([
        dbOne<any>(
          `SELECT COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) <> 'cancelado' THEN valor ELSE 0 END), 0) AS custos_registrados,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('pago','baixado') THEN valor ELSE 0 END), 0) AS custos_pagos,
                  COUNT(*) AS lancamentos
           FROM crm_transacoes
           WHERE projeto_stand_id = ? AND LOWER(TRIM(COALESCE(tipo, ''))) IN ('despesa','pagar','contas a pagar')`,
          [id],
        ),
        dbOne<any>(
          `SELECT COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) <> 'cancelado' THEN valor ELSE 0 END), 0) AS receita_faturada,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('pago','recebido','baixado') THEN COALESCE(valor_pago, valor) ELSE 0 END), 0) AS receita_recebida,
                  COUNT(*) AS parcelas
           FROM crm_contas_receber
           WHERE projeto_stand_id = ?`,
          [id],
        ),
      ]);
      const faturada = Number(receitas?.receita_faturada || 0);
      const custos = Number(despesas?.custos_registrados || 0);
      res.json({
        projeto,
        despesas: { ...despesas, custos_registrados: custos },
        receitas: { ...receitas, receita_faturada: faturada },
        resultado: {
          margem_direta: faturada - custos,
          margem_percentual: faturada > 0 ? ((faturada - custos) / faturada) * 100 : null,
          valor_em_aberto: faturada - Number(receitas?.receita_recebida || 0),
        },
      });
    } catch (error) {
      console.error("[ProjetosStand] erro ao resumir", error);
      res.status(500).json({ error: "Não foi possível calcular o resultado do stand" });
    }
  });

  r.post("/", requireFinanceManager, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const eventoId = safeInt(req.body.eventoId ?? req.body.evento_id, 0, 1, Number.MAX_SAFE_INTEGER);
      const clienteId = safeInt(req.body.clienteId ?? req.body.cliente_id, 0, 1, Number.MAX_SAFE_INTEGER);
      const nome = text(req.body.nome, 255);
      const status = text(req.body.status || "planejado", 30).toLowerCase();
      if (!eventoId || !clienteId || !nome) return res.status(400).json({ error: "Evento, cliente e nome do Projeto de Stand são obrigatórios" });
      if (!PROJECT_STATUSES.has(status)) return res.status(400).json({ error: "Status de Projeto de Stand inválido" });
      await validateRelations(eventoId, clienteId);
      const codigo = text(req.body.codigo, 60) || generatedCode(eventoId, clienteId);
      const [result] = await getPool().execute(
        `INSERT INTO crm_projetos_stand
         (codigo, evento_id, cliente_id, contrato_id, nome, referencia_stand, pavilhao, area_m2, centro_custo, status, observacoes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo, eventoId, clienteId,
          safeInt(req.body.contratoId ?? req.body.contrato_id, 0, 0, Number.MAX_SAFE_INTEGER) || null,
          nome, nullableText(req.body.referenciaStand ?? req.body.referencia_stand, 120),
          nullableText(req.body.pavilhao, 120), nullableText(req.body.areaM2 ?? req.body.area_m2, 30),
          nullableText(req.body.centroCusto ?? req.body.centro_custo, 150), status,
          nullableText(req.body.observacoes, 4000), user.userId,
        ],
      );
      const id = Number((result as any).insertId);
      await audit(user, "CREATE", id, { codigo, eventoId, clienteId, nome, status });
      res.status(201).json({ id, codigo, ok: true });
    } catch (error: any) {
      if (error?.message === "EVENTO_INVALIDO") return res.status(400).json({ error: "Evento selecionado não existe" });
      if (error?.message === "CLIENTE_INVALIDO") return res.status(400).json({ error: "Cliente selecionado não existe" });
      if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Já existe um Projeto de Stand com este código" });
      console.error("[ProjetosStand] erro ao criar", error);
      res.status(500).json({ error: "Não foi possível criar o Projeto de Stand" });
    }
  });

  r.put("/:id", requireFinanceManager, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const current = await dbOne<any>("SELECT * FROM crm_projetos_stand WHERE id = ?", [id]);
      if (!current) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      const eventoId = safeInt(req.body.eventoId ?? req.body.evento_id, current.evento_id, 1, Number.MAX_SAFE_INTEGER);
      const clienteId = safeInt(req.body.clienteId ?? req.body.cliente_id, current.cliente_id, 1, Number.MAX_SAFE_INTEGER);
      const nome = text(req.body.nome ?? current.nome, 255);
      const status = text(req.body.status ?? current.status, 30).toLowerCase();
      if (!nome || !PROJECT_STATUSES.has(status)) return res.status(400).json({ error: "Nome ou status inválido" });
      await validateRelations(eventoId, clienteId);
      const codigo = text(req.body.codigo ?? current.codigo, 60);
      await db(
        `UPDATE crm_projetos_stand
         SET codigo=?, evento_id=?, cliente_id=?, contrato_id=?, nome=?, referencia_stand=?, pavilhao=?, area_m2=?, centro_custo=?, status=?, observacoes=?
         WHERE id=?`,
        [
          codigo, eventoId, clienteId,
          safeInt(req.body.contratoId ?? req.body.contrato_id, Number(current.contrato_id || 0), 0, Number.MAX_SAFE_INTEGER) || null,
          nome, nullableText(req.body.referenciaStand ?? req.body.referencia_stand ?? current.referencia_stand, 120),
          nullableText(req.body.pavilhao ?? current.pavilhao, 120), nullableText(req.body.areaM2 ?? req.body.area_m2 ?? current.area_m2, 30),
          nullableText(req.body.centroCusto ?? req.body.centro_custo ?? current.centro_custo, 150), status,
          nullableText(req.body.observacoes ?? current.observacoes, 4000), id,
        ],
      );
      await audit(user, "UPDATE", id, { codigo, eventoId, clienteId, nome, status });
      res.json({ id, ok: true });
    } catch (error: any) {
      if (error?.message === "EVENTO_INVALIDO") return res.status(400).json({ error: "Evento selecionado não existe" });
      if (error?.message === "CLIENTE_INVALIDO") return res.status(400).json({ error: "Cliente selecionado não existe" });
      if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Já existe um Projeto de Stand com este código" });
      console.error("[ProjetosStand] erro ao atualizar", error);
      res.status(500).json({ error: "Não foi possível atualizar o Projeto de Stand" });
    }
  });

  r.delete("/:id", requireFinanceManager, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const [transacoes, receitas] = await Promise.all([
        dbOne<{ total: number }>("SELECT COUNT(*) AS total FROM crm_transacoes WHERE projeto_stand_id = ?", [id]),
        dbOne<{ total: number }>("SELECT COUNT(*) AS total FROM crm_contas_receber WHERE projeto_stand_id = ?", [id]),
      ]);
      if (Number(transacoes?.total || 0) || Number(receitas?.total || 0)) {
        return res.status(409).json({ error: "Este Projeto de Stand possui lançamentos vinculados e não pode ser excluído" });
      }
      const [result] = await getPool().execute("DELETE FROM crm_projetos_stand WHERE id = ?", [id]);
      if (!Number((result as any).affectedRows || 0)) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      await audit(user, "DELETE", id, {});
      res.json({ ok: true });
    } catch (error) {
      console.error("[ProjetosStand] erro ao excluir", error);
      res.status(500).json({ error: "Não foi possível excluir o Projeto de Stand" });
    }
  });

  app.use("/api/crm/projetos-stand", r);
}
