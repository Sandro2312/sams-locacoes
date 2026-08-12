import { Router, Request, Response } from "express";
import mysql from "mysql2/promise";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

type CrmSession = { userId: number; role: string; name: string };
const DEVELOPER_ROLES = new Set(["desenvolvedor", "developer"]);
const TICKET_STATUSES = new Set(["aberto", "em_analise", "aguardando_usuario", "em_desenvolvimento", "resolvido", "nao_procedente", "fechado"]);
const TICKET_PRIORITIES = new Set(["baixa", "normal", "alta", "critica"]);

let pool: mysql.Pool | null = null;
function getPool() {
  if (!pool) pool = mysql.createPool(ENV.databaseUrl);
  return pool;
}
async function db<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}
async function dbOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await db<T>(sql, params);
  return rows[0] ?? null;
}
function safeInt(value: unknown, defaultValue: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : defaultValue;
}
function getSessionToken(req: Request) {
  const cookie = parseCookieHeader(req.headers.cookie || "");
  const cookieToken = cookie.crm_session;
  const auth = String(req.headers.authorization || req.headers["x-crm-token"] || "").trim();
  const headerToken = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : auth;
  return cookieToken || headerToken || "";
}
function isDeveloper(user: CrmSession | undefined) {
  return !!user && DEVELOPER_ROLES.has(String(user.role || "").toLowerCase());
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
function requireDeveloper(req: Request, res: Response, next: () => void) {
  requireCrmAuth(req, res, () => {
    if (!isDeveloper((req as any).crmUser)) return res.status(403).json({ error: "Acesso restrito ao perfil Desenvolvedor" });
    next();
  });
}
function escapeFileName(name: string) {
  return path.basename(name || "anexo").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "anexo";
}
function sqlDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
function slaDate(priority: string) {
  const hours = ({ baixa: 48, normal: 24, alta: 8, critica: 4 } as Record<string, number>)[priority] ?? 24;
  return sqlDate(new Date(Date.now() + hours * 60 * 60 * 1000));
}

const allowedMime = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain",
  "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (allowedMime.has(file.mimetype)) callback(null, true);
    else callback(new Error("Tipo de arquivo não permitido. Envie imagens, PDF, TXT, CSV ou planilhas."));
  },
});

function ticketUpload(req: any, res: any, next: any) {
  upload.array("anexos", 5)(req, res, (error: any) => {
    if (!error) return next();
    const message = error instanceof multer.MulterError
      ? "O anexo excede o limite permitido. Envie no máximo 5 arquivos de até 12 MB cada."
      : "Tipo de arquivo não permitido. Envie imagens, PDF, TXT, CSV ou planilhas.";
    return res.status(400).json({ error: message });
  });
}

