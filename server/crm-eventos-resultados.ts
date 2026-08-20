import { Request, Response, Router } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };
const FINANCE_MANAGER_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"]);
const RESULT_STATUSES = new Set(["planejamento", "em_andamento", "pos_evento", "encerrado"]);

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
function safeInt(value: unknown, fallback = 0, min = 0, max = 100000000) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
function safeMoney(value: unknown) {
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("META_RECEITA_INVALIDA");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999999999) throw new Error("META_RECEITA_INVALIDA");
  return Number(parsed.toFixed(2));
}
function text(value: unknown, max = 255) { return String(value ?? "").trim().slice(0, max); }
function nullableText(value: unknown, max = 255) { return text(value, max) || null; }
function sessionToken(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const cookieToken = cookies.crm_session;
  const rawAuth = String(req.headers.authorization || req.headers["x-crm-token"] || "").trim();
  const headerToken = rawAuth.toLowerCase().startsWith("bearer ") ? rawAuth.slice(7).trim() : rawAuth;
  return cookieToken || headerToken || "";
}
function requireFinanceManager(req: Request, res: Response, next: () => void) {
  const token = sessionToken(req);
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSessionFromCrm(token).then((session) => {
    if (!session) return res.status(401).json({ error: "Sessão expirada" });
    const role = String(session.role || "").trim().toLowerCase();
    if (!FINANCE_MANAGER_ROLES.has(role)) return res.status(403).json({ error: "Acesso restrito ao resultado financeiro de eventos" });
    (req as any).crmUser = session;
    next();
  }).catch(() => res.status(500).json({ error: "Não foi possível validar a sessão" }));
}
async function audit(user: CrmSession, action: string, eventoId: number, details: Record<string, unknown>) {
  try {
    await db(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
      [user.userId, action, "crm_eventos_resultados", eventoId, JSON.stringify(details), null],
    );
  } catch (error) {
    console.warn("[EventosResultados] Falha não bloqueante ao registrar auditoria", error);
  }
}
function numberFields(row: any) {
  const normalized: Record<string, any> = { ...(row || {}) };
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)) normalized[key] = Number(value);
  }
  return normalized;
}

