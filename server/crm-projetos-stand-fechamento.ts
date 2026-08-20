import { Router, Request, Response } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };

const FINANCE_MANAGER_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"]);
const GUIDE_EDITOR_ROLES = new Set(Array.from(FINANCE_MANAGER_ROLES).concat(["vendedor", "comercial", "projetos", "montagem"]));
const CLOSING_STATUSES = new Set(["planejamento", "em_preenchimento", "pendente_revisao", "fechado"]);
const ITEM_STATES = new Set(["pendente", "estimado", "lancado", "nao_aplicavel"]);
const ITEM_CATEGORIES = new Set(["receita_parcelas", "projeto", "montagem", "taxas", "comissao_comercial", "comissao_projetista", "logistica", "desmontagem", "rateios", "outros"]);
const REQUIRED_CATEGORIES = ["receita_parcelas", "projeto", "montagem", "taxas", "comissao_comercial", "comissao_projetista", "logistica", "desmontagem", "rateios"];

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
function getSessionToken(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const auth = String(req.headers.authorization || req.headers["x-crm-token"] || "").trim();
  return cookies.crm_session || (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : auth) || "";
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
function isFinanceManager(user: CrmSession) {
  return FINANCE_MANAGER_ROLES.has(String(user?.role || "").trim().toLowerCase());
}
function requireGuideEditor(req: Request, res: Response, next: () => void) {
  requireCrmAuth(req, res, () => {
    const user = (req as any).crmUser as CrmSession;
    if (!GUIDE_EDITOR_ROLES.has(String(user?.role || "").trim().toLowerCase())) return res.status(403).json({ error: "Acesso restrito ao guia de fechamento" });
    next();
  });
}
function safeInt(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
function text(value: unknown, max = 255) { return String(value ?? "").trim().slice(0, max); }
function nullableText(value: unknown, max = 255) { const valueText = text(value, max); return valueText || null; }
function money(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  let raw = String(value).trim().replace(/\s/g, "");
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error("VALOR_INVALIDO");
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric > 999999999999) throw new Error("VALOR_INVALIDO");
  return numeric.toFixed(2);
}
function numeric(value: unknown) { const parsed = Number(value || 0); return Number.isFinite(parsed) ? parsed : 0; }
function asNumberFields(value: any) {
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "string" && /^-?\d+(?:\.\d+)?$/.test(item) ? Number(item) : item]));
}
async function audit(user: CrmSession, action: string, projectId: number, details: Record<string, unknown>) {
  try {
    await db("INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)", [user.userId, action, "crm_projetos_stand_fechamentos", projectId, JSON.stringify(details), null]);
  } catch (error) { console.warn("[FechamentoStand] auditoria não bloqueante", error); }
}

type ChecklistItemInput = { categoria: string; estado: string; valorEstimado: string | null; observacao: string | null };
function normalizeItem(raw: any): ChecklistItemInput {
  const categoria = text(raw?.categoria, 50).toLowerCase();
  const estado = text(raw?.estado || "pendente", 30).toLowerCase();
  if (!ITEM_CATEGORIES.has(categoria)) throw new Error("CATEGORIA_INVALIDA");
  if (!ITEM_STATES.has(estado)) throw new Error("ESTADO_INVALIDO");
  return { categoria, estado, valorEstimado: money(raw?.valorEstimado ?? raw?.valor_estimado), observacao: nullableText(raw?.observacao, 4000) };
}