async function saveFiles(files: Express.Multer.File[], ticketId: number, messageId: number | null, userId: number) {
  for (const file of files) {
    const cleanName = escapeFileName(file.originalname);
    const key = `crm-tickets/${ticketId}/${crypto.randomUUID()}-${cleanName}`;
    const { url } = await storagePut(key, file.buffer, file.mimetype || "application/octet-stream");
    await getPool().execute(
      `INSERT INTO crm_ticket_anexos (ticket_id, mensagem_id, nome_original, arquivo_key, arquivo_url, mime_type, tamanho_bytes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ticketId, messageId, cleanName, key, url, file.mimetype, file.size, userId],
    );
  }
}

export function registerTicketRoutes(app: any) {
  const r = Router();

  r.get("/", requireCrmAuth, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const developer = isDeveloper(user);
      const status = String(req.query.status || "").trim().toLowerCase();
      const search = String(req.query.busca || "").trim();
      const limit = safeInt(req.query.limit, 30, 1, 100);
      const offset = safeInt(req.query.offset, 0, 0, 100000);
      const where: string[] = ["1=1"];
      const params: any[] = [];
      if (!developer) { where.push("t.solicitante_id = ?"); params.push(user.userId); }
      if (status && TICKET_STATUSES.has(status)) { where.push("t.status = ?"); params.push(status); }
      if (search) {
        where.push("(t.codigo LIKE ? OR t.titulo LIKE ? OR t.descricao LIKE ? OR t.solicitante_nome LIKE ?)");
        const term = `%${search}%`;
        params.push(term, term, term, term);
      }
      const whereSql = where.join(" AND ");
      const data = await db(
        `SELECT t.*, (SELECT COUNT(*) FROM crm_ticket_mensagens m WHERE m.ticket_id = t.id) AS mensagens_total,
                (SELECT COUNT(*) FROM crm_ticket_anexos a WHERE a.ticket_id = t.id) AS anexos_total
         FROM crm_tickets t WHERE ${whereSql}
         ORDER BY FIELD(t.status, 'aberto', 'em_analise', 'aguardando_usuario', 'em_desenvolvimento', 'resolvido', 'nao_procedente', 'fechado'),
                  FIELD(t.prioridade, 'critica', 'alta', 'normal', 'baixa'), t.updated_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      );
      const count = await dbOne<{ total: number }>(`SELECT COUNT(*) AS total FROM crm_tickets t WHERE ${whereSql}`, params);
      res.json({ data, total: Number(count?.total || 0), limit, offset, developer });
    } catch (error) {
      console.error("[Tickets] erro ao listar", error);
      res.status(500).json({ error: "Não foi possível carregar os tickets" });
    }
  });

  r.get("/stats", requireDeveloper, async (_req, res) => {
    try {
      const rows = await db<{ status: string; total: number }>("SELECT status, COUNT(*) AS total FROM crm_tickets GROUP BY status");
      const overdue = await dbOne<{ total: number }>("SELECT COUNT(*) AS total FROM crm_tickets WHERE status NOT IN ('resolvido','nao_procedente','fechado') AND prazo_at < NOW()");
      res.json({ porStatus: rows, vencidos: Number(overdue?.total || 0) });
    } catch {
      res.status(500).json({ error: "Não foi possível carregar os indicadores" });
    }
  });

  r.get("/:id", requireCrmAuth, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const ticket = await dbOne<any>("SELECT * FROM crm_tickets WHERE id = ?", [id]);
      if (!ticket) return res.status(404).json({ error: "Ticket não encontrado" });
      if (!isDeveloper(user) && Number(ticket.solicitante_id) !== Number(user.userId)) return res.status(403).json({ error: "Você não possui acesso a este ticket" });
      const mensagens = await db<any>("SELECT * FROM crm_ticket_mensagens WHERE ticket_id = ? ORDER BY created_at ASC", [id]);
      const anexos = await db<any>("SELECT * FROM crm_ticket_anexos WHERE ticket_id = ? ORDER BY created_at ASC", [id]);
      res.json({ ticket, mensagens, anexos, developer: isDeveloper(user) });
    } catch {
      res.status(500).json({ error: "Não foi possível carregar o ticket" });
    }
  });

  r.post("/", requireCrmAuth, ticketUpload, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const titulo = String(req.body?.titulo || "").trim().slice(0, 180);
      const descricao = String(req.body?.descricao || "").trim().slice(0, 10000);
      const categoria = String(req.body?.categoria || "problema").trim().toLowerCase().slice(0, 40);
      const prioridadeRaw = String(req.body?.prioridade || "normal").trim().toLowerCase();
      const prioridade = TICKET_PRIORITIES.has(prioridadeRaw) ? prioridadeRaw : "normal";
      if (titulo.length < 5 || descricao.length < 10) return res.status(400).json({ error: "Informe um título e uma descrição mais detalhada do problema ou sugestão" });
      const codigo = `SUP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const [result]: any = await getPool().execute(
        `INSERT INTO crm_tickets (codigo, titulo, descricao, categoria, prioridade, status, solicitante_id, solicitante_nome, solicitante_email, prazo_at)
         VALUES (?, ?, ?, ?, ?, 'aberto', ?, ?, (SELECT email FROM crm_users WHERE id = ?), ?)`,
        [codigo, titulo, descricao, categoria, prioridade, user.userId, user.name, user.userId, slaDate(prioridade)],
      );
      const ticketId = Number(result.insertId);
      const files = Array.isArray(req.files) ? req.files : [];
      await saveFiles(files, ticketId, null, user.userId);
      void notifyOwner({ title: `Novo ticket ${codigo}`, content: `${user.name} abriu: ${titulo} (${prioridade}).` }).catch(() => false);
      res.status(201).json({ success: true, id: ticketId, codigo, prazo_at: slaDate(prioridade) });
    } catch (error) {
      console.error("[Tickets] erro ao criar", error);
      res.status(500).json({ error: "Não foi possível abrir o ticket. Tente novamente." });
    }
  });

  r.post("/:id/mensagens", requireCrmAuth, ticketUpload, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const ticket = await dbOne<any>("SELECT * FROM crm_tickets WHERE id = ?", [id]);
      if (!ticket) return res.status(404).json({ error: "Ticket não encontrado" });
      if (!isDeveloper(user) && Number(ticket.solicitante_id) !== Number(user.userId)) return res.status(403).json({ error: "Você não possui acesso a este ticket" });
      const mensagem = String(req.body?.mensagem || "").trim().slice(0, 10000);
      const files = Array.isArray(req.files) ? req.files : [];
      if (mensagem.length === 0 && files.length === 0) return res.status(400).json({ error: "Escreva uma mensagem ou anexe um arquivo" });
      const tipoAutor = isDeveloper(user) ? "desenvolvedor" : "solicitante";
      const [result]: any = await getPool().execute(
        "INSERT INTO crm_ticket_mensagens (ticket_id, autor_id, autor_nome, tipo_autor, mensagem) VALUES (?, ?, ?, ?, ?)",
        [id, user.userId, user.name, tipoAutor, mensagem || null],
      );
      await saveFiles(files, id, Number(result.insertId), user.userId);
      const status = isDeveloper(user) ? "aguardando_usuario" : "em_analise";
      await getPool().execute(
        "UPDATE crm_tickets SET status = IF(status IN ('resolvido','nao_procedente','fechado'), status, ?), first_response_at = IF(? = 'desenvolvedor' AND first_response_at IS NULL, NOW(), first_response_at), updated_at = NOW() WHERE id = ?",
        [status, tipoAutor, id],
      );
      res.status(201).json({ success: true, id: Number(result.insertId) });
    } catch (error) {
      console.error("[Tickets] erro ao responder", error);
      res.status(500).json({ error: "Não foi possível registrar a mensagem" });
    }
  });

  r.patch("/:id", requireDeveloper, async (req, res) => {
    try {
      const user = (req as any).crmUser as CrmSession;
      const id = safeInt(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
      const ticket = await dbOne<any>("SELECT * FROM crm_tickets WHERE id = ?", [id]);
      if (!ticket) return res.status(404).json({ error: "Ticket não encontrado" });
      const statusInput = String(req.body?.status || ticket.status).toLowerCase();
      const priorityInput = String(req.body?.prioridade || ticket.prioridade).toLowerCase();
      const status = TICKET_STATUSES.has(statusInput) ? statusInput : ticket.status;
      const prioridade = TICKET_PRIORITIES.has(priorityInput) ? priorityInput : ticket.prioridade;
      const prazo = req.body?.prazo_at ? String(req.body.prazo_at).slice(0, 19).replace("T", " ") : ticket.prazo_at;
      await getPool().execute(
        `UPDATE crm_tickets SET status = ?, prioridade = ?, prazo_at = ?, responsavel_id = ?, responsavel_nome = ?,
         first_response_at = IF(first_response_at IS NULL, NOW(), first_response_at),
         resolved_at = IF(? IN ('resolvido','nao_procedente','fechado'), NOW(), resolved_at), updated_at = NOW() WHERE id = ?`,
        [status, prioridade, prazo, user.userId, user.name, status, id],
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Não foi possível atualizar o ticket" });
    }
  });

  app.use("/api/crm/tickets", r);
}
