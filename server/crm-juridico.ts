import { Request, Response, Router } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";
import { storagePut } from "./storage";

type CrmSession = { userId: number; role: string; name: string };
const RAMOS = new Set(["trabalhista", "civel"]);
const STATUSES = new Set(["pre_processual", "em_andamento", "suspenso", "encerrado", "arquivado"]);
const PRAZO_STATUSES = new Set(["pendente", "cumprido", "cancelado"]);
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
function cnjDigits(value: unknown) { return text(value, 32).replace(/\D/g, "").slice(0, 20); }
function formatCnj(value: unknown) {
  const n = cnjDigits(value);
  return n.length === 20 ? `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}` : null;
}
function generatedCode() { return `JUR-${Date.now().toString(36).toUpperCase()}`; }
function safeFileName(value: unknown) { return path.basename(text(value, 180)).replace(/[^a-zA-Z0-9._-]/g, "_") || "documento"; }
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
      const documentosPromise = documentosRestritos ? Promise.resolve<any[]>([]) : db<any>(`SELECT d.id AS vinculo_id, d.classificacao, d.observacao, d.created_at AS anexado_em, d.anexado_por_nome,
        a.id AS acervo_id, a.nome, a.descricao, a.tipo_doc, a.url_arquivo, a.url_drive, a.nome_arquivo_original, a.tamanho_bytes, a.mime_type, a.tags
        FROM crm_processos_juridicos_documentos d JOIN crm_acervo a ON a.id = d.acervo_id
        WHERE d.processo_id = ? ORDER BY d.created_at DESC`, [id]);
      const [prazos, consultas, documentos] = await Promise.all([
        db<any>("SELECT * FROM crm_processos_juridicos_prazos WHERE processo_id = ? ORDER BY data_prazo ASC", [id]),
        db<any>("SELECT id, fonte, numero_consultado, sucesso, resumo, consultado_em FROM crm_processos_juridicos_consultas WHERE processo_id = ? ORDER BY consultado_em DESC LIMIT 20", [id]),
        documentosPromise,
      ]);
      await audit(user, "VIEW", id, { sigiloso: Number(processo.sigiloso) === 1 });
      res.json({ processo: maskSensitive(processo, String(user.role || "").toLowerCase()), prazos, consultas, documentos, documentosRestritos });
    } catch (error) { console.error("[Jurídico] detalhe", error); res.status(500).json({ error: "Não foi possível carregar o processo" }); }
  });

  r.post("/processos", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const payload = processPayload(req.body);
      const responsible = await validateRelations({ ...payload, clienteId: payload.clienteId || 0, leadId: payload.leadId || 0, fornecedorId: payload.fornecedorId || 0, eventoId: payload.eventoId || 0, contratoId: payload.contratoId || 0, responsavelId: payload.responsavelId || 0 });
      const codigo = text(req.body.codigo, 40) || generatedCode();
      const [result] = await getPool().execute(`INSERT INTO crm_processos_juridicos (codigo, numero_cnj, titulo, ramo_processual, status, sigiloso, tribunal, uf, comarca, vara, grau, classe_processual, assunto, polo_empresa, valor_causa, cliente_id, lead_id, fornecedor_id, evento_id, contrato_id, parte_externa_nome, responsavel_id, responsavel_nome, data_distribuicao, proximo_prazo, observacoes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        codigo, payload.numeroCnj, payload.titulo, payload.ramo, payload.status, payload.sigiloso, payload.tribunal, payload.uf, payload.comarca, payload.vara, payload.grau, payload.classeProcessual, payload.assunto, payload.poloEmpresa, payload.valorCausa, payload.clienteId, payload.leadId, payload.fornecedorId, payload.eventoId, payload.contratoId, payload.parteExternaNome, payload.responsavelId, responsible?.name || null, payload.dataDistribuicao, payload.proximoPrazo, payload.observacoes, user.userId,
      ]);
      const id = Number((result as any).insertId);
      await audit(user, "CREATE", id, { codigo, ramo: payload.ramo, numeroCnj: payload.numeroCnj, sigiloso: payload.sigiloso });
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
      await getPool().execute(`UPDATE crm_processos_juridicos SET numero_cnj=?, titulo=?, ramo_processual=?, status=?, sigiloso=?, tribunal=?, uf=?, comarca=?, vara=?, grau=?, classe_processual=?, assunto=?, polo_empresa=?, valor_causa=?, cliente_id=?, lead_id=?, fornecedor_id=?, evento_id=?, contrato_id=?, parte_externa_nome=?, responsavel_id=?, responsavel_nome=?, data_distribuicao=?, proximo_prazo=?, observacoes=? WHERE id=?`, [
        payload.numeroCnj, payload.titulo, payload.ramo, payload.status, payload.sigiloso, payload.tribunal, payload.uf, payload.comarca, payload.vara, payload.grau, payload.classeProcessual, payload.assunto, payload.poloEmpresa, payload.valorCausa, payload.clienteId, payload.leadId, payload.fornecedorId, payload.eventoId, payload.contratoId, payload.parteExternaNome, payload.responsavelId, responsible?.name || null, payload.dataDistribuicao, payload.proximoPrazo, payload.observacoes, id,
      ]);
      await audit(user, "UPDATE", id, { ramo: payload.ramo, status: payload.status, sigiloso: payload.sigiloso });
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
      const [linkResult] = await getPool().execute("INSERT INTO crm_processos_juridicos_documentos (processo_id, acervo_id, classificacao, observacao, anexado_por, anexado_por_nome) VALUES (?,?,?,?,?,?)", [processoId, acervoId, classificacao, observacao, user.userId, user.name || null]);
      await audit(user, "ATTACH_DOCUMENT", processoId, { vinculoId: Number((linkResult as any).insertId), acervoId, classificacao, nomeArquivo: file.originalname, tamanhoBytes: file.size });
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

  r.post("/processos/:id/prazos", requireLegalAccess, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession; const processoId = safeInt(req.params.id); const processo = await dbOne<any>("SELECT id FROM crm_processos_juridicos WHERE id = ?", [processoId]);
      const titulo = text(req.body.titulo, 255); const dataPrazo = isoDate(req.body.dataPrazo ?? req.body.data_prazo); const tipo = text(req.body.tipo || "prazo_processual", 60); const responsavelId = safeInt(req.body.responsavelId ?? req.body.responsavel_id);
      if (!processo || !titulo || !dataPrazo) return res.status(400).json({ error: "Processo, título e data do prazo são obrigatórios" });
      const responsable = responsavelId ? await dbOne<any>("SELECT id, name FROM crm_users WHERE id = ? AND active = 1", [responsavelId]) : null;
      if (responsavelId && !responsable) return res.status(400).json({ error: "Responsável inválido" });
      const [result] = await getPool().execute("INSERT INTO crm_processos_juridicos_prazos (processo_id, titulo, tipo, data_prazo, responsavel_id, responsavel_nome, observacoes, created_by) VALUES (?,?,?,?,?,?,?,?)", [processoId, titulo, tipo, dataPrazo, responsavelId || null, responsable?.name || null, nullableText(req.body.observacoes, 4000), user.userId]);
      await getPool().execute("UPDATE crm_processos_juridicos SET proximo_prazo = LEAST(COALESCE(proximo_prazo, '9999-12-31'), ?) WHERE id = ?", [dataPrazo, processoId]);
      await audit(user, "CREATE_DEADLINE", processoId, { prazoId: Number((result as any).insertId), dataPrazo, tipo });
      res.status(201).json({ ok: true, id: Number((result as any).insertId) });
    } catch (error) { console.error("[Jurídico] prazo", error); res.status(500).json({ error: "Não foi possível registrar o prazo" }); }
  });

  r.get("/prazos", requireLegalAccess, async (req, res) => {
    try {
      const status = text(req.query.status || "pendente", 30).toLowerCase();
      const data = await db<any>(`SELECT pp.*, p.codigo, p.titulo AS processo_titulo, p.ramo_processual, p.sigiloso FROM crm_processos_juridicos_prazos pp JOIN crm_processos_juridicos p ON p.id = pp.processo_id ${PRAZO_STATUSES.has(status) ? "WHERE pp.status = ?" : ""} ORDER BY pp.data_prazo ASC`, PRAZO_STATUSES.has(status) ? [status] : []);
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