async function getDashboard(projetoId: number) {
  const projeto = await dbOne<any>(
    `SELECT ps.*, e.nome AS evento_nome, COALESCE(c.nome, l.nome) AS cliente_nome
       FROM crm_projetos_stand ps
       JOIN crm_eventos e ON e.id = ps.evento_id
       LEFT JOIN crm_clientes c ON c.id = ps.cliente_id
       LEFT JOIN crm_leads l ON l.id = ps.lead_id
      WHERE ps.id = ?`, [projetoId],
  );
  if (!projeto) return null;

  const [fechamento, itens, orcamento, receitas, despesas] = await Promise.all([
    dbOne<any>("SELECT * FROM crm_projetos_stand_fechamentos WHERE projeto_stand_id = ?", [projetoId]),
    db<any>(`SELECT i.* FROM crm_projetos_stand_fechamento_itens i
               JOIN crm_projetos_stand_fechamentos f ON f.id = i.fechamento_id
              WHERE f.projeto_stand_id = ? ORDER BY FIELD(i.categoria, 'receita_parcelas','projeto','montagem','taxas','comissao_comercial','comissao_projetista','logistica','desmontagem','rateios','outros'), i.id`, [projetoId]),
    dbOne<any>(`SELECT id, numero_versao, titulo, status, valor_venda_final, subtotal_custo, composicao_pendente
                  FROM crm_orcamentos_tecnicos
                 WHERE projeto_stand_id = ? AND status = 'aprovada'
                 ORDER BY numero_versao DESC LIMIT 1`, [projetoId]),
    dbOne<any>(
      `SELECT COUNT(*) AS parcelas,
              COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) <> 'cancelado' THEN valor ELSE 0 END), 0) AS valor_programado,
              COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('pago','recebido','baixado') THEN COALESCE(valor_pago, valor) ELSE 0 END), 0) AS valor_recebido
         FROM crm_contas_receber WHERE projeto_stand_id = ?`, [projetoId],
    ),
    dbOne<any>(
      `SELECT COUNT(*) AS lancamentos,
              COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) <> 'cancelado' THEN valor ELSE 0 END), 0) AS custo_lancado,
              COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('pago','baixado') THEN valor ELSE 0 END), 0) AS custo_pago,
              COALESCE((SELECT SUM(ra.valor) FROM crm_rateio_alocacoes ra
                        JOIN crm_rateio_regras rr ON rr.id = ra.regra_id
                       WHERE ra.projeto_stand_id = ? AND rr.status = 'aprovado'), 0) AS custo_rateado
         FROM crm_transacoes
        WHERE projeto_stand_id = ?
          AND LOWER(TRIM(COALESCE(tipo, ''))) IN ('despesa','pagar','contas a pagar')`, [projetoId, projetoId],
    ),
  ]);
  const normalizedItems = itens.map(asNumberFields);
  const byCategory = new Map(normalizedItems.map((item: any) => [String(item.categoria), item]));
  const checklist = REQUIRED_CATEGORIES.map((categoria) => byCategory.get(categoria) || { categoria, estado: "pendente", valor_estimado: null, observacao: null });
  const expectedCosts = checklist.reduce((total: number, item: any) => total + numeric(item.valor_estimado), 0);
  const budgetValue = numeric(orcamento?.valor_venda_final);
  const scheduledValue = numeric(receitas?.valor_programado);
  const directCost = numeric(despesas?.custo_lancado);
  const allocatedCost = numeric(despesas?.custo_rateado);
  const pendingInformation = checklist.filter((item: any) => item.estado === "pendente").map((item: any) => item.categoria);
  const estimatedItems = checklist.filter((item: any) => item.estado === "estimado").map((item: any) => item.categoria);
  const divergences: Array<{ codigo: string; mensagem: string; critica: boolean }> = [];
  if (orcamento?.composicao_pendente) divergences.push({ codigo: "composicao_pendente", mensagem: "A versão comercial aprovada ainda indica composição interna pendente.", critica: true });
  if (budgetValue > 0 && Math.abs(budgetValue - scheduledValue) > 0.01) divergences.push({ codigo: "parcelas_divergentes", mensagem: "A soma das parcelas cadastradas diverge do valor da versão comercial aprovada.", critica: true });
  if (expectedCosts > 0 && directCost + allocatedCost < expectedCosts) divergences.push({ codigo: "custos_estimados_sem_cobertura", mensagem: "Há custos estimados acima dos custos e rateios já lançados.", critica: false });
  const criticalDivergences = divergences.filter((item) => item.critica);
  const reviewReady = pendingInformation.length === 0 && criticalDivergences.length === 0;
  return {
    projeto: asNumberFields(projeto),
    fechamento: fechamento ? asNumberFields(fechamento) : { status: "planejamento", justificativa_divergencia: null, observacoes_revisao: null },
    checklist,
    referencia_comercial: orcamento ? asNumberFields(orcamento) : null,
    financeiro: {
      ...asNumberFields(receitas),
      ...asNumberFields(despesas),
      custo_estimado_checklist: expectedCosts,
      custo_total_lancado: directCost + allocatedCost,
      margem_estimada: budgetValue > 0 ? budgetValue - expectedCosts : null,
      margem_lancada: scheduledValue - directCost - allocatedCost,
    },
    pendencias: { informacao: pendingInformation, lancamento_estimado: estimatedItems, divergencias: divergences, pronto_para_revisao: reviewReady },
  };
}

