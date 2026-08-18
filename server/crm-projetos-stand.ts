import { Request, Response, Router } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };
const PROJECT_STATUSES = new Set(["planejado", "em_orcamento", "contratado", "em_producao", "em_montagem", "concluido", "cancelado"]);
const FINANCE_MANAGER_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"]);
const COMMERCIAL_STATUSES = new Set(["prospecto", "em_negociacao", "ganho", "perdido", "cancelado"]);
const BUDGET_EDITOR_ROLES = new Set(Array.from(FINANCE_MANAGER_ROLES).concat(["vendedor", "comercial"]));
const BUDGET_STATUSES = new Set(["rascunho", "em_revisao", "enviada", "aprovada", "recusada", "substituida"]);
const BUDGET_ITEM_CATEGORIES = new Set(["marcenaria", "metalurgia", "comunicacao_visual", "mobiliario", "eletrica", "iluminacao", "audiovisual", "logistica", "montagem", "desmontagem", "hospedagem", "terceiros", "taxas", "outros"]);

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
function requireBudgetEditor(req: Request, res: Response, next: () => void) {
  requireCrmAuth(req, res, () => {
    const role = String((req as any).crmUser?.role || "").trim().toLowerCase();
    if (!BUDGET_EDITOR_ROLES.has(role)) return res.status(403).json({ error: "Acesso restrito à elaboração de orçamentos" });
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
async function validateRelations(eventoId: number, clienteId: number | null, leadId: number | null, oportunidadeId: number | null) {
  const [evento, cliente, lead, oportunidade] = await Promise.all([
    dbOne<{ id: number }>("SELECT id FROM crm_eventos WHERE id = ?", [eventoId]),
    clienteId ? dbOne<{ id: number }>("SELECT id FROM crm_clientes WHERE id = ?", [clienteId]) : Promise.resolve(null),
    leadId ? dbOne<{ id: number }>("SELECT id FROM crm_leads WHERE id = ?", [leadId]) : Promise.resolve(null),
    oportunidadeId ? dbOne<{ lead_id: number; evento_id: number | null }>("SELECT lead_id, evento_id FROM crm_oportunidades WHERE id = ?", [oportunidadeId]) : Promise.resolve(null),
  ]);
  if (!evento) throw new Error("EVENTO_INVALIDO");
  if (clienteId && !cliente) throw new Error("CLIENTE_INVALIDO");
  if (leadId && !lead) throw new Error("LEAD_INVALIDO");
  if (oportunidadeId && !oportunidade) throw new Error("OPORTUNIDADE_INVALIDA");
  if (oportunidade?.evento_id && Number(oportunidade.evento_id) !== eventoId) throw new Error("EVENTO_OPORTUNIDADE_DIVERGENTE");
  if (oportunidade?.lead_id && leadId && Number(oportunidade.lead_id) !== leadId) throw new Error("LEAD_OPORTUNIDADE_DIVERGENTE");
  return { leadId: leadId || Number(oportunidade?.lead_id || 0) || null };
}
function generatedCode(eventoId: number, clienteId: number) {
  return `PS-${eventoId}-${clienteId}-${Date.now().toString(36).toUpperCase()}`;
}
function normalizeDecimal(value: unknown) {
  let raw = String(value ?? "").trim().replace(/\s/g, "");
  if (!raw) return null;
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
function moneyToCents(value: unknown, maxCents = 999999999999) {
  const parsed = normalizeDecimal(value);
  if (parsed === null || parsed < 0) throw new Error("VALOR_INVALIDO");
  const cents = Math.round(parsed * 100);
  if (!Number.isSafeInteger(cents) || cents > maxCents) throw new Error("VALOR_INVALIDO");
  return cents;
}
function quantityToMilli(value: unknown) {
  const parsed = normalizeDecimal(value);
  if (parsed === null || parsed <= 0) throw new Error("QUANTIDADE_INVALIDA");
  const milli = Math.round(parsed * 1000);
  if (!Number.isSafeInteger(milli) || milli > 100000000) throw new Error("QUANTIDADE_INVALIDA");
  return milli;
}
function centsToDb(value: number) { return (value / 100).toFixed(2); }
function milliToDb(value: number) { return (value / 1000).toFixed(3); }
function safeBudgetStatus(value: unknown, fallback = "rascunho") {
  const status = text(value || fallback, 40).toLowerCase();
  if (!BUDGET_STATUSES.has(status)) throw new Error("STATUS_ORCAMENTO_INVALIDO");
  return status;
}
function isLockedBudget(status: unknown) {
  return ["enviada", "aprovada", "recusada", "substituida"].includes(String(status || "").toLowerCase());
}
function pendingComposition(value: unknown) {
  return value === true || value === 1 || value === "1" || String(value || "").toLowerCase() === "true" ? 1 : 0;
}
function calculateBudget(rawItems: unknown, rawDiscount: unknown) {
  if (!Array.isArray(rawItems) || rawItems.length > 250) throw new Error("ITENS_INVALIDOS");
  const items = rawItems.map((raw: any, index: number) => {
    const category = text(raw?.categoria || "outros", 80).toLowerCase();
    const description = text(raw?.descricao, 500);
    if (!BUDGET_ITEM_CATEGORIES.has(category) || !description) throw new Error("ITEM_INVALIDO");
    const quantityMilli = quantityToMilli(raw?.quantidade ?? 1);
    const costCents = moneyToCents(raw?.custoUnitario ?? raw?.custo_unitario ?? 0);
    const priceCents = moneyToCents(raw?.precoUnitario ?? raw?.preco_unitario ?? 0);
    return { category, description, quantityMilli, costCents, priceCents, costTotalCents: Math.round((costCents * quantityMilli) / 1000), saleTotalCents: Math.round((priceCents * quantityMilli) / 1000), order: index };
  });
  const subtotalCostCents = items.reduce((sum, item) => sum + item.costTotalCents, 0);
  const subtotalSaleCents = items.reduce((sum, item) => sum + item.saleTotalCents, 0);
  const discountCents = moneyToCents(rawDiscount ?? 0);
  if (discountCents > subtotalSaleCents) throw new Error("DESCONTO_INVALIDO");
  const finalSaleCents = subtotalSaleCents - discountCents;
  const marginCents = finalSaleCents - subtotalCostCents;
  return { items, subtotalCostCents, subtotalSaleCents, discountCents, finalSaleCents, marginCents, marginPct: finalSaleCents ? (marginCents / finalSaleCents) * 100 : null };
}
async function getBudgetWithItems(projetoId: number, budgetId: number) {
  const budget = await db<any>("SELECT * FROM crm_orcamentos_tecnicos WHERE id = ? AND projeto_stand_id = ?", [budgetId, projetoId]);
  if (!budget[0]) return null;
  const items = await db<any>("SELECT * FROM crm_orcamentos_tecnicos_itens WHERE orcamento_tecnico_id = ? ORDER BY ordem ASC, id ASC", [budgetId]);
  return { orcamento: budget[0], itens: items };
}

export function registerProjetosStandRoutes(app: any) {
  const r = Router();

  r.get("/", requireCrmAuth, async (req, res) => {
    try {
      const eventoId = safeInt(req.query.evento_id ?? req.query.eventoId, 0, 0, Number.MAX_SAFE_INTEGER);
      const clienteId = safeInt(req.query.cliente_id ?? req.query.clienteId, 0, 0, Number.MAX_SAFE_INTEGER);
      const leadId = safeInt(req.query.lead_id ?? req.query.leadId, 0, 0, Number.MAX_SAFE_INTEGER);
      const status = text(req.query.status, 30).toLowerCase();
      const situacaoComercial = text(req.query.situacao_comercial ?? req.query.situacaoComercial, 30).toLowerCase();
      const search = text(req.query.busca ?? req.query.q, 120);
      const limit = safeInt(req.query.limit, 50, 1, 100);
      const offset = safeInt(req.query.offset, 0, 0, 100000);
      const where: string[] = ["1=1"];
      const params: any[] = [];
      if (eventoId) { where.push("ps.evento_id = ?"); params.push(eventoId); }
      if (clienteId) { where.push("ps.cliente_id = ?"); params.push(clienteId); }
      if (leadId) { where.push("ps.lead_id = ?"); params.push(leadId); }
      if (status && PROJECT_STATUSES.has(status)) { where.push("ps.status = ?"); params.push(status); }
      if (situacaoComercial && COMMERCIAL_STATUSES.has(situacaoComercial)) { where.push("ps.situacao_comercial = ?"); params.push(situacaoComercial); }
      if (search) {
        where.push("(ps.codigo LIKE ? OR ps.nome LIKE ? OR ps.referencia_stand LIKE ? OR c.nome LIKE ? OR l.nome LIKE ? OR e.nome LIKE ?)");
        const term = `%${search}%`;
        params.push(term, term, term, term, term, term);
      }
      const whereSql = where.join(" AND ");
      const data = await db<any>(
        `SELECT ps.*, e.nome AS evento_nome, COALESCE(c.nome, l.nome) AS cliente_nome,
                c.nome AS cliente_convertido_nome, l.nome AS lead_nome, o.etapa AS oportunidade_etapa,
                COALESCE((SELECT SUM(t.valor) FROM crm_transacoes t
                          WHERE t.projeto_stand_id = ps.id
                            AND LOWER(TRIM(COALESCE(t.tipo, ''))) IN ('despesa','pagar','contas a pagar')
                            AND LOWER(TRIM(COALESCE(t.status, ''))) <> 'cancelado'), 0) AS custos_diretos,
                COALESCE((SELECT SUM(ra.valor) FROM crm_rateio_alocacoes ra
                          JOIN crm_rateio_regras rr ON rr.id = ra.regra_id
                          WHERE ra.projeto_stand_id = ps.id AND rr.status = 'aprovado'), 0) AS custos_rateados,
                COALESCE((SELECT SUM(cr.valor) FROM crm_contas_receber cr
                          WHERE cr.projeto_stand_id = ps.id
                            AND LOWER(TRIM(COALESCE(cr.status, ''))) <> 'cancelado'), 0) AS receitas_previstas
         FROM crm_projetos_stand ps
         JOIN crm_eventos e ON e.id = ps.evento_id
         LEFT JOIN crm_clientes c ON c.id = ps.cliente_id
         LEFT JOIN crm_leads l ON l.id = ps.lead_id
         LEFT JOIN crm_oportunidades o ON o.id = ps.oportunidade_id
         WHERE ${whereSql}
         ORDER BY e.nome ASC, COALESCE(c.nome, l.nome) ASC, ps.nome ASC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      );
      const count = await dbOne<{ total: number }>(
        `SELECT COUNT(*) AS total FROM crm_projetos_stand ps
         JOIN crm_eventos e ON e.id = ps.evento_id
         LEFT JOIN crm_clientes c ON c.id = ps.cliente_id
         LEFT JOIN crm_leads l ON l.id = ps.lead_id
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
        `SELECT ps.*, e.nome AS evento_nome, COALESCE(c.nome, l.nome) AS cliente_nome,
                c.nome AS cliente_convertido_nome, l.nome AS lead_nome, o.etapa AS oportunidade_etapa
         FROM crm_projetos_stand ps
         JOIN crm_eventos e ON e.id = ps.evento_id
         LEFT JOIN crm_clientes c ON c.id = ps.cliente_id
         LEFT JOIN crm_leads l ON l.id = ps.lead_id
         LEFT JOIN crm_oportunidades o ON o.id = ps.oportunidade_id
         WHERE ps.id = ?`,
        [id],
      );
      if (!projeto) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      const [despesas, receitas] = await Promise.all([
        dbOne<any>(
          `SELECT COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) <> 'cancelado' THEN valor ELSE 0 END), 0) AS custos_registrados,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('pago','baixado') THEN valor ELSE 0 END), 0) AS custos_pagos,
                  COALESCE((SELECT SUM(ra.valor) FROM crm_rateio_alocacoes ra
                            JOIN crm_rateio_regras rr ON rr.id = ra.regra_id
                            WHERE ra.projeto_stand_id = ? AND rr.status = 'aprovado'), 0) AS custos_rateados,
                  COUNT(*) AS lancamentos
           FROM crm_transacoes
           WHERE projeto_stand_id = ? AND LOWER(TRIM(COALESCE(tipo, ''))) IN ('despesa','pagar','contas a pagar')`,
          [id, id],
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
      const custosRateados = Number(despesas?.custos_rateados || 0);
      res.json({
        projeto,
        despesas: { ...despesas, custos_registrados: custos, custos_rateados: custosRateados, custo_total: custos + custosRateados },
        receitas: { ...receitas, receita_faturada: faturada },
        resultado: {
          margem_direta: faturada - custos,
          margem_percentual: faturada > 0 ? ((faturada - custos) / faturada) * 100 : null,
          margem_apos_rateio: faturada - custos - custosRateados,
          margem_apos_rateio_percentual: faturada > 0 ? ((faturada - custos - custosRateados) / faturada) * 100 : null,
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
      const clienteId = safeInt(req.body.clienteId ?? req.body.cliente_id, 0, 0, Number.MAX_SAFE_INTEGER) || null;
      const leadId = safeInt(req.body.leadId ?? req.body.lead_id, 0, 0, Number.MAX_SAFE_INTEGER) || null;
      const oportunidadeId = safeInt(req.body.oportunidadeId ?? req.body.oportunidade_id, 0, 0, Number.MAX_SAFE_INTEGER) || null;
      const nome = text(req.body.nome, 255);
      const status = text(req.body.status || "planejado", 30).toLowerCase();
      const situacaoComercial = text(req.body.situacaoComercial ?? req.body.situacao_comercial ?? "prospecto", 30).toLowerCase();
      if (!eventoId || (!clienteId && !leadId) || !nome) return res.status(400).json({ error: "Evento, cliente ou lead potencial, e nome do Projeto de Stand são obrigatórios" });
      if (!PROJECT_STATUSES.has(status)) return res.status(400).json({ error: "Status de Projeto de Stand inválido" });
      if (!COMMERCIAL_STATUSES.has(situacaoComercial)) return res.status(400).json({ error: "Situação comercial inválida" });
      const relations = await validateRelations(eventoId, clienteId, leadId, oportunidadeId);
      const codigo = text(req.body.codigo, 60) || generatedCode(eventoId, clienteId || relations.leadId || 0);
      const [result] = await getPool().execute(
        `INSERT INTO crm_projetos_stand
         (codigo, evento_id, cliente_id, lead_id, oportunidade_id, contrato_id, nome, referencia_stand, pavilhao, area_m2, centro_custo, status, situacao_comercial, observacoes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo, eventoId, clienteId, relations.leadId, oportunidadeId,
          safeInt(req.body.contratoId ?? req.body.contrato_id, 0, 0, Number.MAX_SAFE_INTEGER) || null,
          nome, nullableText(req.body.referenciaStand ?? req.body.referencia_stand, 120),
          nullableText(req.body.pavilhao, 120), nullableText(req.body.areaM2 ?? req.body.area_m2, 30),
          nullableText(req.body.centroCusto ?? req.body.centro_custo, 150), status, situacaoComercial,
          nullableText(req.body.observacoes, 4000), user.userId,
        ],
      );
      const id = Number((result as any).insertId);
      await audit(user, "CREATE", id, { codigo, eventoId, clienteId, leadId: relations.leadId, oportunidadeId, nome, status, situacaoComercial });
      res.status(201).json({ id, codigo, ok: true });
    } catch (error: any) {
      if (error?.message === "EVENTO_INVALIDO") return res.status(400).json({ error: "Evento selecionado não existe" });
      if (error?.message === "CLIENTE_INVALIDO") return res.status(400).json({ error: "Cliente selecionado não existe" });
      if (error?.message === "LEAD_INVALIDO") return res.status(400).json({ error: "Lead potencial selecionado não existe" });
      if (error?.message === "OPORTUNIDADE_INVALIDA") return res.status(400).json({ error: "Oportunidade selecionada não existe" });
      if (error?.message === "EVENTO_OPORTUNIDADE_DIVERGENTE") return res.status(400).json({ error: "O evento informado não corresponde à oportunidade" });
      if (error?.message === "LEAD_OPORTUNIDADE_DIVERGENTE") return res.status(400).json({ error: "O lead informado não corresponde à oportunidade" });
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
      const clienteId = safeInt(req.body.clienteId ?? req.body.cliente_id, Number(current.cliente_id || 0), 0, Number.MAX_SAFE_INTEGER) || null;
      const leadId = safeInt(req.body.leadId ?? req.body.lead_id, Number(current.lead_id || 0), 0, Number.MAX_SAFE_INTEGER) || null;
      const oportunidadeId = safeInt(req.body.oportunidadeId ?? req.body.oportunidade_id, Number(current.oportunidade_id || 0), 0, Number.MAX_SAFE_INTEGER) || null;
      const nome = text(req.body.nome ?? current.nome, 255);
      const status = text(req.body.status ?? current.status, 30).toLowerCase();
      const situacaoComercial = text(req.body.situacaoComercial ?? req.body.situacao_comercial ?? current.situacao_comercial, 30).toLowerCase();
      if (!nome || !PROJECT_STATUSES.has(status) || !COMMERCIAL_STATUSES.has(situacaoComercial) || (!clienteId && !leadId)) return res.status(400).json({ error: "Nome, vínculo comercial ou status inválido" });
      const relations = await validateRelations(eventoId, clienteId, leadId, oportunidadeId);
      const codigo = text(req.body.codigo ?? current.codigo, 60);
      await db(
        `UPDATE crm_projetos_stand
         SET codigo=?, evento_id=?, cliente_id=?, lead_id=?, oportunidade_id=?, contrato_id=?, nome=?, referencia_stand=?, pavilhao=?, area_m2=?, centro_custo=?, status=?, situacao_comercial=?, observacoes=?
         WHERE id=?`,
        [
          codigo, eventoId, clienteId, relations.leadId, oportunidadeId,
          safeInt(req.body.contratoId ?? req.body.contrato_id, Number(current.contrato_id || 0), 0, Number.MAX_SAFE_INTEGER) || null,
          nome, nullableText(req.body.referenciaStand ?? req.body.referencia_stand ?? current.referencia_stand, 120),
          nullableText(req.body.pavilhao ?? current.pavilhao, 120), nullableText(req.body.areaM2 ?? req.body.area_m2 ?? current.area_m2, 30),
          nullableText(req.body.centroCusto ?? req.body.centro_custo ?? current.centro_custo, 150), status, situacaoComercial,
          nullableText(req.body.observacoes ?? current.observacoes, 4000), id,
        ],
      );
      await audit(user, "UPDATE", id, { codigo, eventoId, clienteId, leadId: relations.leadId, oportunidadeId, nome, status, situacaoComercial });
      res.json({ id, ok: true });
    } catch (error: any) {
      if (error?.message === "EVENTO_INVALIDO") return res.status(400).json({ error: "Evento selecionado não existe" });
      if (error?.message === "CLIENTE_INVALIDO") return res.status(400).json({ error: "Cliente selecionado não existe" });
      if (error?.message === "LEAD_INVALIDO") return res.status(400).json({ error: "Lead potencial selecionado não existe" });
      if (error?.message === "OPORTUNIDADE_INVALIDA") return res.status(400).json({ error: "Oportunidade selecionada não existe" });
      if (error?.message === "EVENTO_OPORTUNIDADE_DIVERGENTE") return res.status(400).json({ error: "O evento informado não corresponde à oportunidade" });
      if (error?.message === "LEAD_OPORTUNIDADE_DIVERGENTE") return res.status(400).json({ error: "O lead informado não corresponde à oportunidade" });
      if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Já existe um Projeto de Stand com este código" });
      console.error("[ProjetosStand] erro ao atualizar", error);
      res.status(500).json({ error: "Não foi possível atualizar o Projeto de Stand" });
    }
  });

  r.delete("/:id", requireFinanceManager, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const [transacoes, receitas, rateios] = await Promise.all([
        dbOne<{ total: number }>("SELECT COUNT(*) AS total FROM crm_transacoes WHERE projeto_stand_id = ?", [id]),
        dbOne<{ total: number }>("SELECT COUNT(*) AS total FROM crm_contas_receber WHERE projeto_stand_id = ?", [id]),
        dbOne<{ total: number }>("SELECT COUNT(*) AS total FROM crm_rateio_alocacoes WHERE projeto_stand_id = ?", [id]),
      ]);
      if (Number(transacoes?.total || 0) || Number(receitas?.total || 0) || Number(rateios?.total || 0)) {
        return res.status(409).json({ error: "Este Projeto de Stand possui lançamentos ou rateios vinculados e não pode ser excluído" });
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

  r.get("/:id/orcamentos", requireCrmAuth, async (req, res) => {
    try {
      const projetoId = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const projeto = await dbOne<any>("SELECT id, nome, codigo, evento_id, cliente_id, lead_id FROM crm_projetos_stand WHERE id = ?", [projetoId]);
      if (!projeto) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      const data = await db<any>(`SELECT o.*, COUNT(i.id) AS itens_total
        FROM crm_orcamentos_tecnicos o LEFT JOIN crm_orcamentos_tecnicos_itens i ON i.orcamento_tecnico_id = o.id
        WHERE o.projeto_stand_id = ? GROUP BY o.id ORDER BY o.numero_versao DESC`, [projetoId]);
      res.json({ projeto, data });
    } catch (error) { console.error("[ProjetosStand] erro ao listar orçamentos", error); res.status(500).json({ error: "Não foi possível carregar os orçamentos técnicos" }); }
  });

  r.get("/:id/orcamentos/:orcamentoId", requireCrmAuth, async (req, res) => {
    try {
      const projetoId = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const budgetId = safeInt(req.params.orcamentoId, 0, 1, Number.MAX_SAFE_INTEGER);
      const detail = await getBudgetWithItems(projetoId, budgetId);
      if (!detail) return res.status(404).json({ error: "Versão de orçamento não encontrada" });
      res.json(detail);
    } catch (error) { console.error("[ProjetosStand] erro ao obter orçamento", error); res.status(500).json({ error: "Não foi possível carregar a versão de orçamento" }); }
  });

  r.post("/:id/orcamentos", requireBudgetEditor, async (req, res) => {
    const connection = await getPool().getConnection();
    try {
      const user = (req as any).crmUser as CrmSession;
      const projetoId = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const projeto = await dbOne<any>("SELECT id, nome FROM crm_projetos_stand WHERE id = ?", [projetoId]);
      if (!projeto) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      const title = text(req.body.titulo || `Orçamento técnico — ${projeto.nome}`, 255);
      if (!title) return res.status(400).json({ error: "Informe o título do orçamento" });
      const calculation = calculateBudget(req.body.itens ?? [], req.body.desconto ?? 0);
      const composicaoPendente = pendingComposition(req.body.composicaoPendente ?? req.body.composicao_pendente);
      await connection.beginTransaction();
      const [versionRows] = await connection.execute<any[]>("SELECT COALESCE(MAX(numero_versao), 0) + 1 AS proxima FROM crm_orcamentos_tecnicos WHERE projeto_stand_id = ? FOR UPDATE", [projetoId]);
      const version = Number(versionRows?.[0]?.proxima || 1);
      const [result] = await connection.execute<any>(`INSERT INTO crm_orcamentos_tecnicos
        (projeto_stand_id, numero_versao, titulo, status, subtotal_custo, subtotal_venda, desconto, valor_venda_final, margem, margem_percentual, composicao_pendente, observacoes, criado_por, criado_por_nome)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [projetoId, version, title, "rascunho", centsToDb(calculation.subtotalCostCents), centsToDb(calculation.subtotalSaleCents), centsToDb(calculation.discountCents), centsToDb(calculation.finalSaleCents), centsToDb(calculation.marginCents), calculation.marginPct, composicaoPendente, nullableText(req.body.observacoes, 4000), user.userId, user.name || null]);
      const budgetId = Number(result.insertId);
      for (const item of calculation.items) await connection.execute(`INSERT INTO crm_orcamentos_tecnicos_itens
        (orcamento_tecnico_id, categoria, descricao, quantidade, custo_unitario, preco_unitario, custo_total, valor_total, ordem) VALUES (?,?,?,?,?,?,?,?,?)`, [budgetId, item.category, item.description, milliToDb(item.quantityMilli), centsToDb(item.costCents), centsToDb(item.priceCents), centsToDb(item.costTotalCents), centsToDb(item.saleTotalCents), item.order]);
      await connection.commit();
      await audit(user, "CREATE_TECHNICAL_BUDGET", projetoId, { budgetId, version, itemCount: calculation.items.length, finalSaleCents: calculation.finalSaleCents, marginCents: calculation.marginCents, composicaoPendente: Boolean(composicaoPendente) });
      res.status(201).json({ ok: true, id: budgetId, numeroVersao: version });
    } catch (error: any) {
      await connection.rollback();
      const messages: Record<string, string> = { VALOR_INVALIDO: "Valor de item inválido", QUANTIDADE_INVALIDA: "Quantidade de item inválida", ITEM_INVALIDO: "Categoria ou descrição de item inválida", ITENS_INVALIDOS: "Itens de orçamento inválidos", DESCONTO_INVALIDO: "O desconto não pode superar o valor de venda" };
      if (messages[error?.message]) return res.status(400).json({ error: messages[error.message] });
      console.error("[ProjetosStand] erro ao criar orçamento", error); res.status(500).json({ error: "Não foi possível criar a versão de orçamento" });
    } finally { connection.release(); }
  });

  r.put("/:id/orcamentos/:orcamentoId", requireBudgetEditor, async (req, res) => {
    const connection = await getPool().getConnection();
    try {
      const user = (req as any).crmUser as CrmSession;
      const projetoId = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const budgetId = safeInt(req.params.orcamentoId, 0, 1, Number.MAX_SAFE_INTEGER);
      const detail = await getBudgetWithItems(projetoId, budgetId);
      if (!detail) return res.status(404).json({ error: "Versão de orçamento não encontrada" });
      if (isLockedBudget(detail.orcamento.status)) return res.status(409).json({ error: "Esta versão está bloqueada. Duplique-a para criar uma nova revisão." });
      const calculation = calculateBudget(req.body.itens ?? [], req.body.desconto ?? detail.orcamento.desconto ?? 0);
      const title = text(req.body.titulo ?? detail.orcamento.titulo, 255); if (!title) return res.status(400).json({ error: "Informe o título do orçamento" });
      const status = safeBudgetStatus(req.body.status ?? detail.orcamento.status); if (isLockedBudget(status)) return res.status(400).json({ error: "Use as ações específicas para enviar, aprovar ou recusar uma versão" });
      const composicaoPendente = pendingComposition(req.body.composicaoPendente ?? req.body.composicao_pendente ?? detail.orcamento.composicao_pendente);
      await connection.beginTransaction();
      await connection.execute(`UPDATE crm_orcamentos_tecnicos SET titulo=?, status=?, subtotal_custo=?, subtotal_venda=?, desconto=?, valor_venda_final=?, margem=?, margem_percentual=?, composicao_pendente=?, observacoes=? WHERE id=?`, [title, status, centsToDb(calculation.subtotalCostCents), centsToDb(calculation.subtotalSaleCents), centsToDb(calculation.discountCents), centsToDb(calculation.finalSaleCents), centsToDb(calculation.marginCents), calculation.marginPct, composicaoPendente, nullableText(req.body.observacoes ?? detail.orcamento.observacoes, 4000), budgetId]);
      await connection.execute("DELETE FROM crm_orcamentos_tecnicos_itens WHERE orcamento_tecnico_id = ?", [budgetId]);
      for (const item of calculation.items) await connection.execute(`INSERT INTO crm_orcamentos_tecnicos_itens
        (orcamento_tecnico_id, categoria, descricao, quantidade, custo_unitario, preco_unitario, custo_total, valor_total, ordem) VALUES (?,?,?,?,?,?,?,?,?)`, [budgetId, item.category, item.description, milliToDb(item.quantityMilli), centsToDb(item.costCents), centsToDb(item.priceCents), centsToDb(item.costTotalCents), centsToDb(item.saleTotalCents), item.order]);
      await connection.commit();
      await audit(user, "UPDATE_TECHNICAL_BUDGET", projetoId, { budgetId, itemCount: calculation.items.length, finalSaleCents: calculation.finalSaleCents, marginCents: calculation.marginCents, composicaoPendente: Boolean(composicaoPendente) });
      res.json({ ok: true, id: budgetId });
    } catch (error: any) {
      await connection.rollback();
      const messages: Record<string, string> = { VALOR_INVALIDO: "Valor de item inválido", QUANTIDADE_INVALIDA: "Quantidade de item inválida", ITEM_INVALIDO: "Categoria ou descrição de item inválida", ITENS_INVALIDOS: "Itens de orçamento inválidos", DESCONTO_INVALIDO: "O desconto não pode superar o valor de venda", STATUS_ORCAMENTO_INVALIDO: "Status de orçamento inválido" };
      if (messages[error?.message]) return res.status(400).json({ error: messages[error.message] });
      console.error("[ProjetosStand] erro ao atualizar orçamento", error); res.status(500).json({ error: "Não foi possível atualizar a versão de orçamento" });
    } finally { connection.release(); }
  });

  r.post("/:id/orcamentos/:orcamentoId/duplicar", requireBudgetEditor, async (req, res) => {
    const connection = await getPool().getConnection();
    try {
      const user = (req as any).crmUser as CrmSession;
      const projetoId = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const sourceId = safeInt(req.params.orcamentoId, 0, 1, Number.MAX_SAFE_INTEGER);
      const source = await getBudgetWithItems(projetoId, sourceId);
      if (!source) return res.status(404).json({ error: "Versão de orçamento não encontrada" });
      const calculation = calculateBudget(source.itens.map((item) => ({ categoria: item.categoria, descricao: item.descricao, quantidade: item.quantidade, custoUnitario: item.custo_unitario, precoUnitario: item.preco_unitario })), source.orcamento.desconto);
      await connection.beginTransaction();
      const [versionRows] = await connection.execute<any[]>("SELECT COALESCE(MAX(numero_versao), 0) + 1 AS proxima FROM crm_orcamentos_tecnicos WHERE projeto_stand_id = ? FOR UPDATE", [projetoId]);
      const version = Number(versionRows?.[0]?.proxima || 1); const title = text(req.body.titulo || `${source.orcamento.titulo} — revisão`, 255);
      const [result] = await connection.execute<any>(`INSERT INTO crm_orcamentos_tecnicos (projeto_stand_id, numero_versao, titulo, status, subtotal_custo, subtotal_venda, desconto, valor_venda_final, margem, margem_percentual, composicao_pendente, observacoes, criado_por, criado_por_nome) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [projetoId, version, title, "rascunho", centsToDb(calculation.subtotalCostCents), centsToDb(calculation.subtotalSaleCents), centsToDb(calculation.discountCents), centsToDb(calculation.finalSaleCents), centsToDb(calculation.marginCents), calculation.marginPct, Number(source.orcamento.composicao_pendente || 0), source.orcamento.observacoes, user.userId, user.name || null]);
      const budgetId = Number(result.insertId);
      for (const item of calculation.items) await connection.execute(`INSERT INTO crm_orcamentos_tecnicos_itens (orcamento_tecnico_id, categoria, descricao, quantidade, custo_unitario, preco_unitario, custo_total, valor_total, ordem) VALUES (?,?,?,?,?,?,?,?,?)`, [budgetId, item.category, item.description, milliToDb(item.quantityMilli), centsToDb(item.costCents), centsToDb(item.priceCents), centsToDb(item.costTotalCents), centsToDb(item.saleTotalCents), item.order]);
      await connection.commit(); await audit(user, "DUPLICATE_TECHNICAL_BUDGET", projetoId, { sourceId, budgetId, version });
      res.status(201).json({ ok: true, id: budgetId, numeroVersao: version });
    } catch (error) { await connection.rollback(); console.error("[ProjetosStand] erro ao duplicar orçamento", error); res.status(500).json({ error: "Não foi possível duplicar a versão de orçamento" }); }
    finally { connection.release(); }
  });

  r.post("/:id/orcamentos/:orcamentoId/enviar", requireBudgetEditor, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const projetoId = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER); const budgetId = safeInt(req.params.orcamentoId, 0, 1, Number.MAX_SAFE_INTEGER);
      const detail = await getBudgetWithItems(projetoId, budgetId); if (!detail) return res.status(404).json({ error: "Versão de orçamento não encontrada" });
      if (isLockedBudget(detail.orcamento.status)) return res.status(409).json({ error: "Esta versão está bloqueada" });
      if (!detail.itens.length || Number(detail.orcamento.valor_venda_final || 0) <= 0) return res.status(400).json({ error: "Inclua ao menos um item e um valor de venda antes de enviar" });
      await db("UPDATE crm_orcamentos_tecnicos SET status='enviada', enviado_em=NOW() WHERE id=?", [budgetId]); await audit(user, "SEND_TECHNICAL_BUDGET", projetoId, { budgetId }); res.json({ ok: true });
    } catch (error) { console.error("[ProjetosStand] erro ao enviar orçamento", error); res.status(500).json({ error: "Não foi possível marcar o orçamento como enviado" }); }
  });

  r.post("/:id/orcamentos/:orcamentoId/aprovar", requireFinanceManager, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const projetoId = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER); const budgetId = safeInt(req.params.orcamentoId, 0, 1, Number.MAX_SAFE_INTEGER);
      const detail = await getBudgetWithItems(projetoId, budgetId); if (!detail) return res.status(404).json({ error: "Versão de orçamento não encontrada" });
      if (detail.orcamento.status !== "enviada") return res.status(409).json({ error: "Somente uma versão enviada pode ser aprovada" });
      if (Number(detail.orcamento.composicao_pendente || 0)) return res.status(409).json({ error: "Conclua e confira a composição interna de custos antes de aprovar este orçamento" });
      if (req.body?.confirmacaoRevisao !== true) return res.status(400).json({ error: "Confirme a revisão de custos, preço, desconto e margem antes de aprovar" });
      await db("UPDATE crm_orcamentos_tecnicos SET status='aprovada', aprovado_por=?, aprovado_por_nome=?, aprovado_em=NOW() WHERE id=?", [user.userId, user.name || null, budgetId]);
      await db("UPDATE crm_orcamentos_tecnicos SET status='substituida' WHERE projeto_stand_id=? AND id<>? AND status='aprovada'", [projetoId, budgetId]);
      await audit(user, "APPROVE_TECHNICAL_BUDGET", projetoId, { budgetId, finalSale: detail.orcamento.valor_venda_final, margin: detail.orcamento.margem }); res.json({ ok: true });
    } catch (error) { console.error("[ProjetosStand] erro ao aprovar orçamento", error); res.status(500).json({ error: "Não foi possível aprovar a versão de orçamento" }); }
  });

  app.use("/api/crm/projetos-stand", r);
}
