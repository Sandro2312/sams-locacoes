import { Router, Request, Response } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };
type AllocationInput = { projetoStandId?: unknown; projeto_stand_id?: unknown; valor?: unknown };
const FINANCE_MANAGER_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"]);
const CRITERIA = new Set(["igualitario", "area_m2", "receita_prevista", "manual"]);

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
function text(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}
function toCents(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}
function fromCents(value: number) {
  return (value / 100).toFixed(2);
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
async function audit(user: CrmSession, action: string, ruleId: number | null, details: Record<string, unknown>) {
  try {
    await db(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
      [user.userId, action, "crm_rateio_regras", ruleId, JSON.stringify(details), null],
    );
  } catch (error) {
    console.warn("[Rateios] Falha não bloqueante ao registrar auditoria", error);
  }
}
function splitCents(totalCents: number, projectIds: number[], weights: number[]) {
  const weightTotal = weights.reduce((total, item) => total + item, 0);
  if (!Number.isFinite(weightTotal) || weightTotal <= 0) throw new Error("PESOS_INVALIDOS");
  const parts = projectIds.map((projectId, index) => {
    const exact = totalCents * weights[index] / weightTotal;
    return { projectId, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = totalCents - parts.reduce((total, part) => total + part.cents, 0);
  parts.sort((a, b) => b.remainder - a.remainder || a.projectId - b.projectId);
  for (let index = 0; index < remaining; index += 1) parts[index % parts.length].cents += 1;
  return parts.sort((a, b) => projectIds.indexOf(a.projectId) - projectIds.indexOf(b.projectId));
}

export function registerRateiosRoutes(app: any) {
  const r = Router();

  r.get("/transacoes-elegiveis", requireCrmAuth, async (req, res) => {
    try {
      const eventoId = safeInt(req.query.evento_id ?? req.query.eventoId, 0, 0, Number.MAX_SAFE_INTEGER);
      const params: any[] = [];
      const where = ["t.evento_id IS NOT NULL", "t.projeto_stand_id IS NULL", "LOWER(TRIM(COALESCE(t.tipo, ''))) IN ('despesa','pagar','contas a pagar')", "LOWER(TRIM(COALESCE(t.status, ''))) <> 'cancelado'", "rr.id IS NULL"];
      if (eventoId) { where.push("t.evento_id = ?"); params.push(eventoId); }
      const rows = await db<any>(
        `SELECT t.id, t.descricao, t.valor, t.data, t.status, t.evento_id, e.nome AS evento_nome
         FROM crm_transacoes t
         JOIN crm_eventos e ON e.id = t.evento_id
         LEFT JOIN crm_rateio_regras rr ON rr.transacao_id = t.id
         WHERE ${where.join(" AND ")}
         ORDER BY t.data DESC, t.id DESC
         LIMIT 200`,
        params,
      );
      res.json({ data: rows });
    } catch (error) {
      console.error("[Rateios] erro ao listar transações elegíveis", error);
      res.status(500).json({ error: "Não foi possível carregar despesas elegíveis para rateio" });
    }
  });

  r.get("/", requireCrmAuth, async (req, res) => {
    try {
      const eventoId = safeInt(req.query.evento_id ?? req.query.eventoId, 0, 0, Number.MAX_SAFE_INTEGER);
      const params: any[] = [];
      let where = "1=1";
      if (eventoId) { where += " AND rr.evento_id = ?"; params.push(eventoId); }
      const rows = await db<any>(
        `SELECT rr.*, t.descricao AS transacao_descricao, t.data AS transacao_data, e.nome AS evento_nome,
                u.name AS criado_por_nome, COUNT(ra.id) AS destinos, COALESCE(SUM(ra.valor), 0) AS valor_alocado
         FROM crm_rateio_regras rr
         JOIN crm_transacoes t ON t.id = rr.transacao_id
         JOIN crm_eventos e ON e.id = rr.evento_id
         LEFT JOIN crm_users u ON u.id = rr.created_by
         LEFT JOIN crm_rateio_alocacoes ra ON ra.regra_id = rr.id
         WHERE ${where}
         GROUP BY rr.id
         ORDER BY rr.created_at DESC, rr.id DESC
         LIMIT 200`,
        params,
      );
      res.json({ data: rows });
    } catch (error) {
      console.error("[Rateios] erro ao listar regras", error);
      res.status(500).json({ error: "Não foi possível carregar os rateios" });
    }
  });

  r.get("/:id", requireCrmAuth, async (req, res) => {
    try {
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const regra = await dbOne<any>(
        `SELECT rr.*, t.descricao AS transacao_descricao, t.data AS transacao_data, e.nome AS evento_nome, u.name AS criado_por_nome
         FROM crm_rateio_regras rr
         JOIN crm_transacoes t ON t.id = rr.transacao_id
         JOIN crm_eventos e ON e.id = rr.evento_id
         LEFT JOIN crm_users u ON u.id = rr.created_by
         WHERE rr.id = ?`,
        [id],
      );
      if (!regra) return res.status(404).json({ error: "Rateio não encontrado" });
      const alocacoes = await db<any>(
        `SELECT ra.*, ps.codigo AS projeto_codigo, ps.nome AS projeto_nome, COALESCE(c.nome, l.nome) AS cliente_nome
         FROM crm_rateio_alocacoes ra
         JOIN crm_projetos_stand ps ON ps.id = ra.projeto_stand_id
         LEFT JOIN crm_clientes c ON c.id = ps.cliente_id
         LEFT JOIN crm_leads l ON l.id = ps.lead_id
         WHERE ra.regra_id = ?
         ORDER BY ps.nome ASC`,
        [id],
      );
      res.json({ regra, alocacoes });
    } catch (error) {
      console.error("[Rateios] erro ao detalhar", error);
      res.status(500).json({ error: "Não foi possível carregar o detalhe do rateio" });
    }
  });

  r.post("/", requireFinanceManager, async (req, res) => {
    const connection = await getPool().getConnection();
    try {
      const user = (req as any).crmUser as CrmSession;
      const transacaoId = safeInt(req.body.transacaoId ?? req.body.transacao_id, 0, 1, Number.MAX_SAFE_INTEGER);
      const criterio = text(req.body.criterio, 30).toLowerCase();
      const observacoes = text(req.body.observacoes, 4000) || null;
      const rawAllocations = Array.isArray(req.body.alocacoes) ? req.body.alocacoes as AllocationInput[] : [];
      const projectIds = rawAllocations.map((item) => safeInt(item.projetoStandId ?? item.projeto_stand_id, 0, 1, Number.MAX_SAFE_INTEGER));
      if (!transacaoId || !CRITERIA.has(criterio) || projectIds.length < 2 || projectIds.some((id) => !id) || new Set(projectIds).size !== projectIds.length) {
        return res.status(400).json({ error: "Informe uma despesa, critério válido e ao menos dois Projetos de Stand distintos" });
      }
      await connection.beginTransaction();
      const [sourceRows] = await connection.execute<any[]>(
        `SELECT id, evento_id, projeto_stand_id, tipo, valor, status FROM crm_transacoes
         WHERE id = ? FOR UPDATE`,
        [transacaoId],
      );
      const source = sourceRows[0];
      if (!source) { await connection.rollback(); return res.status(404).json({ error: "Despesa de origem não encontrada" }); }
      if (!source.evento_id || source.projeto_stand_id || !["despesa", "pagar", "contas a pagar"].includes(String(source.tipo || "").trim().toLowerCase()) || String(source.status || "").trim().toLowerCase() === "cancelado") {
        await connection.rollback();
        return res.status(400).json({ error: "A despesa deve estar vinculada ao evento, sem Projeto de Stand e não pode estar cancelada" });
      }
      const sourceCents = toCents(source.valor);
      if (!sourceCents) { await connection.rollback(); return res.status(400).json({ error: "A despesa de origem deve possuir valor maior que zero" }); }
      const placeholders = projectIds.map(() => "?").join(",");
      const [projects] = await connection.execute<any[]>(
        `SELECT ps.id, ps.evento_id, ps.area_m2,
                COALESCE((SELECT SUM(cr.valor) FROM crm_contas_receber cr WHERE cr.projeto_stand_id = ps.id AND LOWER(TRIM(COALESCE(cr.status, ''))) <> 'cancelado'), 0) AS receita_prevista
         FROM crm_projetos_stand ps
         WHERE ps.id IN (${placeholders})`,
        projectIds,
      );
      if (projects.length !== projectIds.length || projects.some((project) => Number(project.evento_id) !== Number(source.evento_id))) {
        await connection.rollback();
        return res.status(400).json({ error: "Todos os Projetos de Stand selecionados devem pertencer ao mesmo evento da despesa" });
      }
      const byId = new Map(projects.map((project) => [Number(project.id), project]));
      let portions: { projectId: number; cents: number }[];
      if (criterio === "manual") {
        portions = rawAllocations.map((item, index) => ({ projectId: projectIds[index], cents: toCents(item.valor) }));
        if (portions.some((part) => !part.cents) || portions.reduce((total, part) => total + part.cents, 0) !== sourceCents) {
          await connection.rollback();
          return res.status(400).json({ error: "No rateio manual, a soma dos valores deve ser exatamente igual à despesa de origem" });
        }
      } else {
        const weights = projectIds.map((id) => {
          const project = byId.get(id);
          if (criterio === "igualitario") return 1;
          if (criterio === "area_m2") return Number(String(project?.area_m2 || "").replace(",", "."));
          return Number(project?.receita_prevista || 0);
        });
        portions = splitCents(sourceCents, projectIds, weights);
      }
      const [ruleResult] = await connection.execute<any>(
        "INSERT INTO crm_rateio_regras (transacao_id, evento_id, criterio, valor_origem, observacoes, status, created_by) VALUES (?,?,?,?,?,'aprovado',?)",
        [transacaoId, source.evento_id, criterio, fromCents(sourceCents), observacoes, user.userId],
      );
      const ruleId = Number(ruleResult.insertId);
      for (const portion of portions) {
        const percentual = portion.cents / sourceCents * 100;
        await connection.execute(
          "INSERT INTO crm_rateio_alocacoes (regra_id, projeto_stand_id, percentual, valor) VALUES (?,?,?,?)",
          [ruleId, portion.projectId, percentual.toFixed(6), fromCents(portion.cents)],
        );
      }
      await connection.commit();
      await audit(user, "CREATE", ruleId, { transacaoId, eventoId: Number(source.evento_id), criterio, valorOrigem: fromCents(sourceCents), alocacoes: portions.map((part) => ({ projetoStandId: part.projectId, valor: fromCents(part.cents) })) });
      res.status(201).json({ id: ruleId, ok: true, valor_alocado: fromCents(sourceCents) });
    } catch (error: any) {
      await connection.rollback().catch(() => undefined);
      if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Esta despesa já possui um rateio aprovado" });
      if (error?.message === "PESOS_INVALIDOS") return res.status(400).json({ error: "O critério selecionado exige dados positivos para todos os Projetos de Stand" });
      console.error("[Rateios] erro ao criar", error);
      res.status(500).json({ error: "Não foi possível criar o rateio" });
    } finally {
      connection.release();
    }
  });

  r.delete("/:id", requireFinanceManager, async (req, res) => {
    const connection = await getPool().getConnection();
    try {
      const user = (req as any).crmUser as CrmSession;
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      await connection.beginTransaction();
      const [rules] = await connection.execute<any[]>("SELECT id, transacao_id, evento_id, criterio, valor_origem FROM crm_rateio_regras WHERE id = ? FOR UPDATE", [id]);
      const rule = rules[0];
      if (!rule) { await connection.rollback(); return res.status(404).json({ error: "Rateio não encontrado" }); }
      await connection.execute("DELETE FROM crm_rateio_alocacoes WHERE regra_id = ?", [id]);
      await connection.execute("DELETE FROM crm_rateio_regras WHERE id = ?", [id]);
      await connection.commit();
      await audit(user, "DELETE", id, { transacaoId: Number(rule.transacao_id), eventoId: Number(rule.evento_id), criterio: rule.criterio, valorOrigem: rule.valor_origem });
      res.json({ ok: true });
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      console.error("[Rateios] erro ao excluir", error);
      res.status(500).json({ error: "Não foi possível desfazer o rateio" });
    } finally {
      connection.release();
    }
  });

  app.use("/api/crm/rateios", r);
}