export function registerProjetosStandFechamentoRoutes(app: any) {
  const r = Router();

  r.get("/:id/fechamento", requireGuideEditor, async (req, res) => {
    try {
      const projetoId = safeInt(req.params.id, 0, 1);
      const dashboard = await getDashboard(projetoId);
      if (!dashboard) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      res.json(dashboard);
    } catch (error) {
      console.error("[FechamentoStand] erro ao carregar", error);
      res.status(500).json({ error: "Não foi possível carregar o guia de fechamento" });
    }
  });

  r.put("/:id/fechamento", requireGuideEditor, async (req, res) => {
    const connection = await getPool().getConnection();
    try {
      const user = (req as any).crmUser as CrmSession;
      const projetoId = safeInt(req.params.id, 0, 1);
      const existingProject = await dbOne<{ id: number }>("SELECT id FROM crm_projetos_stand WHERE id = ?", [projetoId]);
      if (!existingProject) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      const status = text(req.body?.status || "em_preenchimento", 30).toLowerCase();
      if (!CLOSING_STATUSES.has(status)) return res.status(400).json({ error: "Status de fechamento inválido" });
      const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
      if (itens.length > ITEM_CATEGORIES.size) return res.status(400).json({ error: "Checklist inválido" });
      const normalizedItems: ChecklistItemInput[] = itens.map(normalizeItem);
      if (new Set(normalizedItems.map((item: ChecklistItemInput) => item.categoria)).size !== normalizedItems.length) return res.status(400).json({ error: "Cada categoria do checklist só pode ser enviada uma vez" });
      const justificativa = nullableText(req.body?.justificativaDivergencia ?? req.body?.justificativa_divergencia, 10000);
      const observacoes = nullableText(req.body?.observacoesRevisao ?? req.body?.observacoes_revisao, 10000);

      const previous = await getDashboard(projetoId);
      if (!previous) return res.status(404).json({ error: "Projeto de Stand não encontrado" });
      const submitted = new Map(normalizedItems.map((item: ChecklistItemInput) => [item.categoria, item]));
      const effectiveChecklist = REQUIRED_CATEGORIES.map((categoria) => submitted.get(categoria) || previous.checklist.find((item: any) => item.categoria === categoria) || { categoria, estado: "pendente" });
      const pendingInformation = effectiveChecklist.filter((item: any) => item.estado === "pendente");
      const critical = Array.isArray(previous.pendencias?.divergencias) ? previous.pendencias.divergencias.filter((item: any) => item.critica) : [];
      if (status === "fechado") {
        if (!isFinanceManager(user)) return res.status(403).json({ error: "Somente a gestão financeira pode fechar o checklist" });
        if (req.body?.confirmacaoRevisao !== true) return res.status(400).json({ error: "Confirme a revisão humana antes de fechar o checklist" });
        if (pendingInformation.length) return res.status(409).json({ error: "Resolva ou classifique todas as categorias pendentes antes de fechar" });
        if (critical.length && !justificativa) return res.status(409).json({ error: "Informe a justificativa para divergências críticas antes de fechar" });
      }

      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO crm_projetos_stand_fechamentos
           (projeto_stand_id, status, justificativa_divergencia, observacoes_revisao, revisado_por, revisado_por_nome, revisado_em, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), justificativa_divergencia=VALUES(justificativa_divergencia), observacoes_revisao=VALUES(observacoes_revisao), revisado_por=VALUES(revisado_por), revisado_por_nome=VALUES(revisado_por_nome), revisado_em=VALUES(revisado_em), updated_by=VALUES(updated_by)`,
        [projetoId, status, justificativa, observacoes, status === "fechado" ? user.userId : null, status === "fechado" ? user.name || null : null, status === "fechado" ? new Date() : null, user.userId, user.userId],
      );
      const [closingRows] = await connection.execute<any[]>("SELECT id FROM crm_projetos_stand_fechamentos WHERE projeto_stand_id = ? FOR UPDATE", [projetoId]);
      const closingId = Number(closingRows?.[0]?.id || 0);
      for (const item of normalizedItems) {
        await connection.execute(
          `INSERT INTO crm_projetos_stand_fechamento_itens
             (fechamento_id, categoria, estado, valor_estimado, observacao, atualizado_por, atualizado_por_nome)
           VALUES (?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE estado=VALUES(estado), valor_estimado=VALUES(valor_estimado), observacao=VALUES(observacao), atualizado_por=VALUES(atualizado_por), atualizado_por_nome=VALUES(atualizado_por_nome)`,
          [closingId, item.categoria, item.estado, item.valorEstimado, item.observacao, user.userId, user.name || null],
        );
      }
      await connection.commit();
      await audit(user, status === "fechado" ? "CLOSE_STAND_CHECKLIST" : "UPDATE_STAND_CHECKLIST", projetoId, { status, categories: normalizedItems.map((item: ChecklistItemInput) => ({ categoria: item.categoria, estado: item.estado })), hasJustification: Boolean(justificativa) });
      const dashboard = await getDashboard(projetoId);
      res.json({ ok: true, ...dashboard });
    } catch (error: any) {
      await connection.rollback();
      const messages: Record<string, string> = { CATEGORIA_INVALIDA: "Categoria de checklist inválida", ESTADO_INVALIDO: "Estado de checklist inválido", VALOR_INVALIDO: "Valor estimado inválido" };
      if (messages[error?.message]) return res.status(400).json({ error: messages[error.message] });
      console.error("[FechamentoStand] erro ao salvar", error);
      res.status(500).json({ error: "Não foi possível salvar o checklist de fechamento" });
    } finally { connection.release(); }
  });

  app.use("/api/crm/projetos-stand", r);
}