export function registerEventosResultadosRoutes(app: any) {
  const r = Router();

  r.get("/:eventoId", requireFinanceManager, async (req, res) => {
    try {
      const eventoId = safeInt(req.params.eventoId, 0, 1);
      const evento = await dbOne<any>("SELECT * FROM crm_eventos WHERE id = ?", [eventoId]);
      if (!evento) return res.status(404).json({ error: "Evento não encontrado" });

      const [resultado, leads, oportunidades, financeiro, projetos, custosPerdidos] = await Promise.all([
        dbOne<any>("SELECT * FROM crm_eventos_resultados WHERE evento_id = ?", [eventoId]),
        dbOne<any>(
          `SELECT COUNT(*) AS total,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('ganho','convertido') THEN 1 ELSE 0 END), 0) AS ganhos,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) IN ('proposta enviada','proposta_enviada','negociacao','negociação','ganho','convertido') THEN 1 ELSE 0 END), 0) AS em_proposta
             FROM crm_leads
            WHERE LOWER(TRIM(COALESCE(evento_interesse, ''))) = LOWER(TRIM(?))`,
          [evento.nome],
        ),
        dbOne<any>(
          `SELECT COUNT(*) AS total,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(etapa, ''))) NOT IN ('perdido','cancelado') THEN COALESCE(valor_estimado, 0) ELSE 0 END), 0) AS valor_em_aberto,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(etapa, ''))) IN ('ganho','fechado ganho','fechado_ganho') THEN COALESCE(valor_estimado, 0) ELSE 0 END), 0) AS valor_ganho,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(etapa, ''))) IN ('proposta','proposta enviada','proposta_enviada','negociacao','negociação','ganho','fechado ganho','fechado_ganho') THEN 1 ELSE 0 END), 0) AS propostas
             FROM crm_oportunidades
            WHERE evento_id = ?`,
          [eventoId],
        ),
        dbOne<any>(
          `SELECT
             COALESCE((SELECT SUM(CASE WHEN LOWER(TRIM(COALESCE(cr.status, ''))) <> 'cancelado' THEN cr.valor ELSE 0 END)
                         FROM crm_contas_receber cr WHERE cr.evento_id = ?), 0) AS receita_faturada,
             COALESCE((SELECT SUM(CASE WHEN LOWER(TRIM(COALESCE(cr.status, ''))) IN ('pago','recebido','baixado') THEN COALESCE(cr.valor_pago, cr.valor) ELSE 0 END)
                         FROM crm_contas_receber cr WHERE cr.evento_id = ?), 0) AS receita_recebida,
             COALESCE((SELECT SUM(CASE WHEN LOWER(TRIM(COALESCE(t.status, ''))) <> 'cancelado' THEN t.valor ELSE 0 END)
                         FROM crm_transacoes t
                        WHERE t.evento_id = ? AND LOWER(TRIM(COALESCE(t.tipo, ''))) IN ('despesa','pagar','contas a pagar')), 0) AS custo_evento,
             COALESCE((SELECT SUM(ra.valor)
                         FROM crm_rateio_alocacoes ra
                         JOIN crm_rateio_regras rr ON rr.id = ra.regra_id
                         JOIN crm_projetos_stand ps ON ps.id = ra.projeto_stand_id
                        WHERE ps.evento_id = ? AND rr.status = 'aprovado'), 0) AS custos_rateados_em_stands`,
          [eventoId, eventoId, eventoId, eventoId],
        ),
        dbOne<any>(
          `SELECT COUNT(*) AS total,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(situacao_comercial, ''))) = 'ganho' THEN 1 ELSE 0 END), 0) AS ganhos,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(situacao_comercial, ''))) = 'perdido' THEN 1 ELSE 0 END), 0) AS perdidos,
                  COALESCE(SUM(CASE WHEN LOWER(TRIM(COALESCE(status, ''))) = 'concluido' THEN 1 ELSE 0 END), 0) AS concluidos
             FROM crm_projetos_stand WHERE evento_id = ?`,
          [eventoId],
        ),
        dbOne<any>(
          `SELECT
             COALESCE((SELECT SUM(t.valor)
                         FROM crm_transacoes t
                         JOIN crm_projetos_stand ps ON ps.id = t.projeto_stand_id
                        WHERE ps.evento_id = ? AND LOWER(TRIM(COALESCE(ps.situacao_comercial, ''))) = 'perdido'
                          AND LOWER(TRIM(COALESCE(t.tipo, ''))) IN ('despesa','pagar','contas a pagar')
                          AND LOWER(TRIM(COALESCE(t.status, ''))) <> 'cancelado'), 0)
             + COALESCE((SELECT SUM(ra.valor)
                         FROM crm_rateio_alocacoes ra
                         JOIN crm_rateio_regras rr ON rr.id = ra.regra_id
                         JOIN crm_projetos_stand ps ON ps.id = ra.projeto_stand_id
                        WHERE ps.evento_id = ? AND LOWER(TRIM(COALESCE(ps.situacao_comercial, ''))) = 'perdido'
                          AND rr.status = 'aprovado'), 0) AS custo_projetos_perdidos`,
          [eventoId, eventoId],
        ),
      ]);

      const metas = numberFields(resultado || {
        evento_id: eventoId,
        status: "planejamento",
        objetivo_comercial: null,
        meta_reunioes: 0,
        reunioes_realizadas: 0,
        meta_leads: 0,
        meta_propostas: 0,
        meta_receita: 0,
        resumo_pos_evento: null,
        aprendizados: null,
        acoes_follow_up: null,
      });
      const indicadores = {
        leads: numberFields(leads),
        oportunidades: numberFields(oportunidades),
        financeiro: numberFields(financeiro),
        projetos: numberFields(projetos),
        custos_perdidos: numberFields(custosPerdidos),
      };
      const receitaFaturada = Number(indicadores.financeiro?.receita_faturada || 0);
      const custoEvento = Number(indicadores.financeiro?.custo_evento || 0);
      const receitaRecebida = Number(indicadores.financeiro?.receita_recebida || 0);
      const receitaMeta = Number(metas.meta_receita || 0);
      res.json({
        evento: numberFields(evento),
        metas,
        indicadores,
        resultado_financeiro: {
          margem_evento: receitaFaturada - custoEvento,
          margem_evento_percentual: receitaFaturada > 0 ? ((receitaFaturada - custoEvento) / receitaFaturada) * 100 : null,
          valor_em_aberto: receitaFaturada - receitaRecebida,
          atingimento_receita_percentual: receitaMeta > 0 ? (receitaFaturada / receitaMeta) * 100 : null,
        },
      });
    } catch (error) {
      console.error("[EventosResultados] erro ao carregar painel", error);
      res.status(500).json({ error: "Não foi possível consolidar o resultado do Evento" });
    }
  });

  r.put("/:eventoId", requireFinanceManager, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const eventoId = safeInt(req.params.eventoId, 0, 1);
      const evento = await dbOne<{ id: number }>("SELECT id FROM crm_eventos WHERE id = ?", [eventoId]);
      if (!evento) return res.status(404).json({ error: "Evento não encontrado" });
      const status = text(req.body.status || "planejamento", 30).toLowerCase();
      if (!RESULT_STATUSES.has(status)) return res.status(400).json({ error: "Status do resultado inválido" });
      const values = {
        objetivoComercial: nullableText(req.body.objetivoComercial ?? req.body.objetivo_comercial, 255),
        metaReunioes: safeInt(req.body.metaReunioes ?? req.body.meta_reunioes, 0),
        reunioesRealizadas: safeInt(req.body.reunioesRealizadas ?? req.body.reunioes_realizadas, 0),
        metaLeads: safeInt(req.body.metaLeads ?? req.body.meta_leads, 0),
        metaPropostas: safeInt(req.body.metaPropostas ?? req.body.meta_propostas, 0),
        metaReceita: safeMoney(req.body.metaReceita ?? req.body.meta_receita),
        resumoPosEvento: nullableText(req.body.resumoPosEvento ?? req.body.resumo_pos_evento, 10000),
        aprendizados: nullableText(req.body.aprendizados, 10000),
        acoesFollowUp: nullableText(req.body.acoesFollowUp ?? req.body.acoes_follow_up, 10000),
      };
      const current = await dbOne<any>("SELECT id, encerrado_em FROM crm_eventos_resultados WHERE evento_id = ?", [eventoId]);
      const isClosing = status === "encerrado";
      if (current) {
        await db(
          `UPDATE crm_eventos_resultados
              SET status=?, objetivo_comercial=?, meta_reunioes=?, reunioes_realizadas=?, meta_leads=?, meta_propostas=?, meta_receita=?,
                  resumo_pos_evento=?, aprendizados=?, acoes_follow_up=?,
                  encerrado_em=${isClosing ? "COALESCE(encerrado_em, NOW())" : "NULL"},
                  encerrado_por=${isClosing ? "COALESCE(encerrado_por, ?)" : "NULL"}, updated_by=?
            WHERE evento_id=?`,
          isClosing
            ? [status, values.objetivoComercial, values.metaReunioes, values.reunioesRealizadas, values.metaLeads, values.metaPropostas, values.metaReceita, values.resumoPosEvento, values.aprendizados, values.acoesFollowUp, user.userId, user.userId, eventoId]
            : [status, values.objetivoComercial, values.metaReunioes, values.reunioesRealizadas, values.metaLeads, values.metaPropostas, values.metaReceita, values.resumoPosEvento, values.aprendizados, values.acoesFollowUp, user.userId, eventoId],
        );
      } else {
        await db(
          `INSERT INTO crm_eventos_resultados
             (evento_id, status, objetivo_comercial, meta_reunioes, reunioes_realizadas, meta_leads, meta_propostas, meta_receita,
              resumo_pos_evento, aprendizados, acoes_follow_up, encerrado_em, encerrado_por, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${isClosing ? "NOW()" : "NULL"}, ?, ?, ?)`,
          [eventoId, status, values.objetivoComercial, values.metaReunioes, values.reunioesRealizadas, values.metaLeads, values.metaPropostas, values.metaReceita, values.resumoPosEvento, values.aprendizados, values.acoesFollowUp, isClosing ? user.userId : null, user.userId, user.userId],
        );
      }
      await audit(user, current ? "UPDATE_EVENT_RESULT" : "CREATE_EVENT_RESULT", eventoId, { status, ...values });
      res.json({ ok: true, eventoId });
    } catch (error: any) {
      if (error?.message === "META_RECEITA_INVALIDA") return res.status(400).json({ error: "A meta de receita deve ser um valor não negativo com até duas casas decimais" });
      console.error("[EventosResultados] erro ao salvar metas", error);
      res.status(500).json({ error: "Não foi possível salvar as metas e o fechamento do Evento" });
    }
  });

  app.use("/api/crm/eventos-resultados", r);
}
