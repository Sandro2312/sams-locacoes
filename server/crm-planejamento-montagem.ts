import { Request, Response, Router } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import crypto from "node:crypto";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };

const OPERATIONAL_WRITERS = new Set([
  "admin", "administrador", "manager", "gerente", "gerencia", "gestor", "gestao",
  "desenvolvedor", "developer", "operacional", "montagem",
]);
const ORDER_TYPES = new Set(["montagem", "desmontagem", "manutencao"]);
const ORDER_STATUSES = new Set(["planejada", "confirmada", "em_andamento", "concluida", "cancelada"]);
const COMPLEXITIES = new Set(["baixa", "media", "alta", "critica"]);
const MATERIAL_STATUSES = new Set(["pendente", "separado", "enviado", "devolvido"]);
const OCCURRENCE_TYPES = new Set(["atraso", "material", "equipe", "logistica", "qualidade", "seguranca", "cliente", "outro"]);
const SEVERITIES = new Set(["baixa", "media", "alta", "critica"]);
const FIELD_CHECKLIST_TEMPLATE = [
  ["pre_local", "Pré-montagem", "Conferir localização, pavilhão e acesso à montagem"],
  ["pre_credenciais", "Pré-montagem", "Confirmar credenciais, carga/descarga e regras da feira"],
  ["pre_materiais", "Pré-montagem", "Conferir materiais e quantidades antes da saída"],
  ["pre_equipe", "Pré-montagem", "Confirmar equipe, funções e janela de trabalho"],
  ["montagem_estrutura", "Estrutura", "Montar estrutura conforme o projeto aprovado"],
  ["montagem_nivelamento", "Estrutura", "Verificar nivelamento, estabilidade e fixações"],
  ["tecnica_eletrica", "Instalações técnicas", "Testar elétrica, iluminação e pontos de energia aplicáveis"],
  ["tecnica_audiovisual", "Instalações técnicas", "Testar equipamentos audiovisuais, LED ou sonorização aplicáveis"],
  ["acabamento_visual", "Acabamento", "Conferir comunicação visual, mobiliário e acabamento"],
  ["acabamento_limpeza", "Acabamento", "Realizar limpeza e organização final do stand"],
  ["entrega_qualidade", "Entrega", "Fazer conferência final de qualidade e segurança"],
  ["entrega_cliente", "Entrega", "Registrar entrega e pendências alinhadas com o cliente"],
] as const;

