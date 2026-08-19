import { Request, Response, Router } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

type CrmSession = { userId: number; role: string; name: string };
const RAMOS = new Set(["trabalhista", "civel"]);
const STATUSES = new Set(["pre_processual", "em_andamento", "suspenso", "encerrado", "arquivado"]);
const PRAZO_STATUSES = new Set(["pendente", "cumprido", "cancelado"]);
const PRAZO_TYPES = new Set(["audiencia", "prazo_processual", "intimacao", "reuniao", "outro"]);
const LEGAL_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "juridico"]);
const SENSITIVE_ROLES = new Set(["admin", "administrador", "desenvolvedor", "developer", "juridico"]);
const DATAJUD_ENDPOINTS: Record<string, string> = {
  tjsp: "api_publica_tjsp", tjrs: "api_publica_tjrs", tjsc: "api_publica_tjsc",
  tjpr: "api_publica_tjpr", tjmg: "api_publica_tjmg", trt2: "api_publica_trt2", trt15: "api_publica_trt15",
  trt3: "api_publica_trt3", trt4: "api_publica_trt4", trt12: "api_publica_trt12",
  trf1: "api_publica_trf1", trf2: "api_publica_trf2",
  trf3: "api_publica_trf3", trf4: "api_publica_trf4", trf5: "api_publica_trf5",
};
const DOCUMENT_CLASSIFICATIONS = new Set(["peticao", "citacao", "intimacao", "ata_audiencia", "decisao", "sentenca", "acordo", "procuracao", "comprovante", "outro"]);
const DOSSIER_CATEGORIES = new Set(["dossie_geral", "prova", "peca", "jurisprudencia", "comunicacao", "recibo_protocolo", "contrato", "financeiro"]);
const PIECE_TYPES = new Set(["peticao_inicial", "contestacao", "manifestacao", "replica", "recurso", "substabelecimento", "pedido_prazo", "peticao_intermediaria", "modelo_livre"]);
const PIECE_STATUSES = new Set(["rascunho", "em_revisao", "aprovada_para_protocolo", "protocolada"]);
const LEGAL_APPROVAL_ROLES = new Set(["admin", "administrador", "desenvolvedor", "developer", "juridico"]);
const AI_FILE_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const legalAiRateLimits = new Map<string, { count: number; resetAt: number }>();
const LEGAL_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "application/zip", "application/x-zip-compressed",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const legalDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const allowedExtension = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip"].includes(extension);
    if (LEGAL_DOCUMENT_MIME_TYPES.has(String(file.mimetype || "").toLowerCase()) || allowedExtension) return callback(null, true);
    callback(new Error("Tipo de arquivo não permitido. Envie PDF, imagem, Word, Excel, PowerPoint ou ZIP."));
  },
});
function legalUploadMiddleware(req: Request, res: Response, next: () => void) {
  legalDocumentUpload.single("arquivo")(req, res, (error: any) => {
    if (!error) return next();
    const message = error?.code === "LIMIT_FILE_SIZE"
      ? "O documento excede o limite de 25 MB."
      : (error?.message || "Não foi possível processar o documento.");
    res.status(400).json({ error: message });
  });
}

