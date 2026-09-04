import { Request, Response, Router } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };

const FINANCE_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"]);
let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) pool = mysql.createPool(ENV.databaseUrl);
  return pool;
}

async function db<T = any>(sql: string, params: unknown[] = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

function text(value: unknown, max = 180) { return String(value ?? "").trim().slice(0, max); }
function safeInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
function isoDate(value: unknown) {
  const date = text(value, 10);
  if (!date) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error("PERIODO_INVALIDO");
  return date;
}
function sessionToken(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const header = String(req.headers.authorization || req.headers["x-crm-token"] || "").trim();
  return cookies.crm_session || (header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header) || "";
}
function requireFinance(req: Request, res: Response, next: () => void) {
  const token = sessionToken(req);
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSessionFromCrm(token).then((user) => {
    if (!user) return res.status(401).json({ error: "Sessão expirada" });
    if (!FINANCE_ROLES.has(String((user as CrmSession).role || "").trim().toLowerCase())) return res.status(403).json({ error: "Acesso restrito ao resultado financeiro" });
    (req as any).crmUser = user;
    next();
  }).catch(() => res.status(500).json({ error: "Não foi possível validar a sessão" }));
}

type Filters = { eventoId: number; clienteId: number; centroCusto: string; dataInicio: string; dataFim: string };

function filtersFrom(req: Request): Filters {
  const dataInicio = isoDate(req.query.data_inicio ?? req.query.dataInicio);
  const dataFim = isoDate(req.query.data_fim ?? req.query.dataFim);
  if (dataInicio && dataFim && dataInicio > dataFim) throw new Error("PERIODO_INVALIDO");
  return {
    eventoId: safeInt(req.query.evento_id ?? req.query.eventoId, 0, 0, Number.MAX_SAFE_INTEGER),
    clienteId: safeInt(req.query.cliente_id ?? req.query.clienteId, 0, 0, Number.MAX_SAFE_INTEGER),
    centroCusto: text(req.query.centro_custo ?? req.query.centroCusto ?? req.query.busca ?? req.query.q, 180),
    dataInicio,
    dataFim,
  };
}

function sourceSql(filters: Filters) {
  const where = ["l.status = 'confirmado'"];
  const params: unknown[] = [];
  if (filters.eventoId) { where.push("l.evento_id = ?"); params.push(filters.eventoId); }
  if (filters.clienteId) { where.push("l.cliente_id = ?"); params.push(filters.clienteId); }
  if (filters.centroCusto) {
    where.push("(LOWER(COALESCE(l.centro_custo, '')) LIKE ? OR LOWER(COALESCE(l.identificacao_stand, '')) LIKE ?)");
    const term = `%${filters.centroCusto.toLocaleLowerCase("pt-BR")}%`;
    params.push(term, term);
  }
  if (filters.dataInicio) { where.push("DATE(l.confirmado_em) >= ?"); params.push(filters.dataInicio); }
  if (filters.dataFim) { where.push("DATE(l.confirmado_em) <= ?"); params.push(filters.dataFim); }
  return {
    sql: `SELECT l.cliente_id, l.evento_id, l.centro_custo,
                 MIN(l.identificacao_stand) AS identificacao_stand,
                 MIN(l.confirmado_em) AS confirmado_em,
                 COUNT(DISTINCT l.id) AS lotes_confirmados
          FROM crm_lotes_financeiros_stand l
          WHERE ${where.join(" AND ")}
          GROUP BY l.cliente_id, l.evento_id, l.centro_custo`,
    params,
  };
}

const RECEITAS_SQL = `SELECT cliente_id, evento_id, centro_custo, COALESCE(SUM(valor), 0) AS receita
  FROM crm_contas_receber
  WHERE LOWER(TRIM(COALESCE(status, ''))) <> 'cancelado'
  GROUP BY cliente_id, evento_id, centro_custo`;
const DESPESAS_SQL = `SELECT cliente_id, evento_id, centro_custo, COALESCE(SUM(valor), 0) AS despesa_direta
  FROM crm_transacoes
  WHERE LOWER(TRIM(COALESCE(tipo, ''))) IN ('pagar', 'despesa', 'contas a pagar')
    AND LOWER(TRIM(COALESCE(status, ''))) <> 'cancelado'
  GROUP BY cliente_id, evento_id, centro_custo`;
const PROJETOS_SQL = `SELECT evento_id, cliente_id, centro_custo,
  MIN(id) AS projeto_stand_id, MIN(nome) AS projeto_stand_nome, COUNT(*) AS projetos_correspondentes
  FROM crm_projetos_stand
  WHERE cliente_id IS NOT NULL
  GROUP BY evento_id, cliente_id, centro_custo`;

function reportSql(source: string) {
  return `FROM (${source}) b
    JOIN crm_eventos e ON e.id = b.evento_id
    JOIN crm_clientes c ON c.id = b.cliente_id
    LEFT JOIN (${RECEITAS_SQL}) cr ON cr.cliente_id = b.cliente_id AND cr.evento_id = b.evento_id AND cr.centro_custo = b.centro_custo
    LEFT JOIN (${DESPESAS_SQL}) t ON t.cliente_id = b.cliente_id AND t.evento_id = b.evento_id AND t.centro_custo = b.centro_custo
    LEFT JOIN (${PROJETOS_SQL}) ps ON ps.cliente_id = b.cliente_id AND ps.evento_id = b.evento_id AND ps.centro_custo = b.centro_custo`;
}

function resultSelect(source: string) {
  return `SELECT b.cliente_id, b.evento_id, b.centro_custo, b.identificacao_stand, b.confirmado_em, b.lotes_confirmados,
      c.nome AS cliente_nome, e.nome AS evento_nome,
      COALESCE(cr.receita, 0) AS receita,
      COALESCE(t.despesa_direta, 0) AS despesa_direta,
      0 AS custo_rateado,
      COALESCE(cr.receita, 0) - COALESCE(t.despesa_direta, 0) AS margem,
      CASE WHEN COALESCE(cr.receita, 0) > 0 THEN ((COALESCE(cr.receita, 0) - COALESCE(t.despesa_direta, 0)) / COALESCE(cr.receita, 0)) * 100 ELSE NULL END AS margem_percentual,
      CASE WHEN ps.projetos_correspondentes = 1 THEN ps.projeto_stand_id ELSE NULL END AS projeto_stand_id,
      CASE WHEN ps.projetos_correspondentes = 1 THEN ps.projeto_stand_nome ELSE NULL END AS projeto_stand_nome,
      CASE WHEN ps.projetos_correspondentes > 1 THEN 1 ELSE 0 END AS projeto_ambiguous
      ${reportSql(source)}`;
}

export function registerResultadosStandRoutes(app: any) {
  const r = Router();
  r.get("/", requireFinance, async (req, res) => {
    try {
      const filters = filtersFrom(req);
      const limit = safeInt(req.query.limit, 50, 1, 100);
      const offset = safeInt(req.query.offset, 0, 0, 100000);
      const source = sourceSql(filters);
      const report = reportSql(source.sql);
      const [data, summaryRows] = await Promise.all([
        db<any>(`${resultSelect(source.sql)} ORDER BY e.nome ASC, c.nome ASC, b.identificacao_stand ASC LIMIT ${limit} OFFSET ${offset}`, source.params),
        db<any>(`SELECT COUNT(*) AS total, COALESCE(SUM(COALESCE(cr.receita, 0)), 0) AS receitas,
                   COALESCE(SUM(COALESCE(t.despesa_direta, 0)), 0) AS despesas_diretas
                 ${report}`, source.params),
      ]);
      const summary = summaryRows[0] || {};
      const receitas = Number(summary.receitas || 0);
      const despesasDiretas = Number(summary.despesas_diretas || 0);
      res.json({
        data: data.map((item) => ({ ...item, receita: Number(item.receita || 0), despesa_direta: Number(item.despesa_direta || 0), custo_rateado: 0, margem: Number(item.margem || 0), margem_percentual: item.margem_percentual == null ? null : Number(item.margem_percentual), projeto_ambiguous: Boolean(item.projeto_ambiguous) })),
        total: Number(summary.total || 0), limit, offset,
        resumo: { receitas, despesas_diretas: despesasDiretas, custos_rateados: 0, margem: receitas - despesasDiretas },
        rateios: { disponivel: false, motivo: "As tabelas de rateio ainda não estão disponíveis na base restaurada; o resultado atual considera receitas e custos diretos." },
      });
    } catch (error: any) {
      if (error?.message === "PERIODO_INVALIDO") return res.status(400).json({ error: "Informe um período válido, com data inicial anterior ou igual à final" });
      console.error("[ResultadosStand] erro ao apurar", error);
      res.status(500).json({ error: "Não foi possível calcular o Resultado por Stand" });
    }
  });
  app.use("/api/crm/financeiro/resultados-stand", r);
}