let pool: mysql.Pool | null = null;
function getPool() {
  if (!pool) pool = mysql.createPool(ENV.databaseUrl);
  return pool;
}
async function db<T = any>(sql: string, params: unknown[] = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}
async function dbOne<T = any>(sql: string, params: unknown[] = []) {
  const rows = await db<T>(sql, params);
  return rows[0] ?? null;
}
function safeInt(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
function text(value: unknown, max = 255) { return String(value ?? "").trim().slice(0, max); }
function nullableText(value: unknown, max = 255) { return text(value, max) || null; }
function bool(value: unknown) { return value === true || value === 1 || value === "1" || String(value ?? "").toLowerCase() === "true"; }
function decimal(value: unknown, max = 9999999999) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!raw) return null;
  if (!/^(?:\d+|\d+\.\d+)$/.test(raw)) throw new Error("DECIMAL_INVALIDO");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) throw new Error("DECIMAL_INVALIDO");
  return parsed.toFixed(2);
}
function dateTime(value: unknown) {
  const raw = text(value, 25);
  if (!raw) return null;
  const normalized = raw.replace("T", " ").replace(/Z$/, "");
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(normalized)) throw new Error("DATA_INVALIDA");
  const parsed = Date.parse(`${normalized.replace(" ", "T").slice(0, 19)}Z`);
  if (Number.isNaN(parsed)) throw new Error("DATA_INVALIDA");
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}
function sessionToken(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const header = String(req.headers.authorization || req.headers["x-crm-token"] || "").trim();
  return cookies.crm_session || (header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header) || "";
}
function requireCrmAuth(req: Request, res: Response, next: () => void) {
  const token = sessionToken(req);
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSessionFromCrm(token).then((session) => {
    if (!session) return res.status(401).json({ error: "Sessão expirada" });
    (req as any).crmUser = session;
    next();
  }).catch(() => res.status(500).json({ error: "Não foi possível validar a sessão" }));
}
function requireOperationalWrite(req: Request, res: Response, next: () => void) {
  requireCrmAuth(req, res, () => {
    const role = text((req as any).crmUser?.role, 80).toLowerCase();
    if (!OPERATIONAL_WRITERS.has(role)) return res.status(403).json({ error: "Acesso restrito ao planejamento operacional" });
    next();
  });
}
async function audit(user: CrmSession, action: string, recordId: number | null, details: Record<string, unknown>, ip?: string) {
  try {
    await db(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
      [user.userId, action, "crm_ordens_servico", recordId, JSON.stringify(details), ip || null],
    );
  } catch (error) {
    console.warn("[PlanejamentoMontagem] Falha não bloqueante de auditoria", error);
  }
}
function validValue(value: unknown, allowed: Set<string>, fallback: string, error: string) {
  const normalized = text(value || fallback, 40).toLowerCase();
  if (!allowed.has(normalized)) throw new Error(error);
  return normalized;
}
function orderCode() { return `OS-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; }
function toPlan(row: any) {
  const plannedStart = row.data_inicio ? new Date(row.data_inicio).getTime() : NaN;
  const plannedEnd = row.data_fim ? new Date(row.data_fim).getTime() : NaN;
  const actualStart = row.data_inicio_real ? new Date(row.data_inicio_real).getTime() : NaN;
  const actualEnd = row.data_fim_real ? new Date(row.data_fim_real).getTime() : NaN;
  const plannedHours = Number.isFinite(plannedStart) && Number.isFinite(plannedEnd) && plannedEnd >= plannedStart ? (plannedEnd - plannedStart) / 3_600_000 : null;
  const actualHours = Number.isFinite(actualStart) && Number.isFinite(actualEnd) && actualEnd >= actualStart ? (actualEnd - actualStart) / 3_600_000 : null;
  return {
    ...row,
    equipe_confirmada: Number(row.equipe_confirmada || 0),
    equipe_total: Number(row.equipe_total || 0),
    materiais_total: Number(row.materiais_total || 0),
    materiais_prontos: Number(row.materiais_prontos || 0),
    ocorrencias_abertas: Number(row.ocorrencias_abertas || 0),
    conflitos_equipe: Number(row.conflitos_equipe || 0),
    horas_planejadas: plannedHours,
    horas_reais: actualHours,
    desvio_horas: plannedHours != null && actualHours != null ? actualHours - plannedHours : null,
  };
}
async function validateRelations(eventoId: number | null, projetoStandId: number | null) {
  if (eventoId) {
    const event = await dbOne<{ id: number }>("SELECT id FROM crm_eventos WHERE id=?", [eventoId]);
    if (!event) throw new Error("EVENTO_INVALIDO");
  }
  if (projetoStandId) {
    const project = await dbOne<{ id: number; evento_id: number }>("SELECT id, evento_id FROM crm_projetos_stand WHERE id=?", [projetoStandId]);
    if (!project) throw new Error("PROJETO_INVALIDO");
    if (eventoId && Number(project.evento_id) !== eventoId) throw new Error("EVENTO_PROJETO_DIVERGENTE");
  }
}
function errorResponse(res: Response, error: any, fallback: string) {
  const messages: Record<string, string> = {
    DATA_INVALIDA: "Informe data e horário válidos",
    DECIMAL_INVALIDO: "Informe um valor numérico válido",
    EVENTO_INVALIDO: "O evento selecionado não existe",
    PROJETO_INVALIDO: "O Projeto de Stand selecionado não existe",
    EVENTO_PROJETO_DIVERGENTE: "O Projeto de Stand não pertence ao evento selecionado",
    STATUS_INVALIDO: "Status operacional inválido",
    TIPO_INVALIDO: "Tipo de Ordem de Serviço inválido",
    COMPLEXIDADE_INVALIDA: "Nível de complexidade inválido",
    MATERIAL_STATUS_INVALIDO: "Status de material inválido",
    OCORRENCIA_TIPO_INVALIDO: "Tipo de ocorrência inválido",
    SEVERIDADE_INVALIDA: "Severidade inválida",
    PERIODO_INVALIDO: "O fim planejado deve ser posterior ao início planejado",
    FINALIZACAO_INCOMPLETA: "Informe início e fim reais antes de concluir a Ordem de Serviço",
  };
  if (messages[error?.message]) return res.status(400).json({ error: messages[error.message] });
  console.error("[PlanejamentoMontagem] erro", error);
  return res.status(500).json({ error: fallback });
}

const PLAN_COLUMNS = `
  os.*, e.nome AS evento_nome, ps.nome AS projeto_stand_nome, ps.codigo AS projeto_stand_codigo,
  COALESCE((SELECT COUNT(*) FROM crm_os_equipe oe WHERE oe.os_id=os.id), 0) AS equipe_total,
  COALESCE((SELECT SUM(oe.confirmado=1) FROM crm_os_equipe oe WHERE oe.os_id=os.id), 0) AS equipe_confirmada,
  COALESCE((SELECT COUNT(*) FROM crm_os_materiais om WHERE om.os_id=os.id), 0) AS materiais_total,
  COALESCE((SELECT SUM(om.status IN ('separado','enviado','devolvido')) FROM crm_os_materiais om WHERE om.os_id=os.id), 0) AS materiais_prontos,
  COALESCE((SELECT COUNT(*) FROM crm_os_ocorrencias oo WHERE oo.os_id=os.id AND oo.resolvida=0), 0) AS ocorrencias_abertas,
  COALESCE((SELECT COUNT(*) FROM crm_os_checklist_itens ci WHERE ci.os_id=os.id), 0) AS checklist_total,
  COALESCE((SELECT SUM(ci.concluido=1) FROM crm_os_checklist_itens ci WHERE ci.os_id=os.id), 0) AS checklist_concluidos,
  COALESCE((SELECT COUNT(DISTINCT other_os.id)
    FROM crm_os_equipe own_team
    JOIN crm_os_equipe other_team ON other_team.user_id=own_team.user_id AND own_team.user_id IS NOT NULL
    JOIN crm_ordens_servico other_os ON other_os.id=other_team.os_id
    WHERE own_team.os_id=os.id
      AND other_os.id<>os.id
      AND other_os.status IN ('planejada','confirmada','em_andamento')
      AND other_os.data_inicio IS NOT NULL AND other_os.data_fim IS NOT NULL
      AND os.data_inicio IS NOT NULL AND os.data_fim IS NOT NULL
      AND other_os.data_inicio < os.data_fim AND other_os.data_fim > os.data_inicio), 0) AS conflitos_equipe`;

export function registerPlanejamentoMontagemRoutes(app: any) {
  const r = Router();

  r.get("/referencias", requireCrmAuth, async (_req, res) => {
    try {
      const [eventos, projetos, usuarios] = await Promise.all([
        db<any>("SELECT id, nome, local, data_inicio, data_fim, status FROM crm_eventos ORDER BY data_inicio DESC, nome ASC LIMIT 300"),
        db<any>("SELECT ps.id, ps.codigo, ps.nome, ps.evento_id, ps.status, e.nome AS evento_nome FROM crm_projetos_stand ps JOIN crm_eventos e ON e.id=ps.evento_id ORDER BY e.nome ASC, ps.nome ASC LIMIT 300"),
        db<any>("SELECT id, name, role FROM crm_users WHERE active=1 ORDER BY name ASC LIMIT 300"),
      ]);
      res.json({ eventos, projetos, usuarios });
    } catch (error) { errorResponse(res, error, "Não foi possível carregar as referências operacionais"); }
  });

  r.get("/indicadores", requireCrmAuth, async (_req, res) => {
    try {
      const [quality, duration, team, materials, complexity] = await Promise.all([
        dbOne<any>(`SELECT
          COUNT(*) AS planos_concluidos,
          SUM(CASE WHEN data_inicio IS NOT NULL AND data_fim IS NOT NULL AND data_inicio_real IS NOT NULL AND data_fim_real IS NOT NULL THEN 1 ELSE 0 END) AS planos_com_tempo_real,
          SUM(CASE WHEN EXISTS(SELECT 1 FROM crm_os_checklist_itens ci WHERE ci.os_id=os.id)
                    AND NOT EXISTS(SELECT 1 FROM crm_os_checklist_itens ci WHERE ci.os_id=os.id AND ci.concluido=0)
                   THEN 1 ELSE 0 END) AS checklists_completos
          FROM crm_ordens_servico os WHERE os.status='concluida'`),
        dbOne<any>(`SELECT
          AVG(TIMESTAMPDIFF(MINUTE, data_inicio, data_fim) / 60) AS horas_planejadas_media,
          AVG(TIMESTAMPDIFF(MINUTE, data_inicio_real, data_fim_real) / 60) AS horas_reais_media,
          AVG((TIMESTAMPDIFF(MINUTE, data_inicio_real, data_fim_real) - TIMESTAMPDIFF(MINUTE, data_inicio, data_fim)) / 60) AS desvio_horas_medio
          FROM crm_ordens_servico
          WHERE status='concluida' AND data_inicio IS NOT NULL AND data_fim IS NOT NULL AND data_inicio_real IS NOT NULL AND data_fim_real IS NOT NULL`),
        dbOne<any>(`SELECT
          COUNT(DISTINCT oe.os_id) AS planos_com_equipe,
          COUNT(DISTINCT CASE WHEN oe.horas_reais IS NOT NULL THEN oe.os_id END) AS planos_com_horas_reais,
          COALESCE(SUM(oe.horas_planejadas), 0) AS horas_planejadas,
          COALESCE(SUM(oe.horas_reais), 0) AS horas_reais
          FROM crm_os_equipe oe JOIN crm_ordens_servico os ON os.id=oe.os_id WHERE os.status='concluida'`),
        dbOne<any>(`SELECT
          COUNT(DISTINCT om.os_id) AS planos_com_materiais,
          COUNT(DISTINCT CASE WHEN om.quantidade_real IS NOT NULL THEN om.os_id END) AS planos_com_quantidade_real,
          COUNT(*) AS itens_materiais,
          SUM(CASE WHEN om.quantidade_real IS NOT NULL THEN 1 ELSE 0 END) AS itens_com_quantidade_real
          FROM crm_os_materiais om JOIN crm_ordens_servico os ON os.id=om.os_id WHERE os.status='concluida'`),
        db<any>(`SELECT complexidade, COUNT(*) AS planos,
          AVG(CASE WHEN data_inicio IS NOT NULL AND data_fim IS NOT NULL AND data_inicio_real IS NOT NULL AND data_fim_real IS NOT NULL THEN (TIMESTAMPDIFF(MINUTE, data_inicio_real, data_fim_real) - TIMESTAMPDIFF(MINUTE, data_inicio, data_fim)) / 60 END) AS desvio_horas_medio
          FROM crm_ordens_servico WHERE status='concluida' GROUP BY complexidade ORDER BY FIELD(complexidade,'baixa','media','alta','critica')`),
      ]);
      const completed = Number(quality?.planos_concluidos || 0);
      const timingSample = Number(quality?.planos_com_tempo_real || 0);
      const teamSample = Number(team?.planos_com_horas_reais || 0);
      const materialSample = Number(materials?.planos_com_quantidade_real || 0);
      res.json({
        somenteLeitura: true,
        qualidade: {
          planosConcluidos: completed,
          planosComTempoReal: timingSample,
          checklistsCompletos: Number(quality?.checklists_completos || 0),
          planosComHorasReais: teamSample,
          planosComMateriaisReais: materialSample,
          amostraSuficiente: completed >= 3 && timingSample >= 3,
          proximoMarco: completed >= 3 && timingSample >= 3 ? "Base mínima atingida para recomendações assistidas." : "Registre pelo menos 3 OS concluídas com prazo planejado e real antes de usar recomendações assistidas.",
        },
        prazo: { horasPlanejadasMedia: Number(duration?.horas_planejadas_media || 0), horasReaisMedia: Number(duration?.horas_reais_media || 0), desvioHorasMedio: Number(duration?.desvio_horas_medio || 0) },
        equipe: { planosComEquipe: Number(team?.planos_com_equipe || 0), planosComHorasReais: teamSample, horasPlanejadas: Number(team?.horas_planejadas || 0), horasReais: Number(team?.horas_reais || 0) },
        materiais: { planosComMateriais: Number(materials?.planos_com_materiais || 0), planosComQuantidadeReal: materialSample, itens: Number(materials?.itens_materiais || 0), itensComQuantidadeReal: Number(materials?.itens_com_quantidade_real || 0) },
        porComplexidade: complexity.map((row: any) => ({ complexidade: row.complexidade || "media", planos: Number(row.planos || 0), desvioHorasMedio: Number(row.desvio_horas_medio || 0) })),
      });
    } catch (error) { errorResponse(res, error, "Não foi possível apurar os indicadores operacionais"); }
  });

  r.get("/", requireCrmAuth, async (req, res) => {
    try {
      const status = text(req.query.status, 30).toLowerCase();
      const eventoId = safeInt(req.query.evento_id ?? req.query.eventoId, 0, 0) || null;
      const busca = text(req.query.busca ?? req.query.q, 120);
      const where = ["1=1"];
      const params: unknown[] = [];
      if (status && ORDER_STATUSES.has(status)) { where.push("os.status=?"); params.push(status); }
      if (eventoId) { where.push("os.evento_id=?"); params.push(eventoId); }
      if (busca) {
        const term = `%${busca}%`;
        where.push("(os.numero LIKE ? OR os.titulo LIKE ? OR e.nome LIKE ? OR ps.nome LIKE ?)");
        params.push(term, term, term, term);
      }
      const rows = await db<any>(`SELECT ${PLAN_COLUMNS}
        FROM crm_ordens_servico os
        LEFT JOIN crm_eventos e ON e.id=os.evento_id
        LEFT JOIN crm_projetos_stand ps ON ps.id=os.projeto_stand_id
        WHERE ${where.join(" AND ")}
        ORDER BY CASE os.status WHEN 'em_andamento' THEN 0 WHEN 'confirmada' THEN 1 WHEN 'planejada' THEN 2 ELSE 3 END, os.data_inicio ASC, os.id DESC`, params);
      res.json({ data: rows.map(toPlan), total: rows.length });
    } catch (error) { errorResponse(res, error, "Não foi possível carregar o planejamento de montagem"); }
  });

  r.get("/:id", requireCrmAuth, async (req, res) => {
    try {
      const id = safeInt(req.params.id, 0, 1);
      const os = await dbOne<any>(`SELECT ${PLAN_COLUMNS}
        FROM crm_ordens_servico os
        LEFT JOIN crm_eventos e ON e.id=os.evento_id
        LEFT JOIN crm_projetos_stand ps ON ps.id=os.projeto_stand_id
        WHERE os.id=?`, [id]);
      if (!os) return res.status(404).json({ error: "Ordem de Serviço não encontrada" });
      const [equipe, materiais, ocorrencias, checklist] = await Promise.all([
        db<any>("SELECT oe.*, u.name AS usuario_nome FROM crm_os_equipe oe LEFT JOIN crm_users u ON u.id=oe.user_id WHERE oe.os_id=? ORDER BY oe.confirmado DESC, COALESCE(u.name, oe.nome_externo) ASC", [id]),
        db<any>("SELECT * FROM crm_os_materiais WHERE os_id=? ORDER BY FIELD(status,'pendente','separado','enviado','devolvido'), descricao ASC", [id]),
        db<any>("SELECT * FROM crm_os_ocorrencias WHERE os_id=? ORDER BY resolvida ASC, created_at DESC", [id]),
        db<any>("SELECT * FROM crm_os_checklist_itens WHERE os_id=? ORDER BY categoria ASC, id ASC", [id]),
      ]);
      res.json({ os: toPlan(os), equipe, materiais, ocorrencias, checklist });
    } catch (error) { errorResponse(res, error, "Não foi possível carregar a Ordem de Serviço"); }
  });

  r.post("/", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const titulo = text(req.body?.titulo, 255);
      const tipo = validValue(req.body?.tipo, ORDER_TYPES, "montagem", "TIPO_INVALIDO");
      const complexidade = validValue(req.body?.complexidade, COMPLEXITIES, "media", "COMPLEXIDADE_INVALIDA");
      const eventoId = safeInt(req.body?.eventoId ?? req.body?.evento_id, 0, 0) || null;
      const projetoStandId = safeInt(req.body?.projetoStandId ?? req.body?.projeto_stand_id, 0, 0) || null;
      const inicio = dateTime(req.body?.dataInicio ?? req.body?.data_inicio);
      const fim = dateTime(req.body?.dataFim ?? req.body?.data_fim);
      if (!titulo) return res.status(400).json({ error: "Título da Ordem de Serviço é obrigatório" });
      if (inicio && fim && fim <= inicio) throw new Error("PERIODO_INVALIDO");
      await validateRelations(eventoId, projetoStandId);
      const responsavelId = safeInt(req.body?.responsavelId ?? req.body?.responsavel_id, user.userId, 1) || user.userId;
      const numero = orderCode();
      const [result] = await getPool().execute<any>(`INSERT INTO crm_ordens_servico
        (numero, titulo, tipo, status, complexidade, contrato_id, oportunidade_id, evento_id, projeto_stand_id, responsavel_id, data_inicio, data_fim, local_evento, credenciais, observacoes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        numero, titulo, tipo, "planejada", complexidade,
        safeInt(req.body?.contratoId ?? req.body?.contrato_id, 0, 0) || null,
        safeInt(req.body?.oportunidadeId ?? req.body?.oportunidade_id, 0, 0) || null,
        eventoId, projetoStandId, responsavelId, inicio, fim,
        nullableText(req.body?.localEvento ?? req.body?.local_evento, 255),
        nullableText(req.body?.credenciais, 4000), nullableText(req.body?.observacoes, 5000),
      ]);
      const id = Number(result.insertId);
      await audit(user, "CREATE_OPERATION_PLAN", id, { numero, titulo, tipo, complexidade, eventoId, projetoStandId }, req.ip);
      res.status(201).json({ ok: true, id, numero });
    } catch (error) { errorResponse(res, error, "Não foi possível criar o Plano de Montagem"); }
  });

  r.put("/:id", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const id = safeInt(req.params.id, 0, 1);
      const current = await dbOne<any>("SELECT * FROM crm_ordens_servico WHERE id=?", [id]);
      if (!current) return res.status(404).json({ error: "Ordem de Serviço não encontrada" });
      const titulo = text(req.body?.titulo ?? current.titulo, 255);
      const tipo = validValue(req.body?.tipo ?? current.tipo, ORDER_TYPES, "montagem", "TIPO_INVALIDO");
      const status = validValue(req.body?.status ?? current.status, ORDER_STATUSES, "planejada", "STATUS_INVALIDO");
      const complexidade = validValue(req.body?.complexidade ?? current.complexidade, COMPLEXITIES, "media", "COMPLEXIDADE_INVALIDA");
      const eventoId = safeInt(req.body?.eventoId ?? req.body?.evento_id, Number(current.evento_id || 0), 0) || null;
      const projetoStandId = safeInt(req.body?.projetoStandId ?? req.body?.projeto_stand_id, Number(current.projeto_stand_id || 0), 0) || null;
      const inicio = dateTime(req.body?.dataInicio ?? req.body?.data_inicio ?? current.data_inicio);
      const fim = dateTime(req.body?.dataFim ?? req.body?.data_fim ?? current.data_fim);
      const inicioReal = dateTime(req.body?.dataInicioReal ?? req.body?.data_inicio_real ?? current.data_inicio_real);
      const fimReal = dateTime(req.body?.dataFimReal ?? req.body?.data_fim_real ?? current.data_fim_real);
      if (!titulo) return res.status(400).json({ error: "Título da Ordem de Serviço é obrigatório" });
      if (inicio && fim && fim <= inicio) throw new Error("PERIODO_INVALIDO");
      if (status === "concluida" && (!inicioReal || !fimReal)) throw new Error("FINALIZACAO_INCOMPLETA");
      if (inicioReal && fimReal && fimReal < inicioReal) throw new Error("DATA_INVALIDA");
      await validateRelations(eventoId, projetoStandId);
      await db(`UPDATE crm_ordens_servico SET titulo=?, tipo=?, status=?, complexidade=?, contrato_id=?, oportunidade_id=?, evento_id=?, projeto_stand_id=?, responsavel_id=?, data_inicio=?, data_fim=?, data_inicio_real=?, data_fim_real=?, local_evento=?, credenciais=?, observacoes=? WHERE id=?`, [
        titulo, tipo, status, complexidade,
        safeInt(req.body?.contratoId ?? req.body?.contrato_id, Number(current.contrato_id || 0), 0) || null,
        safeInt(req.body?.oportunidadeId ?? req.body?.oportunidade_id, Number(current.oportunidade_id || 0), 0) || null,
        eventoId, projetoStandId,
        safeInt(req.body?.responsavelId ?? req.body?.responsavel_id, Number(current.responsavel_id || user.userId), 1) || user.userId,
        inicio, fim, inicioReal, fimReal,
        nullableText(req.body?.localEvento ?? req.body?.local_evento ?? current.local_evento, 255),
        nullableText(req.body?.credenciais ?? current.credenciais, 4000),
        nullableText(req.body?.observacoes ?? current.observacoes, 5000), id,
      ]);
      await audit(user, "UPDATE_OPERATION_PLAN", id, { status, tipo, complexidade, eventoId, projetoStandId }, req.ip);
      res.json({ ok: true, id });
    } catch (error) { errorResponse(res, error, "Não foi possível atualizar o Plano de Montagem"); }
  });

  r.post("/:id/checklist/inicializar", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      if (!await dbOne("SELECT id FROM crm_ordens_servico WHERE id=?", [osId])) return res.status(404).json({ error: "Ordem de Serviço não encontrada" });
      let created = 0;
      for (const [codigo, categoria, titulo] of FIELD_CHECKLIST_TEMPLATE) {
        const [result] = await getPool().execute<any>("INSERT IGNORE INTO crm_os_checklist_itens (os_id,codigo,categoria,titulo,obrigatorio) VALUES (?,?,?,?,1)", [osId, codigo, categoria, titulo]);
        created += Number(result.affectedRows || 0);
      }
      const total = await dbOne<any>("SELECT COUNT(*) AS total FROM crm_os_checklist_itens WHERE os_id=?", [osId]);
      await audit(user, "INITIALIZE_FIELD_CHECKLIST", osId, { created, total: Number(total?.total || 0) }, req.ip);
      res.status(created ? 201 : 200).json({ ok: true, created, total: Number(total?.total || 0) });
    } catch (error) { errorResponse(res, error, "Não foi possível preparar o checklist de campo"); }
  });

  r.put("/:id/checklist/:itemId", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      const itemId = safeInt(req.params.itemId, 0, 1);
      const current = await dbOne<any>("SELECT * FROM crm_os_checklist_itens WHERE id=? AND os_id=?", [itemId, osId]);
      if (!current) return res.status(404).json({ error: "Item de checklist não encontrado" });
      const concluido = Object.prototype.hasOwnProperty.call(req.body || {}, "concluido") ? bool(req.body.concluido) : Boolean(current.concluido);
      const observacao = nullableText(req.body?.observacao ?? current.observacao, 4000);
      await db("UPDATE crm_os_checklist_itens SET concluido=?, observacao=?, concluido_por=?, concluido_por_nome=?, concluido_em=? WHERE id=? AND os_id=?", [
        concluido ? 1 : 0,
        observacao,
        concluido ? user.userId : null,
        concluido ? (user.name || null) : null,
        concluido ? new Date() : null,
        itemId,
        osId,
      ]);
      await audit(user, "UPDATE_FIELD_CHECKLIST_ITEM", osId, { itemId, codigo: current.codigo, concluido, observacao: Boolean(observacao) }, req.ip);
      res.json({ ok: true, id: itemId, concluido });
    } catch (error) { errorResponse(res, error, "Não foi possível atualizar o checklist de campo"); }
  });

  r.post("/:id/equipe", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      if (!await dbOne("SELECT id FROM crm_ordens_servico WHERE id=?", [osId])) return res.status(404).json({ error: "Ordem de Serviço não encontrada" });
      const userId = safeInt(req.body?.userId ?? req.body?.user_id, 0, 0) || null;
      const nomeExterno = nullableText(req.body?.nomeExterno ?? req.body?.nome_externo, 255);
      if (!userId && !nomeExterno) return res.status(400).json({ error: "Selecione um usuário ou informe o nome da pessoa" });
      if (userId && !await dbOne("SELECT id FROM crm_users WHERE id=? AND active=1", [userId])) return res.status(400).json({ error: "Usuário operacional inválido" });
      const [result] = await getPool().execute<any>("INSERT INTO crm_os_equipe (os_id,user_id,nome_externo,funcao,confirmado,horas_planejadas,horas_reais) VALUES (?,?,?,?,?,?,?)", [
        osId, userId, nomeExterno, nullableText(req.body?.funcao, 100), bool(req.body?.confirmado) ? 1 : 0,
        decimal(req.body?.horasPlanejadas ?? req.body?.horas_planejadas, 9999), decimal(req.body?.horasReais ?? req.body?.horas_reais, 9999),
      ]);
      await audit(user, "ADD_OPERATION_TEAM", osId, { equipeId: Number(result.insertId), userId, nomeExterno }, req.ip);
      res.status(201).json({ ok: true, id: Number(result.insertId) });
    } catch (error) { errorResponse(res, error, "Não foi possível adicionar a equipe"); }
  });

  r.put("/:id/equipe/:equipeId", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      const equipeId = safeInt(req.params.equipeId, 0, 1);
      const current = await dbOne<any>("SELECT * FROM crm_os_equipe WHERE id=? AND os_id=?", [equipeId, osId]);
      if (!current) return res.status(404).json({ error: "Integrante não encontrado" });
      await db("UPDATE crm_os_equipe SET funcao=?, confirmado=?, horas_planejadas=?, horas_reais=? WHERE id=? AND os_id=?", [
        nullableText(req.body?.funcao ?? current.funcao, 100),
        req.body?.confirmado === undefined ? Number(current.confirmado || 0) : (bool(req.body?.confirmado) ? 1 : 0),
        decimal(req.body?.horasPlanejadas ?? req.body?.horas_planejadas ?? current.horas_planejadas, 9999),
        decimal(req.body?.horasReais ?? req.body?.horas_reais ?? current.horas_reais, 9999), equipeId, osId,
      ]);
      await audit(user, "UPDATE_OPERATION_TEAM", osId, { equipeId }, req.ip);
      res.json({ ok: true });
    } catch (error) { errorResponse(res, error, "Não foi possível atualizar a equipe"); }
  });

  r.delete("/:id/equipe/:equipeId", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      const equipeId = safeInt(req.params.equipeId, 0, 1);
      const [result] = await getPool().execute<any>("DELETE FROM crm_os_equipe WHERE id=? AND os_id=?", [equipeId, osId]);
      if (!Number(result.affectedRows || 0)) return res.status(404).json({ error: "Integrante não encontrado" });
      await audit(user, "REMOVE_OPERATION_TEAM", osId, { equipeId }, req.ip);
      res.json({ ok: true });
    } catch (error) { errorResponse(res, error, "Não foi possível remover o integrante"); }
  });

  r.post("/:id/materiais", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      if (!await dbOne("SELECT id FROM crm_ordens_servico WHERE id=?", [osId])) return res.status(404).json({ error: "Ordem de Serviço não encontrada" });
      const descricao = text(req.body?.descricao, 255);
      if (!descricao) return res.status(400).json({ error: "Descrição do material é obrigatória" });
      const status = validValue(req.body?.status, MATERIAL_STATUSES, "pendente", "MATERIAL_STATUS_INVALIDO");
      const [result] = await getPool().execute<any>("INSERT INTO crm_os_materiais (os_id,descricao,quantidade,quantidade_real,unidade,status,observacoes) VALUES (?,?,?,?,?,?,?)", [
        osId, descricao, decimal(req.body?.quantidade ?? 1, 999999), decimal(req.body?.quantidadeReal ?? req.body?.quantidade_real, 999999), nullableText(req.body?.unidade, 20) || "un", status, nullableText(req.body?.observacoes, 4000),
      ]);
      await audit(user, "ADD_OPERATION_MATERIAL", osId, { materialId: Number(result.insertId), descricao, status }, req.ip);
      res.status(201).json({ ok: true, id: Number(result.insertId) });
    } catch (error) { errorResponse(res, error, "Não foi possível adicionar o material"); }
  });

  r.put("/:id/materiais/:materialId", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      const materialId = safeInt(req.params.materialId, 0, 1);
      const current = await dbOne<any>("SELECT * FROM crm_os_materiais WHERE id=? AND os_id=?", [materialId, osId]);
      if (!current) return res.status(404).json({ error: "Material não encontrado" });
      const descricao = text(req.body?.descricao ?? current.descricao, 255);
      if (!descricao) return res.status(400).json({ error: "Descrição do material é obrigatória" });
      const status = validValue(req.body?.status ?? current.status, MATERIAL_STATUSES, "pendente", "MATERIAL_STATUS_INVALIDO");
      await db("UPDATE crm_os_materiais SET descricao=?, quantidade=?, quantidade_real=?, unidade=?, status=?, observacoes=? WHERE id=? AND os_id=?", [
        descricao, decimal(req.body?.quantidade ?? current.quantidade, 999999), decimal(req.body?.quantidadeReal ?? req.body?.quantidade_real ?? current.quantidade_real, 999999), nullableText(req.body?.unidade ?? current.unidade, 20) || "un", status, nullableText(req.body?.observacoes ?? current.observacoes, 4000), materialId, osId,
      ]);
      await audit(user, "UPDATE_OPERATION_MATERIAL", osId, { materialId, status }, req.ip);
      res.json({ ok: true });
    } catch (error) { errorResponse(res, error, "Não foi possível atualizar o material"); }
  });

  r.post("/:id/ocorrencias", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      if (!await dbOne("SELECT id FROM crm_ordens_servico WHERE id=?", [osId])) return res.status(404).json({ error: "Ordem de Serviço não encontrada" });
      const tipo = validValue(req.body?.tipo, OCCURRENCE_TYPES, "outro", "OCORRENCIA_TIPO_INVALIDO");
      const severidade = validValue(req.body?.severidade, SEVERITIES, "media", "SEVERIDADE_INVALIDA");
      const descricao = text(req.body?.descricao, 4000);
      if (!descricao) return res.status(400).json({ error: "Descreva a ocorrência operacional" });
      const [result] = await getPool().execute<any>("INSERT INTO crm_os_ocorrencias (os_id,tipo,severidade,descricao,custo_estimado,resolvida,created_by,created_by_nome) VALUES (?,?,?,?,?,?,?,?)", [
        osId, tipo, severidade, descricao, decimal(req.body?.custoEstimado ?? req.body?.custo_estimado, 999999999), bool(req.body?.resolvida) ? 1 : 0, user.userId, user.name || null,
      ]);
      await audit(user, "ADD_OPERATION_ISSUE", osId, { ocorrenciaId: Number(result.insertId), tipo, severidade }, req.ip);
      res.status(201).json({ ok: true, id: Number(result.insertId) });
    } catch (error) { errorResponse(res, error, "Não foi possível registrar a ocorrência"); }
  });

  r.put("/:id/ocorrencias/:ocorrenciaId", requireOperationalWrite, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const osId = safeInt(req.params.id, 0, 1);
      const ocorrenciaId = safeInt(req.params.ocorrenciaId, 0, 1);
      const current = await dbOne<any>("SELECT * FROM crm_os_ocorrencias WHERE id=? AND os_id=?", [ocorrenciaId, osId]);
      if (!current) return res.status(404).json({ error: "Ocorrência não encontrada" });
      const resolvida = req.body?.resolvida === undefined ? Number(current.resolvida || 0) : (bool(req.body.resolvida) ? 1 : 0);
      await db("UPDATE crm_os_ocorrencias SET tipo=?, severidade=?, descricao=?, custo_estimado=?, resolvida=?, resolved_at=? WHERE id=? AND os_id=?", [
        validValue(req.body?.tipo ?? current.tipo, OCCURRENCE_TYPES, "outro", "OCORRENCIA_TIPO_INVALIDO"),
        validValue(req.body?.severidade ?? current.severidade, SEVERITIES, "media", "SEVERIDADE_INVALIDA"),
        text(req.body?.descricao ?? current.descricao, 4000), decimal(req.body?.custoEstimado ?? req.body?.custo_estimado ?? current.custo_estimado, 999999999), resolvida, resolvida ? new Date() : null, ocorrenciaId, osId,
      ]);
      await audit(user, "UPDATE_OPERATION_ISSUE", osId, { ocorrenciaId, resolvida: Boolean(resolvida) }, req.ip);
      res.json({ ok: true });
    } catch (error) { errorResponse(res, error, "Não foi possível atualizar a ocorrência"); }
  });

  app.use("/api/crm/montagem-planejamento", r);
}