let pool: mysql.Pool | null = null;
function getPool() { if (!pool) pool = mysql.createPool(ENV.databaseUrl); return pool; }
async function db<T = any>(sql: string, params: any[] = []) { const [rows] = await getPool().execute(sql, params); return rows as T[]; }
async function dbOne<T = any>(sql: string, params: any[] = []) { return (await db<T>(sql, params))[0] ?? null; }
function text(value: unknown, max = 255) { return String(value ?? "").trim().slice(0, max); }
function nullableText(value: unknown, max = 255) { const normalized = text(value, max); return normalized || null; }
function safeInt(value: unknown, fallback = 0) { const parsed = Number.parseInt(String(value ?? ""), 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function isoDate(value: unknown) { const raw = text(value, 10); return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null; }
function audienceLink(value: unknown) {
  const raw = nullableText(value, 2000);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo');
    return parsed.toString();
  } catch { throw new Error('Informe um link de audiência válido, iniciado por http:// ou https://.'); }
}
function audienceTime(value: unknown) {
  const raw = nullableText(value, 5);
  if (!raw) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) throw new Error('Informe o horário da audiência no formato HH:MM.');
  return raw;
}
function cnjDigits(value: unknown) { return text(value, 32).replace(/\D/g, "").slice(0, 20); }
function formatCnj(value: unknown) {
  const n = cnjDigits(value);
  return n.length === 20 ? `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}` : null;
}
function generatedCode() { return `JUR-${Date.now().toString(36).toUpperCase()}`; }
function safeFileName(value: unknown) { return path.basename(text(value, 180)).replace(/[^a-zA-Z0-9._-]/g, "_") || "documento"; }
function boundedSetValue(value: unknown, allowed: Set<string>, fallback: string) { const normalized = text(value, 80).toLowerCase(); return allowed.has(normalized) ? normalized : fallback; }
function normalizedTags(value: unknown) { return Array.from(new Set(String(value ?? "").split(",").map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9áàâãéêíóôõúç_-]+/gi, "-").replace(/^-+|-+$/g, "")).filter(Boolean))).slice(0, 20).join(","); }
function parseJson(value: unknown, fallback: any = null) { try { return value ? JSON.parse(String(value)) : fallback; } catch { return fallback; } }
function consumeLegalAiLimit(userId: number, action: string, limit = 4, windowMs = 10 * 60_000) {
  const key = `${userId}:${action}`; const now = Date.now(); const current = legalAiRateLimits.get(key);
  if (!current || current.resetAt <= now) { legalAiRateLimits.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (current.count >= limit) return false;
  current.count += 1; return true;
}
function requireProcessAiAuthorization(processo: any, user: CrmSession) {
  if (!canAccessProcessDocuments(processo, user.role)) throw new Error("Este processo sigiloso exige perfil autorizado.");
  if (Number(processo.ia_autorizada) !== 1) throw new Error("A IA ainda não foi autorizada para este processo. Registre a autorização no cadastro do processo antes de usar esta função.");
}
function sanitizeProcessForAi(processo: any) {
  return { codigo: processo.codigo, titulo: processo.titulo, ramo: processo.ramo_processual, tribunal: processo.tribunal, comarca: processo.comarca, classe: processo.classe_processual, assunto: processo.assunto, distribuicao: processo.data_distribuicao, proximoPrazo: processo.proximo_prazo };
}
function canAccessProcessDocuments(processo: any, role: string) {
  return Number(processo?.sigiloso) !== 1 || SENSITIVE_ROLES.has(String(role || "").toLowerCase());
}
function getSessionToken(req: Request) {
  const cookie = parseCookieHeader(req.headers.cookie || "");
  const candidate = String(cookie.crm_session || req.headers.authorization || req.headers["x-crm-token"] || "").trim();
  return candidate.toLowerCase().startsWith("bearer ") ? candidate.slice(7).trim() : candidate;
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
function requireLegalAccess(req: Request, res: Response, next: () => void) {
  requireCrmAuth(req, res, () => {
    const role = String((req as any).crmUser?.role || "").trim().toLowerCase();
    if (!LEGAL_ROLES.has(role)) return res.status(403).json({ error: "Acesso restrito ao módulo Jurídico" });
    next();
  });
}
async function audit(user: CrmSession, action: string, recordId: number | null, details: Record<string, unknown>) {
  try {
    await db("INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)", [user.userId, action, "crm_processos_juridicos", recordId, JSON.stringify(details), null]);
  } catch (error) { console.warn("[Jurídico] auditoria não registrada", error); }
}
function maskSensitive(processo: any, role: string) {
  if (Number(processo.sigiloso) !== 1 || SENSITIVE_ROLES.has(role)) return processo;
  return { ...processo, parte_externa_nome: "Informação restrita", observacoes: null, titulo: "Processo sigiloso" };
}
async function validateRelations(input: { clienteId: number; leadId: number; fornecedorId: number; eventoId: number; contratoId: number; responsavelId: number }) {
  const checks = await Promise.all([
    input.clienteId ? dbOne("SELECT id FROM crm_clientes WHERE id = ?", [input.clienteId]) : null,
    input.leadId ? dbOne("SELECT id FROM crm_leads WHERE id = ?", [input.leadId]) : null,
    input.fornecedorId ? dbOne("SELECT id FROM crm_fornecedores WHERE id = ?", [input.fornecedorId]) : null,
    input.eventoId ? dbOne("SELECT id FROM crm_eventos WHERE id = ?", [input.eventoId]) : null,
    input.contratoId ? dbOne("SELECT id FROM crm_contratos WHERE id = ?", [input.contratoId]) : null,
    input.responsavelId ? dbOne("SELECT id, name FROM crm_users WHERE id = ? AND active = 1", [input.responsavelId]) : null,
  ]);
  const labels = ["Cliente", "Lead", "Fornecedor", "Evento", "Contrato", "Responsável"];
  const values = [input.clienteId, input.leadId, input.fornecedorId, input.eventoId, input.contratoId, input.responsavelId];
  checks.forEach((row, index) => { if (values[index] && !row) throw new Error(`${labels[index]} inválido`); });
  return checks[5] as { id: number; name: string } | null;
}
function processPayload(body: any, current: any = {}) {
  const ramo = text(body.ramoProcessual ?? body.ramo_processual ?? current.ramo_processual, 20).toLowerCase();
  const status = text(body.status ?? current.status ?? "pre_processual", 30).toLowerCase();
  const numeroCnj = formatCnj(body.numeroCnj ?? body.numero_cnj ?? current.numero_cnj);
  const clienteId = safeInt(body.clienteId ?? body.cliente_id ?? current.cliente_id);
  const leadId = safeInt(body.leadId ?? body.lead_id ?? current.lead_id);
  const fornecedorId = safeInt(body.fornecedorId ?? body.fornecedor_id ?? current.fornecedor_id);
  const eventoId = safeInt(body.eventoId ?? body.evento_id ?? current.evento_id);
  const contratoId = safeInt(body.contratoId ?? body.contrato_id ?? current.contrato_id);
  const responsavelId = safeInt(body.responsavelId ?? body.responsavel_id ?? current.responsavel_id);
  const valorRaw = String(body.valorCausa ?? body.valor_causa ?? current.valor_causa ?? "").replace(/\./g, "").replace(",", ".");
  const valorCausa = valorRaw ? Number(valorRaw) : null;
  if (!RAMOS.has(ramo)) throw new Error("Selecione o ramo Trabalhista ou Cível");
  if (!STATUSES.has(status)) throw new Error("Status processual inválido");
  const titulo = text(body.titulo ?? current.titulo, 255);
  if (!titulo) throw new Error("Título do processo é obrigatório");
  return {
    titulo, ramo, status, numeroCnj, clienteId: clienteId || null, leadId: leadId || null, fornecedorId: fornecedorId || null,
    eventoId: eventoId || null, contratoId: contratoId || null, responsavelId: responsavelId || null,
    sigiloso: body.sigiloso === true || body.sigiloso === 1 || body.sigiloso === "1" ? 1 : 0,
    iaAutorizada: body.iaAutorizada === true || body.iaAutorizada === 1 || body.iaAutorizada === "1" || (body.iaAutorizada === undefined && Number(current.ia_autorizada) === 1) ? 1 : 0,
    tribunal: nullableText(body.tribunal ?? current.tribunal, 120), uf: nullableText(body.uf ?? current.uf, 2)?.toUpperCase() || null,
    comarca: nullableText(body.comarca ?? current.comarca, 120), vara: nullableText(body.vara ?? current.vara, 180),
    grau: nullableText(body.grau ?? current.grau, 40), classeProcessual: nullableText(body.classeProcessual ?? body.classe_processual ?? current.classe_processual, 180),
    assunto: nullableText(body.assunto ?? current.assunto, 255), poloEmpresa: nullableText(body.poloEmpresa ?? body.polo_empresa ?? current.polo_empresa, 30),
    valorCausa: Number.isFinite(valorCausa) ? valorCausa : null, parteExternaNome: nullableText(body.parteExternaNome ?? body.parte_externa_nome ?? current.parte_externa_nome, 255),
    dataDistribuicao: isoDate(body.dataDistribuicao ?? body.data_distribuicao ?? current.data_distribuicao), proximoPrazo: isoDate(body.proximoPrazo ?? body.proximo_prazo ?? current.proximo_prazo),
    observacoes: nullableText(body.observacoes ?? current.observacoes, 8000),
  };
}
function summarizeDatajud(source: any) {
  const movements = Array.isArray(source?.movimentos) ? source.movimentos : [];
  const latest = movements[0] || {};
  const classe = source?.classe?.nome || source?.classe?.codigo || null;
  const assuntos = Array.isArray(source?.assuntos) ? source.assuntos.map((a: any) => a.nome || a.codigo).filter(Boolean).slice(0, 3) : [];
  return { classeProcessual: classe ? String(classe).slice(0, 180) : null, assunto: assuntos.join("; ").slice(0, 255) || null, ultimaMovimentacao: latest?.nome ? String(latest.nome).slice(0, 500) : null, movimentacoes: movements.length };
}

export function registerJuridicoRoutes(app: any) {
  const r = Router();

  r.get("/processos", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const ramo = text(req.query.ramo, 20).toLowerCase();
      const status = text(req.query.status, 30).toLowerCase();
      const busca = text(req.query.busca ?? req.query.q, 120);
      const where: string[] = ["1=1"]; const params: any[] = [];
      if (RAMOS.has(ramo)) { where.push("p.ramo_processual = ?"); params.push(ramo); }
      if (STATUSES.has(status)) { where.push("p.status = ?"); params.push(status); }
      if (busca) { const term = `%${busca}%`; where.push("(p.numero_cnj LIKE ? OR p.titulo LIKE ? OR p.tribunal LIKE ? OR p.comarca LIKE ?)"); params.push(term, term, term, term); }
      const data = await db<any>(`SELECT p.*, c.nome AS cliente_nome, l.nome AS lead_nome,
        (SELECT COUNT(*) FROM crm_processos_juridicos_prazos pp WHERE pp.processo_id = p.id AND pp.status = 'pendente') AS prazos_abertos
        FROM crm_processos_juridicos p
        LEFT JOIN crm_clientes c ON c.id = p.cliente_id LEFT JOIN crm_leads l ON l.id = p.lead_id
        WHERE ${where.join(" AND ")} ORDER BY COALESCE(p.proximo_prazo, '9999-12-31'), p.updated_at DESC`, params);
      res.json({ data: data.map((row) => maskSensitive(row, String(user.role || "").toLowerCase())) });
    } catch (error) { console.error("[Jurídico] listar processos", error); res.status(500).json({ error: "Não foi possível carregar os processos" }); }
  });

  r.get("/processos/:id", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const id = safeInt(req.params.id);
      const processo = await dbOne<any>(`SELECT p.*, c.nome AS cliente_nome, l.nome AS lead_nome FROM crm_processos_juridicos p
        LEFT JOIN crm_clientes c ON c.id = p.cliente_id LEFT JOIN crm_leads l ON l.id = p.lead_id WHERE p.id = ?`, [id]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      const documentosRestritos = !canAccessProcessDocuments(processo, String(user.role || "").toLowerCase());
      const documentosPromise = documentosRestritos ? Promise.resolve<any[]>([]) : db<any>(`SELECT d.id AS vinculo_id, d.classificacao, d.categoria_dossie, d.tags_dossie, d.observacao, d.created_at AS anexado_em, d.anexado_por_nome,
        a.id AS acervo_id, a.nome, a.descricao, a.tipo_doc, a.url_arquivo, a.url_drive, a.nome_arquivo_original, a.tamanho_bytes, a.mime_type, a.tags
        FROM crm_processos_juridicos_documentos d JOIN crm_acervo a ON a.id = d.acervo_id
        WHERE d.processo_id = ? ORDER BY d.created_at DESC`, [id]);
      const [prazos, consultas, documentos, pecas, iaAnalises, prazoDocumentos] = await Promise.all([
        db<any>("SELECT * FROM crm_processos_juridicos_prazos WHERE processo_id = ? ORDER BY data_prazo ASC", [id]),
        db<any>("SELECT id, fonte, numero_consultado, sucesso, resumo, consultado_em FROM crm_processos_juridicos_consultas WHERE processo_id = ? ORDER BY consultado_em DESC LIMIT 20", [id]),
        documentosPromise,
        documentosRestritos ? Promise.resolve<any[]>([]) : db<any>("SELECT id, titulo, tipo, status, versao_atual, aprovado_por_nome, aprovado_em, protocolo_numero, protocolado_em, created_at, updated_at FROM crm_processos_juridicos_pecas WHERE processo_id = ? ORDER BY updated_at DESC", [id]),
        documentosRestritos ? Promise.resolve<any[]>([]) : db<any>("SELECT id, documento_vinculo_id, tipo, status, resultado, fontes, modelo, gerado_por_nome, created_at FROM crm_processos_juridicos_ia_analises WHERE processo_id = ? ORDER BY created_at DESC LIMIT 20", [id]),
        documentosRestritos ? Promise.resolve<any[]>([]) : db<any>(`SELECT pd.prazo_id, d.id AS vinculo_id, d.classificacao, d.observacao, d.created_at AS anexado_em,
          a.id AS acervo_id, a.nome, a.url_arquivo, a.nome_arquivo_original, a.tamanho_bytes, a.mime_type
          FROM crm_processos_juridicos_prazos_documentos pd
          JOIN crm_processos_juridicos_documentos d ON d.id = pd.documento_vinculo_id
          JOIN crm_acervo a ON a.id = d.acervo_id
          WHERE d.processo_id = ? ORDER BY pd.created_at DESC`, [id]),
      ]);
      const documentosPorPrazo = new Map<number, any[]>();
      prazoDocumentos.forEach((documento) => {
        const prazoId = Number(documento.prazo_id);
        documentosPorPrazo.set(prazoId, [...(documentosPorPrazo.get(prazoId) || []), documento]);
      });
      await audit(user, "VIEW", id, { sigiloso: Number(processo.sigiloso) === 1 });
      res.json({ processo: maskSensitive(processo, String(user.role || "").toLowerCase()), prazos: prazos.map((prazo) => ({ ...prazo, documentos: documentosPorPrazo.get(Number(prazo.id)) || [] })), consultas, documentos, pecas, iaAnalises: iaAnalises.map((item) => ({ ...item, resultado: parseJson(item.resultado, {}), fontes: parseJson(item.fontes, []) })), documentosRestritos });
    } catch (error) { console.error("[Jurídico] detalhe", error); res.status(500).json({ error: "Não foi possível carregar o processo" }); }
  });

  r.post("/processos", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const payload = processPayload(req.body);
      const responsible = await validateRelations({ ...payload, clienteId: payload.clienteId || 0, leadId: payload.leadId || 0, fornecedorId: payload.fornecedorId || 0, eventoId: payload.eventoId || 0, contratoId: payload.contratoId || 0, responsavelId: payload.responsavelId || 0 });
      const codigo = text(req.body.codigo, 40) || generatedCode();
      const [result] = await getPool().execute(`INSERT INTO crm_processos_juridicos (codigo, numero_cnj, titulo, ramo_processual, status, sigiloso, tribunal, uf, comarca, vara, grau, classe_processual, assunto, polo_empresa, valor_causa, cliente_id, lead_id, fornecedor_id, evento_id, contrato_id, parte_externa_nome, responsavel_id, responsavel_nome, data_distribuicao, proximo_prazo, ia_autorizada, ia_autorizada_em, ia_autorizada_por, observacoes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        codigo, payload.numeroCnj, payload.titulo, payload.ramo, payload.status, payload.sigiloso, payload.tribunal, payload.uf, payload.comarca, payload.vara, payload.grau, payload.classeProcessual, payload.assunto, payload.poloEmpresa, payload.valorCausa, payload.clienteId, payload.leadId, payload.fornecedorId, payload.eventoId, payload.contratoId, payload.parteExternaNome, payload.responsavelId, responsible?.name || null, payload.dataDistribuicao, payload.proximoPrazo, payload.iaAutorizada, payload.iaAutorizada ? new Date() : null, payload.iaAutorizada ? user.userId : null, payload.observacoes, user.userId,
      ]);
      const id = Number((result as any).insertId);
      await audit(user, "CREATE", id, { codigo, ramo: payload.ramo, numeroCnj: payload.numeroCnj, sigiloso: payload.sigiloso, iaAutorizada: payload.iaAutorizada });
      res.status(201).json({ ok: true, id, codigo });
    } catch (error: any) {
      if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Já existe um processo com este número CNJ ou código" });
      res.status(400).json({ error: error?.message || "Não foi possível criar o processo" });
    }
  });

  r.put("/processos/:id", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const id = safeInt(req.params.id); const current = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [id]);
      if (!current) return res.status(404).json({ error: "Processo não encontrado" });
      const payload = processPayload(req.body, current);
      const responsible = await validateRelations({ ...payload, clienteId: payload.clienteId || 0, leadId: payload.leadId || 0, fornecedorId: payload.fornecedorId || 0, eventoId: payload.eventoId || 0, contratoId: payload.contratoId || 0, responsavelId: payload.responsavelId || 0 });
      const iaAuthorizedNow = Number(current.ia_autorizada) !== 1 && payload.iaAutorizada === 1;
      const iaRevokedNow = Number(current.ia_autorizada) === 1 && payload.iaAutorizada !== 1;
      await getPool().execute(`UPDATE crm_processos_juridicos SET numero_cnj=?, titulo=?, ramo_processual=?, status=?, sigiloso=?, tribunal=?, uf=?, comarca=?, vara=?, grau=?, classe_processual=?, assunto=?, polo_empresa=?, valor_causa=?, cliente_id=?, lead_id=?, fornecedor_id=?, evento_id=?, contrato_id=?, parte_externa_nome=?, responsavel_id=?, responsavel_nome=?, data_distribuicao=?, proximo_prazo=?, ia_autorizada=?, ia_autorizada_em=?, ia_autorizada_por=?, observacoes=? WHERE id=?`, [
        payload.numeroCnj, payload.titulo, payload.ramo, payload.status, payload.sigiloso, payload.tribunal, payload.uf, payload.comarca, payload.vara, payload.grau, payload.classeProcessual, payload.assunto, payload.poloEmpresa, payload.valorCausa, payload.clienteId, payload.leadId, payload.fornecedorId, payload.eventoId, payload.contratoId, payload.parteExternaNome, payload.responsavelId, responsible?.name || null, payload.dataDistribuicao, payload.proximoPrazo, payload.iaAutorizada, iaAuthorizedNow ? new Date() : iaRevokedNow ? null : current.ia_autorizada_em, iaAuthorizedNow ? user.userId : iaRevokedNow ? null : current.ia_autorizada_por, payload.observacoes, id,
      ]);
      await audit(user, "UPDATE", id, { ramo: payload.ramo, status: payload.status, sigiloso: payload.sigiloso, iaAutorizada: payload.iaAutorizada });
      res.json({ ok: true });
    } catch (error: any) { if (error?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Já existe um processo com este número CNJ" }); res.status(400).json({ error: error?.message || "Não foi possível atualizar o processo" }); }
  });

  r.post("/processos/:id/documentos", requireLegalAccess, legalUploadMiddleware, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const processoId = safeInt(req.params.id);
      const processo = await dbOne<any>(`SELECT p.*, c.nome AS cliente_nome, e.nome AS evento_nome FROM crm_processos_juridicos p
        LEFT JOIN crm_clientes c ON c.id = p.cliente_id LEFT JOIN crm_eventos e ON e.id = p.evento_id WHERE p.id = ?`, [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Documentos deste processo sigiloso são restritos ao perfil autorizado." });
      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: "Selecione um documento para anexar." });

      const classificacaoRaw = text(req.body.classificacao, 60).toLowerCase();
      const classificacao = DOCUMENT_CLASSIFICATIONS.has(classificacaoRaw) ? classificacaoRaw : "outro";
      const categoriaDossie = boundedSetValue(req.body.categoriaDossie ?? req.body.categoria_dossie, DOSSIER_CATEGORIES, "dossie_geral");
      const tagsDossie = normalizedTags(req.body.tagsDossie ?? req.body.tags_dossie);
      const nome = text(req.body.nome, 500) || file.originalname;
      const observacao = nullableText(req.body.observacao, 4000);
      const extension = path.extname(file.originalname || "").toLowerCase();
      const storageKey = `juridico/processo-${processoId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safeFileName(file.originalname)}${extension && !safeFileName(file.originalname).toLowerCase().endsWith(extension) ? extension : ""}`;
      const stored = await storagePut(storageKey, file.buffer, file.mimetype);
      const ano = processo.data_distribuicao ? Number(String(processo.data_distribuicao).slice(0, 4)) : new Date().getFullYear();
      const tags = ["juridico", "processo", processo.codigo, classificacao].filter(Boolean).join(",");
      const [acervoResult] = await getPool().execute(`INSERT INTO crm_acervo
        (nome, descricao, tipo_doc, evento_id, evento_nome, cliente_id, cliente_nome, ano, url_arquivo, nome_arquivo_original, tamanho_bytes, mime_type, s3_key, tags, criado_por, criado_por_nome)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        nome, observacao, "outro", processo.evento_id || null, processo.evento_nome || null, processo.cliente_id || null, processo.cliente_nome || null, ano,
        stored.url, file.originalname, file.size, file.mimetype, stored.key, tags, user.userId, user.name || null,
      ]);
      const acervoId = Number((acervoResult as any).insertId);
      const [linkResult] = await getPool().execute("INSERT INTO crm_processos_juridicos_documentos (processo_id, acervo_id, classificacao, categoria_dossie, tags_dossie, observacao, anexado_por, anexado_por_nome) VALUES (?,?,?,?,?,?,?,?)", [processoId, acervoId, classificacao, categoriaDossie, tagsDossie || null, observacao, user.userId, user.name || null]);
      await audit(user, "ATTACH_DOCUMENT", processoId, { vinculoId: Number((linkResult as any).insertId), acervoId, classificacao, categoriaDossie, tagsDossie: tagsDossie ? tagsDossie.split(",") : [], nomeArquivo: file.originalname, tamanhoBytes: file.size });
      res.status(201).json({ ok: true, vinculoId: Number((linkResult as any).insertId), acervoId, nome, urlArquivo: stored.url });
    } catch (error: any) {
      console.error("[Jurídico] anexar documento", error);
      res.status(500).json({ error: "Não foi possível anexar o documento ao processo." });
    }
  });

  r.delete("/processos/:id/documentos/:vinculoId", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const processoId = safeInt(req.params.id); const vinculoId = safeInt(req.params.vinculoId);
      const processo = await dbOne<any>("SELECT id, sigiloso FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Documentos deste processo sigiloso são restritos ao perfil autorizado." });
      const vinculo = await dbOne<any>("SELECT id, acervo_id FROM crm_processos_juridicos_documentos WHERE id = ? AND processo_id = ?", [vinculoId, processoId]);
      if (!vinculo) return res.status(404).json({ error: "Vínculo de documento não encontrado" });
      await getPool().execute("DELETE FROM crm_processos_juridicos_documentos WHERE id = ? AND processo_id = ?", [vinculoId, processoId]);
      await audit(user, "DETACH_DOCUMENT", processoId, { vinculoId, acervoId: vinculo.acervo_id });
      res.json({ ok: true, message: "Documento desvinculado do processo. O registro original foi preservado no Acervo." });
    } catch (error) { console.error("[Jurídico] desvincular documento", error); res.status(500).json({ error: "Não foi possível desvincular o documento." }); }
  });

  r.patch("/processos/:id/documentos/:vinculoId/organizacao", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const vinculoId = safeInt(req.params.vinculoId);
      const processo = await dbOne<any>("SELECT id, sigiloso FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Documentos deste processo sigiloso são restritos ao perfil autorizado." });
      const vinculo = await dbOne<any>("SELECT id FROM crm_processos_juridicos_documentos WHERE id = ? AND processo_id = ?", [vinculoId, processoId]);
      if (!vinculo) return res.status(404).json({ error: "Documento vinculado não encontrado" });
      const categoriaDossie = boundedSetValue(req.body?.categoriaDossie ?? req.body?.categoria_dossie, DOSSIER_CATEGORIES, "dossie_geral");
      const tagsDossie = normalizedTags(req.body?.tagsDossie ?? req.body?.tags_dossie);
      await getPool().execute("UPDATE crm_processos_juridicos_documentos SET categoria_dossie = ?, tags_dossie = ? WHERE id = ? AND processo_id = ?", [categoriaDossie, tagsDossie || null, vinculoId, processoId]);
      await audit(user, "ORGANIZE_DOCUMENT", processoId, { vinculoId, categoriaDossie, tagsDossie: tagsDossie ? tagsDossie.split(",") : [] });
      res.json({ ok: true, categoriaDossie, tagsDossie });
    } catch (error) { console.error("[Jurídico] organizar documento", error); res.status(500).json({ error: "Não foi possível atualizar a organização do documento." }); }
  });

  r.get("/processos/:id/pecas/:pecaId", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const pecaId = safeInt(req.params.pecaId);
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Peças deste processo sigiloso são restritas ao perfil autorizado." });
      const peca = await dbOne<any>("SELECT * FROM crm_processos_juridicos_pecas WHERE id = ? AND processo_id = ?", [pecaId, processoId]);
      if (!peca) return res.status(404).json({ error: "Peça não encontrada" });
      const versoes = await db<any>("SELECT id, versao, conteudo, resumo_alteracoes, created_by_nome, created_at FROM crm_processos_juridicos_pecas_versoes WHERE peca_id = ? ORDER BY versao DESC", [pecaId]);
      res.json({ peca: { ...peca, checklist: parseJson(peca.checklist, []) }, versoes });
    } catch (error) { console.error("[Jurídico] detalhe peça", error); res.status(500).json({ error: "Não foi possível abrir a peça." }); }
  });

  r.post("/processos/:id/pecas", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id);
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Peças deste processo sigiloso são restritas ao perfil autorizado." });
      const titulo = text(req.body?.titulo, 255); const tipo = boundedSetValue(req.body?.tipo, PIECE_TYPES, "peticao_intermediaria"); const conteudo = text(req.body?.conteudo, 60_000);
      if (!titulo) return res.status(400).json({ error: "Informe o título da peça." });
      const checklist = Array.isArray(req.body?.checklist) ? req.body.checklist.map((item: any) => ({ id: text(item?.id, 60), titulo: text(item?.titulo, 180), concluido: Boolean(item?.concluido) })).filter((item: any) => item.id && item.titulo).slice(0, 30) : [];
      const [result] = await getPool().execute("INSERT INTO crm_processos_juridicos_pecas (processo_id, titulo, tipo, conteudo, checklist, created_by, created_by_nome) VALUES (?,?,?,?,?,?,?)", [processoId, titulo, tipo, conteudo || null, JSON.stringify(checklist), user.userId, user.name || null]);
      const pecaId = Number((result as any).insertId);
      await getPool().execute("INSERT INTO crm_processos_juridicos_pecas_versoes (peca_id, versao, conteudo, resumo_alteracoes, created_by, created_by_nome) VALUES (?,?,?,?,?,?)", [pecaId, 1, conteudo || "", "Criação do rascunho", user.userId, user.name || null]);
      await audit(user, "CREATE_DRAFT", processoId, { pecaId, tipo, titulo });
      res.status(201).json({ ok: true, id: pecaId, versao: 1 });
    } catch (error) { console.error("[Jurídico] criar peça", error); res.status(500).json({ error: "Não foi possível criar o rascunho." }); }
  });

  r.put("/processos/:id/pecas/:pecaId", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const pecaId = safeInt(req.params.pecaId);
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Peças deste processo sigiloso são restritas ao perfil autorizado." });
      const peca = await dbOne<any>("SELECT * FROM crm_processos_juridicos_pecas WHERE id = ? AND processo_id = ?", [pecaId, processoId]);
      if (!peca) return res.status(404).json({ error: "Peça não encontrada" });
      if (peca.status === "protocolada") return res.status(409).json({ error: "A peça já está marcada como protocolada e não pode ser alterada." });
      const expectedVersion = safeInt(req.body?.versaoAtual ?? req.body?.versao_atual);
      if (!expectedVersion || expectedVersion !== Number(peca.versao_atual)) return res.status(409).json({ error: "Esta peça foi atualizada por outra pessoa. Reabra o rascunho antes de salvar." });
      const titulo = text(req.body?.titulo, 255) || peca.titulo; const tipo = boundedSetValue(req.body?.tipo, PIECE_TYPES, peca.tipo); const conteudo = text(req.body?.conteudo, 60_000);
      const status = boundedSetValue(req.body?.status, PIECE_STATUSES, peca.status);
      if (["aprovada_para_protocolo", "protocolada"].includes(status)) return res.status(400).json({ error: "Use as ações de aprovação e protocolo após a revisão profissional." });
      const checklist = Array.isArray(req.body?.checklist) ? req.body.checklist.map((item: any) => ({ id: text(item?.id, 60), titulo: text(item?.titulo, 180), concluido: Boolean(item?.concluido) })).filter((item: any) => item.id && item.titulo).slice(0, 30) : parseJson(peca.checklist, []);
      const nextVersion = Number(peca.versao_atual) + 1;
      await getPool().execute("UPDATE crm_processos_juridicos_pecas SET titulo=?, tipo=?, status=?, conteudo=?, checklist=?, versao_atual=? WHERE id=? AND processo_id=?", [titulo, tipo, status, conteudo || null, JSON.stringify(checklist), nextVersion, pecaId, processoId]);
      await getPool().execute("INSERT INTO crm_processos_juridicos_pecas_versoes (peca_id, versao, conteudo, resumo_alteracoes, created_by, created_by_nome) VALUES (?,?,?,?,?,?)", [pecaId, nextVersion, conteudo || "", nullableText(req.body?.resumoAlteracoes, 500) || "Revisão do rascunho", user.userId, user.name || null]);
      await audit(user, "UPDATE_DRAFT", processoId, { pecaId, versao: nextVersion, status });
      res.json({ ok: true, versao: nextVersion });
    } catch (error) { console.error("[Jurídico] atualizar peça", error); res.status(500).json({ error: "Não foi possível salvar o rascunho." }); }
  });

  r.post("/processos/:id/pecas/:pecaId/aprovar", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const pecaId = safeInt(req.params.pecaId);
      if (!LEGAL_APPROVAL_ROLES.has(String(user.role || "").toLowerCase())) return res.status(403).json({ error: "Seu perfil não pode aprovar peças para protocolo." });
      if (req.body?.confirmacaoRevisao !== true) return res.status(400).json({ error: "Confirme que a revisão profissional foi concluída antes de aprovar." });
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]); const peca = await dbOne<any>("SELECT * FROM crm_processos_juridicos_pecas WHERE id = ? AND processo_id = ?", [pecaId, processoId]);
      if (!processo || !peca) return res.status(404).json({ error: "Processo ou peça não encontrados" });
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Peças deste processo sigiloso são restritas ao perfil autorizado." });
      if (peca.status === "protocolada") return res.status(409).json({ error: "A peça já foi protocolada." });
      const checklist = parseJson(peca.checklist, []); if (Array.isArray(checklist) && checklist.some((item: any) => !item?.concluido)) return res.status(400).json({ error: "Conclua o checklist antes de aprovar a peça." });
      await getPool().execute("UPDATE crm_processos_juridicos_pecas SET status='aprovada_para_protocolo', aprovado_por=?, aprovado_por_nome=?, aprovado_em=CURRENT_TIMESTAMP WHERE id=? AND processo_id=?", [user.userId, user.name || null, pecaId, processoId]);
      await audit(user, "APPROVE_DRAFT", processoId, { pecaId, confirmacaoRevisao: true });
      res.json({ ok: true, message: "Peça aprovada para protocolo manual no portal oficial." });
    } catch (error) { console.error("[Jurídico] aprovar peça", error); res.status(500).json({ error: "Não foi possível aprovar a peça." }); }
  });

  r.post("/processos/:id/pecas/:pecaId/protocolar", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const pecaId = safeInt(req.params.pecaId); const numero = text(req.body?.protocoloNumero, 120);
      const peca = await dbOne<any>("SELECT * FROM crm_processos_juridicos_pecas WHERE id = ? AND processo_id = ?", [pecaId, processoId]);
      if (!peca) return res.status(404).json({ error: "Peça não encontrada" });
      if (peca.status !== "aprovada_para_protocolo") return res.status(400).json({ error: "A peça deve ser aprovada antes do registro do protocolo." });
      if (!numero) return res.status(400).json({ error: "Informe o número ou identificador do recibo de protocolo." });
      await getPool().execute("UPDATE crm_processos_juridicos_pecas SET status='protocolada', protocolo_numero=?, protocolado_em=CURRENT_TIMESTAMP WHERE id=? AND processo_id=?", [numero, pecaId, processoId]);
      await audit(user, "RECORD_MANUAL_FILING", processoId, { pecaId, protocoloNumero: numero, aviso: "Registro declaratório; protocolo ocorreu fora do CRM." });
      res.json({ ok: true, message: "Protocolo manual registrado. Anexe o recibo ao dossiê para completar a evidência." });
    } catch (error) { console.error("[Jurídico] registrar protocolo", error); res.status(500).json({ error: "Não foi possível registrar o protocolo." }); }
  });

  r.post("/processos/:id/ia/resumir-documento", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const vinculoId = safeInt(req.body?.vinculoId ?? req.body?.vinculo_id);
      if (!vinculoId) return res.status(400).json({ error: "Selecione o documento a resumir." });
      if (req.body?.confirmacaoRevisao !== true) return res.status(400).json({ error: "Confirme que o resumo será revisado por um profissional antes do uso." });
      if (!consumeLegalAiLimit(user.userId, "resumo_documento")) return res.status(429).json({ error: "Limite temporário de análises atingido. Aguarde alguns minutos antes de tentar novamente." });
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      requireProcessAiAuthorization(processo, user);
      const documento = await dbOne<any>(`SELECT d.id AS vinculo_id, d.classificacao, d.categoria_dossie, d.tags_dossie, d.observacao,
        a.nome, a.nome_arquivo_original, a.url_arquivo, a.mime_type, a.tamanho_bytes FROM crm_processos_juridicos_documentos d
        JOIN crm_acervo a ON a.id = d.acervo_id WHERE d.id = ? AND d.processo_id = ?`, [vinculoId, processoId]);
      if (!documento) return res.status(404).json({ error: "Documento vinculado não encontrado" });
      if (!AI_FILE_MIME_TYPES.has(String(documento.mime_type || "").toLowerCase())) return res.status(400).json({ error: "O resumo por IA está disponível nesta etapa somente para PDFs e imagens. O documento permanece acessível no dossiê." });
      if (!documento.url_arquivo) return res.status(400).json({ error: "O arquivo deste documento não está disponível para análise." });
      const model = "gpt-5-mini";
      const result = await invokeLLM({
        model,
        maxTokens: 2400,
        messages: [
          { role: "system", content: "Você é assistente de análise documental jurídica em pt-BR. Resuma exclusivamente o documento e os metadados recebidos. Não produza orientação jurídica, não conclua prazo, não invente fatos, valores, normas ou citações. Quando algo não estiver explícito, declare que não foi localizado. A saída será revisada por advogado e não é uma petição." },
          { role: "user", content: [{ type: "text", text: `Contexto interno do processo: ${JSON.stringify(sanitizeProcessForAi(processo))}\nDocumento vinculado #${vinculoId}: ${JSON.stringify({ nome: documento.nome, arquivo: documento.nome_arquivo_original, classificacao: documento.classificacao, categoria: documento.categoria_dossie, tags: documento.tags_dossie, observacao: documento.observacao })}` }, { type: "file_url", file_url: { url: documento.url_arquivo, mime_type: documento.mime_type } }] as any },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ResumoDocumentoJuridico",
            strict: true,
            schema: { type: "object", additionalProperties: false, properties: {
              resumo: { type: "string" }, fatosRelevantes: { type: "array", items: { type: "string" } }, datasMencionadas: { type: "array", items: { type: "string" } }, pendenciasParaRevisao: { type: "array", items: { type: "string" } }, avisoRevisao: { type: "string" },
            }, required: ["resumo", "fatosRelevantes", "datasMencionadas", "pendenciasParaRevisao", "avisoRevisao"] },
          },
        },
      });
      const content = result?.choices?.[0]?.message?.content; const parsed = typeof content === "string" ? JSON.parse(content) : content;
      const fontes = [{ tipo: "documento", vinculoId, nome: documento.nome || documento.nome_arquivo_original }];
      const [saved] = await getPool().execute("INSERT INTO crm_processos_juridicos_ia_analises (processo_id, documento_vinculo_id, tipo, resultado, fontes, modelo, gerado_por, gerado_por_nome) VALUES (?,?,?,?,?,?,?,?)", [processoId, vinculoId, "resumo_documento", JSON.stringify(parsed), JSON.stringify(fontes), model, user.userId, user.name || null]);
      await audit(user, "AI_DOCUMENT_SUMMARY", processoId, { analiseId: Number((saved as any).insertId), vinculoId, modelo: model, revisaoObrigatoria: true });
      res.status(201).json({ ok: true, id: Number((saved as any).insertId), resultado: parsed, fontes, aviso: "Resultado assistivo. Revise o documento original antes de usar qualquer informação." });
    } catch (error: any) { console.error("[Jurídico] resumo por IA", error); res.status(error?.message?.includes("autorizada") ? 403 : 500).json({ error: error?.message || "Não foi possível gerar o resumo assistido." }); }
  });

  r.post("/processos/:id/ia/cronologia", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id);
      if (req.body?.confirmacaoRevisao !== true) return res.status(400).json({ error: "Confirme que a cronologia será revisada por um profissional antes do uso." });
      if (!consumeLegalAiLimit(user.userId, "cronologia_processo", 3)) return res.status(429).json({ error: "Limite temporário de cronologias atingido. Aguarde alguns minutos antes de tentar novamente." });
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      requireProcessAiAuthorization(processo, user);
      const [documentos, prazos, consultas, resumos] = await Promise.all([
        db<any>("SELECT d.id AS vinculo_id, d.classificacao, d.categoria_dossie, d.tags_dossie, d.created_at AS anexado_em, a.nome FROM crm_processos_juridicos_documentos d JOIN crm_acervo a ON a.id = d.acervo_id WHERE d.processo_id = ? ORDER BY d.created_at ASC", [processoId]),
        db<any>("SELECT id, titulo, tipo, data_prazo, status, created_at FROM crm_processos_juridicos_prazos WHERE processo_id = ? ORDER BY data_prazo ASC", [processoId]),
        db<any>("SELECT id, fonte, sucesso, resumo, consultado_em FROM crm_processos_juridicos_consultas WHERE processo_id = ? ORDER BY consultado_em ASC LIMIT 20", [processoId]),
        db<any>("SELECT id, documento_vinculo_id, resultado, fontes, created_at FROM crm_processos_juridicos_ia_analises WHERE processo_id = ? AND tipo = 'resumo_documento' ORDER BY created_at ASC LIMIT 20", [processoId]),
      ]);
      const context = { processo: sanitizeProcessForAi(processo), documentos: documentos.map((item) => ({ fonte: `documento:${item.vinculo_id}`, nome: item.nome, classificacao: item.classificacao, categoria: item.categoria_dossie, tags: item.tags_dossie, anexadoEm: item.anexado_em })), prazos: prazos.map((item) => ({ fonte: `prazo:${item.id}`, titulo: item.titulo, tipo: item.tipo, data: item.data_prazo, status: item.status, criadoEm: item.created_at })), consultas: consultas.map((item) => ({ fonte: `consulta:${item.id}`, tipo: item.fonte, sucesso: item.sucesso, resumo: parseJson(item.resumo, {}), consultadoEm: item.consultado_em })), resumos: resumos.map((item) => ({ fonte: `analise:${item.id}`, documentoVinculoId: item.documento_vinculo_id, resumo: parseJson(item.resultado, {}), criadoEm: item.created_at })) };
      const model = "gpt-5-mini";
      const result = await invokeLLM({
        model,
        maxTokens: 2800,
        messages: [
          { role: "system", content: "Você organiza uma cronologia interna de processo jurídico em pt-BR exclusivamente a partir do JSON recebido. Não invente fatos, datas, movimentações, prazos, fundamentos ou atos. Use data nula quando a fonte não trouxer data. Identifique cada item com ao menos uma fonte interna fornecida. A cronologia é assistiva, requer revisão humana e não substitui consulta ao tribunal." },
          { role: "user", content: JSON.stringify(context) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "CronologiaJuridicaAssistida",
            strict: true,
            schema: { type: "object", additionalProperties: false, properties: {
              resumo: { type: "string" }, itens: { type: "array", items: { type: "object", additionalProperties: false, properties: { data: { type: ["string", "null"] }, evento: { type: "string" }, fontes: { type: "array", items: { type: "string" } }, revisaoNecessaria: { type: "boolean" } }, required: ["data", "evento", "fontes", "revisaoNecessaria"] } }, alertas: { type: "array", items: { type: "string" } }, avisoRevisao: { type: "string" },
            }, required: ["resumo", "itens", "alertas", "avisoRevisao"] },
          },
        },
      });
      const content = result?.choices?.[0]?.message?.content; const parsed = typeof content === "string" ? JSON.parse(content) : content;
      const fontes = [{ tipo: "metadados_processo", processoId }, ...documentos.map((item) => ({ tipo: "documento", vinculoId: item.vinculo_id })), ...prazos.map((item) => ({ tipo: "prazo", prazoId: item.id }))];
      const [saved] = await getPool().execute("INSERT INTO crm_processos_juridicos_ia_analises (processo_id, tipo, resultado, fontes, modelo, gerado_por, gerado_por_nome) VALUES (?,?,?,?,?,?,?)", [processoId, "cronologia", JSON.stringify(parsed), JSON.stringify(fontes), model, user.userId, user.name || null]);
      await audit(user, "AI_PROCESS_TIMELINE", processoId, { analiseId: Number((saved as any).insertId), documentos: documentos.length, prazos: prazos.length, modelo: model, revisaoObrigatoria: true });
      res.status(201).json({ ok: true, id: Number((saved as any).insertId), resultado: parsed, fontes, aviso: "Cronologia assistiva. Confirme datas e atos no documento original e no canal oficial." });
    } catch (error: any) { console.error("[Jurídico] cronologia por IA", error); res.status(error?.message?.includes("autorizada") ? 403 : 500).json({ error: error?.message || "Não foi possível gerar a cronologia assistida." }); }
  });

  r.post("/processos/:id/prazos/:prazoId/ia/extrair-audiencia", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const prazoId = safeInt(req.params.prazoId); const vinculoId = safeInt(req.body?.vinculoId ?? req.body?.vinculo_id);
      if (!vinculoId) return res.status(400).json({ error: "Selecione o PDF da audiência para extrair os dados." });
      if (req.body?.confirmacaoRevisao !== true) return res.status(400).json({ error: "Confirme que os dados extraídos serão revisados antes de preencher a audiência." });
      if (!consumeLegalAiLimit(user.userId, "extracao_audiencia", 6)) return res.status(429).json({ error: "Limite temporário de extrações atingido. Aguarde alguns minutos antes de tentar novamente." });
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      requireProcessAiAuthorization(processo, user);
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Documentos deste processo sigiloso são restritos ao perfil autorizado." });
      const prazo = await dbOne<any>("SELECT id, titulo, tipo, data_prazo, hora_audiencia, local_audiencia, link_audiencia, observacoes FROM crm_processos_juridicos_prazos WHERE id = ? AND processo_id = ?", [prazoId, processoId]);
      if (!prazo || prazo.tipo !== "audiencia") return res.status(404).json({ error: "Audiência não encontrada neste processo." });
      const documento = await dbOne<any>(`SELECT d.id AS vinculo_id, a.nome, a.nome_arquivo_original, a.url_arquivo, a.mime_type
        FROM crm_processos_juridicos_prazos_documentos pd
        JOIN crm_processos_juridicos_documentos d ON d.id = pd.documento_vinculo_id
        JOIN crm_acervo a ON a.id = d.acervo_id
        WHERE pd.prazo_id = ? AND d.id = ? AND d.processo_id = ?`, [prazoId, vinculoId, processoId]);
      if (!documento || String(documento.mime_type || "").toLowerCase() !== "application/pdf" || !documento.url_arquivo) return res.status(400).json({ error: "Selecione um PDF contextual desta audiência para a extração." });
      const model = "gpt-5-mini";
      const result = await invokeLLM({
        model,
        maxTokens: 2200,
        messages: [
          { role: "system", content: "Você extrai dados explicitamente presentes em um PDF de audiência jurídica, em pt-BR. Não ofereça orientação jurídica, não conclua prazos, não invente dados e não altere registros. Para data use AAAA-MM-DD; para horário use HH:MM; para link, informe somente URL http/https escrita no documento; use null se não localizar com segurança. A resposta é apenas sugestão e exige revisão humana antes do preenchimento." },
          { role: "user", content: [{ type: "text", text: `Contexto mínimo do processo: ${JSON.stringify(sanitizeProcessForAi(processo))}\nAudiência atual: ${JSON.stringify({ titulo: prazo.titulo, data: prazo.data_prazo, hora: prazo.hora_audiencia, local: prazo.local_audiencia, link: prazo.link_audiencia, observacoes: prazo.observacoes })}\nPDF vinculado: ${JSON.stringify({ vinculoId, nome: documento.nome, arquivo: documento.nome_arquivo_original })}` }, { type: "file_url", file_url: { url: documento.url_arquivo, mime_type: "application/pdf" } }] as any },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ExtracaoDadosAudiencia",
            strict: true,
            schema: { type: "object", additionalProperties: false, properties: {
              tituloSugerido: { type: ["string", "null"] }, dataAudiencia: { type: ["string", "null"] }, horaAudiencia: { type: ["string", "null"] }, localAudiencia: { type: ["string", "null"] }, linkAudiencia: { type: ["string", "null"] }, observacoes: { type: ["string", "null"] }, itensParaRevisao: { type: "array", items: { type: "string" } }, avisoRevisao: { type: "string" },
            }, required: ["tituloSugerido", "dataAudiencia", "horaAudiencia", "localAudiencia", "linkAudiencia", "observacoes", "itensParaRevisao", "avisoRevisao"] },
          },
        },
      });
      const content = result?.choices?.[0]?.message?.content; const raw = typeof content === "string" ? JSON.parse(content) : content || {};
      const extracted = {
        tituloSugerido: nullableText(raw.tituloSugerido, 255), dataAudiencia: isoDate(raw.dataAudiencia), horaAudiencia: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw.horaAudiencia || "")) ? String(raw.horaAudiencia) : null,
        localAudiencia: nullableText(raw.localAudiencia, 500), linkAudiencia: (() => { try { return audienceLink(raw.linkAudiencia); } catch { return null; } })(), observacoes: nullableText(raw.observacoes, 4000),
        itensParaRevisao: Array.isArray(raw.itensParaRevisao) ? raw.itensParaRevisao.map((item: unknown) => text(item, 500)).filter(Boolean).slice(0, 12) : [], avisoRevisao: text(raw.avisoRevisao, 500) || "Sugestão assistida: revise o PDF original antes de aplicar.",
      };
      const fontes = [{ tipo: "documento_audiencia", vinculoId, prazoId, nome: documento.nome || documento.nome_arquivo_original }];
      const [saved] = await getPool().execute("INSERT INTO crm_processos_juridicos_ia_analises (processo_id, documento_vinculo_id, tipo, resultado, fontes, modelo, gerado_por, gerado_por_nome) VALUES (?,?,?,?,?,?,?,?)", [processoId, vinculoId, "extracao_audiencia", JSON.stringify(extracted), JSON.stringify(fontes), model, user.userId, user.name || null]);
      await audit(user, "AI_HEARING_EXTRACTION", processoId, { analiseId: Number((saved as any).insertId), prazoId, vinculoId, modelo: model, revisaoObrigatoria: true });
      res.status(201).json({ ok: true, id: Number((saved as any).insertId), resultado: extracted, fontes, aviso: "Sugestões extraídas por IA. Revise o PDF e confirme os dados antes de aplicá-los." });
    } catch (error: any) { console.error("[Jurídico] extração de audiência por IA", error); res.status(error?.message?.includes("autorizada") ? 403 : 500).json({ error: error?.message || "Não foi possível extrair os dados da audiência." }); }
  });

  r.patch("/processos/:id/prazos/:prazoId/audiencia-extraida", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const prazoId = safeInt(req.params.prazoId);
      if (req.body?.confirmacaoRevisao !== true) return res.status(400).json({ error: "Confirme a revisão humana do PDF antes de aplicar os dados à audiência." });
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      requireProcessAiAuthorization(processo, user);
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Documentos deste processo sigiloso são restritos ao perfil autorizado." });
      const prazo = await dbOne<any>("SELECT id, tipo FROM crm_processos_juridicos_prazos WHERE id = ? AND processo_id = ?", [prazoId, processoId]);
      if (!prazo || prazo.tipo !== "audiencia") return res.status(404).json({ error: "Audiência não encontrada neste processo." });
      const titulo = text(req.body?.titulo ?? req.body?.tituloSugerido, 255); const dataPrazo = isoDate(req.body?.dataPrazo ?? req.body?.dataAudiencia); const horaAudiencia = audienceTime(req.body?.horaAudiencia ?? req.body?.hora_audiencia);
      const localAudiencia = nullableText(req.body?.localAudiencia ?? req.body?.local_audiencia, 500); const linkAudiencia = audienceLink(req.body?.linkAudiencia ?? req.body?.link_audiencia); const observacoes = nullableText(req.body?.observacoes, 4000);
      if (!titulo || !dataPrazo) return res.status(400).json({ error: "Título e data revisados são obrigatórios para aplicar a extração." });
      await getPool().execute("UPDATE crm_processos_juridicos_prazos SET titulo = ?, data_prazo = ?, hora_audiencia = ?, local_audiencia = ?, link_audiencia = ?, observacoes = ? WHERE id = ? AND processo_id = ?", [titulo, dataPrazo, horaAudiencia, localAudiencia, linkAudiencia, observacoes, prazoId, processoId]);
      await getPool().execute("UPDATE crm_processos_juridicos SET proximo_prazo = (SELECT MIN(data_prazo) FROM crm_processos_juridicos_prazos WHERE processo_id = ? AND status = 'pendente') WHERE id = ?", [processoId, processoId]);
      await audit(user, "APPLY_HEARING_EXTRACTION", processoId, { prazoId, titulo, dataPrazo, horaAudiencia, localAudiencia, linkAudiencia: Boolean(linkAudiencia), revisaoConfirmada: true });
      res.json({ ok: true, message: "Dados revisados aplicados à audiência." });
    } catch (error: any) { console.error("[Jurídico] aplicar extração de audiência", error); res.status(error?.message?.includes("link de audiência válido") || error?.message?.includes("horário da audiência") ? 400 : 500).json({ error: error?.message || "Não foi possível aplicar os dados à audiência." }); }
  });

  r.post("/processos/:id/prazos", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const processo = await dbOne<any>("SELECT id FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      const titulo = text(req.body.titulo, 255); const dataPrazo = isoDate(req.body.dataPrazo ?? req.body.data_prazo); const tipo = boundedSetValue(req.body.tipo, PRAZO_TYPES, "prazo_processual"); const responsavelId = safeInt(req.body.responsavelId ?? req.body.responsavel_id);
      const localAudiencia = tipo === "audiencia" ? nullableText(req.body.localAudiencia ?? req.body.local_audiencia, 500) : null;
      const linkAudiencia = tipo === "audiencia" ? audienceLink(req.body.linkAudiencia ?? req.body.link_audiencia) : null;
      const horaAudiencia = tipo === "audiencia" ? audienceTime(req.body.horaAudiencia ?? req.body.hora_audiencia) : null;
      if (!processo || !titulo || !dataPrazo) return res.status(400).json({ error: "Processo, título e data do prazo são obrigatórios" });
      const responsable = responsavelId ? await dbOne<any>("SELECT id, name FROM crm_users WHERE id = ? AND active = 1", [responsavelId]) : null;
      if (responsavelId && !responsable) return res.status(400).json({ error: "Responsável inválido" });
      const duplicate = await dbOne<any>("SELECT id FROM crm_processos_juridicos_prazos WHERE processo_id = ? AND titulo = ? AND tipo = ? AND data_prazo = ? AND status = 'pendente'", [processoId, titulo, tipo, dataPrazo]);
      if (duplicate) return res.status(409).json({ error: tipo === "audiencia" ? "Esta audiência já está registrada como pendente neste processo." : "Este prazo já está registrado como pendente neste processo." });
      const [result] = await getPool().execute("INSERT INTO crm_processos_juridicos_prazos (processo_id, titulo, tipo, data_prazo, responsavel_id, responsavel_nome, local_audiencia, link_audiencia, hora_audiencia, observacoes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [processoId, titulo, tipo, dataPrazo, responsavelId || null, responsable?.name || null, localAudiencia, linkAudiencia, horaAudiencia, nullableText(req.body.observacoes, 4000), user.userId]);
      await getPool().execute("UPDATE crm_processos_juridicos SET proximo_prazo = LEAST(COALESCE(proximo_prazo, '9999-12-31'), ?) WHERE id = ?", [dataPrazo, processoId]);
      const prazoId = Number((result as any).insertId);
      await audit(user, tipo === "audiencia" ? "CREATE_HEARING" : "CREATE_DEADLINE", processoId, { prazoId, dataPrazo, tipo, responsavelId: responsavelId || null, localAudiencia, linkAudiencia: Boolean(linkAudiencia), horaAudiencia });
      res.status(201).json({ ok: true, id: prazoId, message: tipo === "audiencia" ? "Audiência registrada no processo e na Agenda Jurídica." : "Prazo registrado no processo e na Agenda Jurídica." });
    } catch (error: any) {
      console.error("[Jurídico] prazo", error);
      res.status(error?.message?.includes("link de audiência válido") || error?.message?.includes("horário da audiência") ? 400 : 500).json({ error: error?.message || "Não foi possível registrar o prazo" });
    }
  });

  r.post("/processos/:id/prazos/:prazoId/documentos", requireLegalAccess, legalUploadMiddleware, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const processoId = safeInt(req.params.id); const prazoId = safeInt(req.params.prazoId);
      const processo = await dbOne<any>(`SELECT p.*, c.nome AS cliente_nome, e.nome AS evento_nome FROM crm_processos_juridicos p
        LEFT JOIN crm_clientes c ON c.id = p.cliente_id LEFT JOIN crm_eventos e ON e.id = p.evento_id WHERE p.id = ?`, [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      if (!canAccessProcessDocuments(processo, user.role)) return res.status(403).json({ error: "Documentos deste processo sigiloso são restritos ao perfil autorizado." });
      const prazo = await dbOne<any>("SELECT id, titulo, tipo FROM crm_processos_juridicos_prazos WHERE id = ? AND processo_id = ?", [prazoId, processoId]);
      if (!prazo || prazo.tipo !== "audiencia") return res.status(404).json({ error: "Audiência não encontrada neste processo." });
      const file = (req as any).file; const extension = path.extname(file?.originalname || "").toLowerCase();
      if (!file || (extension !== ".pdf" && String(file.mimetype || "").toLowerCase() !== "application/pdf")) return res.status(400).json({ error: "Anexe somente um arquivo PDF à audiência." });
      const nome = text(req.body?.nome, 500) || `Documento da audiência — ${prazo.titulo}`;
      const observacao = nullableText(req.body?.observacao, 4000);
      const storageKey = `juridico/processo-${processoId}/audiencia-${prazoId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safeFileName(file.originalname)}`;
      const stored = await storagePut(storageKey, file.buffer, "application/pdf");
      const ano = processo.data_distribuicao ? Number(String(processo.data_distribuicao).slice(0, 4)) : new Date().getFullYear();
      const [acervoResult] = await getPool().execute(`INSERT INTO crm_acervo
        (nome, descricao, tipo_doc, evento_id, evento_nome, cliente_id, cliente_nome, ano, url_arquivo, nome_arquivo_original, tamanho_bytes, mime_type, s3_key, tags, criado_por, criado_por_nome)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        nome, observacao, "outro", processo.evento_id || null, processo.evento_nome || null, processo.cliente_id || null, processo.cliente_nome || null, ano,
        stored.url, file.originalname, file.size, "application/pdf", stored.key, ["juridico", "processo", "audiencia", processo.codigo].filter(Boolean).join(","), user.userId, user.name || null,
      ]);
      const acervoId = Number((acervoResult as any).insertId);
      const [vinculoResult] = await getPool().execute("INSERT INTO crm_processos_juridicos_documentos (processo_id, acervo_id, classificacao, categoria_dossie, tags_dossie, observacao, anexado_por, anexado_por_nome) VALUES (?,?,?,?,?,?,?,?)", [processoId, acervoId, "ata_audiencia", "dossie_geral", "audiencia", observacao, user.userId, user.name || null]);
      const vinculoId = Number((vinculoResult as any).insertId);
      await getPool().execute("INSERT INTO crm_processos_juridicos_prazos_documentos (prazo_id, documento_vinculo_id, anexado_por, anexado_por_nome) VALUES (?,?,?,?)", [prazoId, vinculoId, user.userId, user.name || null]);
      await audit(user, "ATTACH_HEARING_DOCUMENT", processoId, { prazoId, vinculoId, acervoId, nomeArquivo: file.originalname, tamanhoBytes: file.size });
      res.status(201).json({ ok: true, vinculoId, acervoId, nome, urlArquivo: stored.url, message: "PDF anexado à audiência e preservado no Acervo." });
    } catch (error: any) { console.error("[Jurídico] anexo de audiência", error); res.status(500).json({ error: error?.message || "Não foi possível anexar o PDF à audiência." }); }
  });

  r.get("/prazos", requireLegalAccess, async (req, res) => {
    try {
      const status = text(req.query.status || "pendente", 30).toLowerCase();
      const data = await db<any>(`SELECT pp.*, p.codigo, p.titulo AS processo_titulo, p.ramo_processual, p.sigiloso,
        CASE WHEN pp.tipo = 'audiencia' AND pp.status = 'pendente' AND pp.data_prazo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END AS audiencia_proxima
        FROM crm_processos_juridicos_prazos pp JOIN crm_processos_juridicos p ON p.id = pp.processo_id ${PRAZO_STATUSES.has(status) ? "WHERE pp.status = ?" : ""} ORDER BY pp.data_prazo ASC`, PRAZO_STATUSES.has(status) ? [status] : []);
      res.json({ data });
    } catch (error) { console.error("[Jurídico] listar prazos", error); res.status(500).json({ error: "Não foi possível carregar os prazos" }); }
  });

  r.post("/processos/:id/consultar-datajud", requireLegalAccess, async (req, res) => {
    const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id);
    try {
      const processo = await dbOne<any>("SELECT * FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      const numero = cnjDigits(processo.numero_cnj);
      if (numero.length !== 20) return res.status(400).json({ error: "Informe um número CNJ completo antes de consultar o Datajud" });
      const key = String(process.env.DATAJUD_API_KEY || "").trim();
      const tribunalKey = text(req.body.tribunalApi ?? processo.tribunal, 30).toLowerCase().replace(/[^a-z0-9]/g, "");
      const endpoint = DATAJUD_ENDPOINTS[tribunalKey];
      if (!endpoint) return res.status(400).json({ error: "Selecione o tribunal da consulta Datajud (ex.: TJSP, TRT2, TRF3)" });
      if (!key) return res.status(503).json({ error: "A chave pública Datajud ainda não foi configurada para esta consulta" });
      const response = await fetch(`https://api-publica.datajud.cnj.jus.br/${endpoint}/_search`, { method: "POST", headers: { "Authorization": `APIKey ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 }) });
      const raw: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`DATAJUD_${response.status}`);
      const source = raw?.hits?.hits?.[0]?._source || null;
      const resumo = source ? summarizeDatajud(source) : null;
      await db("INSERT INTO crm_processos_juridicos_consultas (processo_id, fonte, numero_consultado, sucesso, resumo, consultado_por) VALUES (?,?,?,?,?,?)", [processoId, "datajud", formatCnj(numero), source ? 1 : 0, JSON.stringify(resumo || { encontrado: false }), user.userId]);
      await db("UPDATE crm_processos_juridicos SET ultima_fonte_consulta = 'datajud', ultima_consulta_em = CURRENT_TIMESTAMP WHERE id = ?", [processoId]);
      await audit(user, "CONSULT_DATAJUD", processoId, { tribunal: endpoint, encontrado: Boolean(source) });
      res.json({ ok: true, encontrado: Boolean(source), dadosSugeridos: resumo, fonte: "Datajud", consultadoEm: new Date().toISOString() });
    } catch (error: any) {
      await db("INSERT INTO crm_processos_juridicos_consultas (processo_id, fonte, numero_consultado, sucesso, resumo, consultado_por) VALUES (?,?,?,?,?,?)", [processoId, "datajud", "", 0, JSON.stringify({ erro: String(error?.message || "consulta indisponível") }), user.userId]).catch(() => undefined);
      console.error("[Jurídico] consulta Datajud", error);
      res.status(502).json({ error: "Não foi possível consultar o Datajud neste momento. Confira o processo no canal oficial." });
    }
  });

  app.use("/api/crm/juridico", r);
}
