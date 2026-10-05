// SAMS Locações CRM — Módulo Acervo Documental
// Endpoints REST para gestão de documentos históricos por Feira/Evento e Cliente
import { Router, Request, Response } from "express";
import mysql from "mysql2/promise";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

// ─── DB helper ────────────────────────────────────────────────────────────────
let _pool: mysql.Pool | null = null;
function getPool() {
  if (!_pool) {
    _pool = mysql.createPool(ENV.databaseUrl);
  }
  return _pool;
}
async function db<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}
async function dbOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await db<T>(sql, params);
  return rows[0] ?? null;
}

// ─── Auth middleware (reutiliza sessão in-memory do CRM) ─────────────────────
import { parse as parseCookieHeader } from "cookie";
import { getSessionFromCrm } from "./crm";

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  return parseCookieHeader(header)[name];
}

function requireCrmAuth(req: Request, res: Response, next: Function) {
  const token = getCookie(req, "crm_session");
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSessionFromCrm(token).then(session => {
    if (!session) return res.status(401).json({ error: "Sessão expirada" });
    (req as any).crmUser = session;
    next();
  }).catch(() => res.status(500).json({ error: "Erro interno" }));
}

// ─── Multer (memória — depois enviamos para S3) ────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB por arquivo
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "application/zip", "application/x-zip-compressed",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/octet-stream", // DWG e outros
      "video/mp4", "video/mpeg",
    ];
    // Aceitar DWG por extensão
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === ".dwg" || ext === ".dxf") {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
  },
});

// ─── Tipos de documento ────────────────────────────────────────────────────────
export const TIPOS_DOC = [
  "contrato", "briefing", "projeto", "foto", "video",
  "planilha", "apresentacao", "logotipo", "nota_fiscal", "outro"
] as const;

const MAX_IMPORT_LOTE = 50;

export type DriveSharedLink = {
  resourceId: string;
  resourceType: "arquivo" | "pasta";
  canonicalUrl: string;
};

/**
 * Aceita somente links HTTPS públicos de compartilhamento do Google Drive/Docs
 * e os reduz a uma URL estável para impedir duplicação por parâmetros de rastreio.
 */
export function parseGoogleDriveSharedLink(value: unknown): DriveSharedLink | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(host)) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const folderIndex = parts.findIndex((part, index) => (part === "folders" && (index === 0 || parts[index - 1] === "drive")));
    const fileIndex = parts.findIndex((part) => part === "file");
    const docsIndex = parts.findIndex((part) => ["document", "spreadsheets", "presentation", "forms", "drawings"].includes(part));
    const folderId = folderIndex >= 0 ? parts[folderIndex + 1] : null;
    const fileId = fileIndex >= 0 && parts[fileIndex + 1] === "d" ? parts[fileIndex + 2] : null;
    const docsId = docsIndex >= 0 && parts[docsIndex + 1] === "d" ? parts[docsIndex + 2] : null;
    const resourceId = folderId || fileId || docsId || url.searchParams.get("id");
    if (!resourceId || !/^[A-Za-z0-9_-]{10,}$/.test(resourceId)) return null;

    if (folderId) {
      return { resourceId, resourceType: "pasta", canonicalUrl: `https://drive.google.com/drive/folders/${resourceId}` };
    }
    return { resourceId, resourceType: "arquivo", canonicalUrl: `https://drive.google.com/open?id=${resourceId}` };
  } catch {
    return null;
  }
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, max) : null;
}

function optionalId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function validYear(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2099 ? parsed : null;
}

async function auditBatchImport(user: any, insertedIds: number[], skippedCount: number, ip?: string) {
  try {
    await getPool().execute(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
      [user?.userId || user?.user_id || null, "IMPORT_ACERVO_LOTE", "crm_acervo", null, JSON.stringify({ insertedIds, insertedCount: insertedIds.length, skippedCount }), ip || null],
    );
  } catch {
    // A importação já foi confirmada de forma transacional; a auditoria não deve revertê-la.
  }
}

// ─── Registrar rotas ──────────────────────────────────────────────────────────
export function registerAcervoRoutes(app: any) {
  const r = Router();

  // ── Listar documentos com filtros ──────────────────────────────────────────
  r.get("/", requireCrmAuth, async (req, res) => {
    try {
      const { busca, tipo_doc, evento_id, cliente_id, ano, limit = 50, offset = 0 } = req.query as any;
      let sql = "SELECT * FROM crm_acervo WHERE 1=1";
      const params: any[] = [];

      if (busca) {
        sql += " AND (nome LIKE ? OR descricao LIKE ? OR tags LIKE ? OR cliente_nome LIKE ? OR evento_nome LIKE ?)";
        const b = `%${busca}%`;
        params.push(b, b, b, b, b);
      }
      if (tipo_doc) { sql += " AND tipo_doc = ?"; params.push(tipo_doc); }
      if (evento_id) { sql += " AND evento_id = ?"; params.push(parseInt(evento_id)); }
      if (cliente_id) { sql += " AND cliente_id = ?"; params.push(parseInt(cliente_id)); }
      if (ano) { sql += " AND ano = ?"; params.push(parseInt(ano)); }

      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const offsetNum = Math.max(parseInt(offset) || 0, 0);
      sql += " ORDER BY created_at DESC";

      const rows = await db(sql + ` LIMIT ${limitNum} OFFSET ${offsetNum}`, params);

      // Contar total
      let countSql = "SELECT COUNT(*) as total FROM crm_acervo WHERE 1=1";
      const countParams: any[] = [];
      if (busca) {
        countSql += " AND (nome LIKE ? OR descricao LIKE ? OR tags LIKE ? OR cliente_nome LIKE ? OR evento_nome LIKE ?)";
        const b = `%${busca}%`;
        countParams.push(b, b, b, b, b);
      }
      if (tipo_doc) { countSql += " AND tipo_doc = ?"; countParams.push(tipo_doc); }
      if (evento_id) { countSql += " AND evento_id = ?"; countParams.push(parseInt(evento_id)); }
      if (cliente_id) { countSql += " AND cliente_id = ?"; countParams.push(parseInt(cliente_id)); }
      if (ano) { countSql += " AND ano = ?"; countParams.push(parseInt(ano)); }

      const countResult = await db<{ total: number }>(countSql, countParams);
      const total = countResult[0]?.total ?? 0;

      res.json({ docs: rows, total, limit: limitNum, offset: offsetNum });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Importar links compartilhados do Google Drive em lote ─────────────────
  // Não baixa nem replica arquivos do Drive: apenas cria referências após a
  // revisão explícita do usuário na prévia do CRM.
  r.post("/importar-lote", requireCrmAuth, async (req, res) => {
    const rawItems = Array.isArray(req.body?.itens) ? req.body.itens : [];
    if (!rawItems.length) return res.status(400).json({ error: "Inclua ao menos um link selecionado para importar." });
    if (rawItems.length > MAX_IMPORT_LOTE) return res.status(400).json({ error: `O limite é de ${MAX_IMPORT_LOTE} links por importação.` });

    try {
      const eventoId = optionalId(req.body?.evento_id);
      const clienteId = optionalId(req.body?.cliente_id);
      const anoPadrao = validYear(req.body?.ano) || new Date().getFullYear();
      const tagsPadrao = text(req.body?.tags, 1000);
      const [evento, cliente] = await Promise.all([
        eventoId ? dbOne<{ id: number; nome: string }>("SELECT id, nome FROM crm_eventos WHERE id = ?", [eventoId]) : Promise.resolve(null),
        clienteId ? dbOne<{ id: number; nome: string }>("SELECT id, nome FROM crm_clientes WHERE id = ?", [clienteId]) : Promise.resolve(null),
      ]);
      if (eventoId && !evento) return res.status(400).json({ error: "Evento inválido para a importação." });
      if (clienteId && !cliente) return res.status(400).json({ error: "Cliente inválido para a importação." });

      const seen = new Set<string>();
      const skipped: Array<{ index: number; nome: string; motivo: string }> = [];
      const prepared: Array<{
        index: number;
        nome: string;
        descricao: string | null;
        tipoDoc: string;
        ano: number;
        tags: string | null;
        urlDrive: string;
      }> = [];

      for (let index = 0; index < rawItems.length; index += 1) {
        const item = rawItems[index] || {};
        if (item.selecionado === false) {
          skipped.push({ index, nome: text(item.nome, 255) || `Item ${index + 1}`, motivo: "Não selecionado" });
          continue;
        }
        const parsed = parseGoogleDriveSharedLink(item.url_drive);
        if (!parsed) return res.status(400).json({ error: `O link da linha ${index + 1} não é um compartilhamento HTTPS válido do Google Drive.` });
        const nome = text(item.nome, 255) || `${parsed.resourceType === "pasta" ? "Pasta" : "Arquivo"} Google Drive — ${parsed.resourceId}`;
        if (seen.has(parsed.canonicalUrl)) {
          skipped.push({ index, nome, motivo: "Link repetido na própria prévia" });
          continue;
        }
        seen.add(parsed.canonicalUrl);
        prepared.push({
          index,
          nome,
          descricao: text(item.descricao, 4000),
          tipoDoc: TIPOS_DOC.includes(item.tipo_doc) ? item.tipo_doc : "outro",
          ano: validYear(item.ano) || anoPadrao,
          tags: text(item.tags, 1000) || tagsPadrao,
          urlDrive: parsed.canonicalUrl,
        });
      }

      if (!prepared.length) return res.json({ ok: true, inserted: 0, skipped, message: "Nenhum link selecionado para importar." });

      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();
        const urls = prepared.map((item) => item.urlDrive);
        const placeholders = urls.map(() => "?").join(",");
        const [existingRows] = await connection.execute(`SELECT url_drive FROM crm_acervo WHERE url_drive IN (${placeholders})`, urls) as any;
        const existing = new Set((existingRows as Array<{ url_drive: string }>).map((row) => row.url_drive));
        const toInsert = prepared.filter((item) => {
          if (!existing.has(item.urlDrive)) return true;
          skipped.push({ index: item.index, nome: item.nome, motivo: "Link já cadastrado no Acervo" });
          return false;
        });

        const insertedIds: number[] = [];
        for (const item of toInsert) {
          const [result] = await connection.execute(
            `INSERT INTO crm_acervo
              (nome, descricao, tipo_doc, evento_id, evento_nome, cliente_id, cliente_nome, ano, url_drive, tags, criado_por, criado_por_nome)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              item.nome, item.descricao, item.tipoDoc,
              evento?.id || null, evento?.nome || null,
              cliente?.id || null, cliente?.nome || null,
              item.ano, item.urlDrive, item.tags,
              (req as any).crmUser?.userId || (req as any).crmUser?.user_id || null,
              (req as any).crmUser?.name || (req as any).crmUser?.user_nome || null,
            ],
          ) as any;
          insertedIds.push(Number(result.insertId));
        }
        await connection.commit();
        await auditBatchImport((req as any).crmUser, insertedIds, skipped.length, req.ip);
        res.status(insertedIds.length ? 201 : 200).json({
          ok: true,
          inserted: insertedIds.length,
          insertedIds,
          skipped,
          message: insertedIds.length
            ? `${insertedIds.length} referência(s) do Google Drive adicionada(s) ao Acervo.`
            : "Nenhum link novo foi adicionado; os itens selecionados já estavam no Acervo.",
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Não foi possível importar os links do Google Drive." });
    }
  });

  // ── Buscar documento por ID ────────────────────────────────────────────────
  r.get("/:id", requireCrmAuth, async (req, res) => {
    try {
      const doc = await dbOne("SELECT * FROM crm_acervo WHERE id = ?", [req.params.id]);
      if (!doc) return res.status(404).json({ error: "Documento não encontrado" });
      res.json(doc);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Criar documento (com ou sem arquivo) ──────────────────────────────────
  r.post("/", requireCrmAuth, upload.single("arquivo"), async (req, res) => {
    try {
      const user = (req as any).crmUser;
      const {
        nome, descricao, tipo_doc = "outro",
        evento_id, evento_nome, cliente_id, cliente_nome,
        ano, url_drive, tags
      } = req.body;

      if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

      let url_arquivo: string | null = null;
      let nome_arquivo_original: string | null = null;
      let tamanho_bytes: number | null = null;
      let mime_type: string | null = null;
      let s3_key: string | null = null;

      // Upload para S3 se arquivo enviado
      if (req.file) {
        const ext = path.extname(req.file.originalname) || "";
        const randomSuffix = crypto.randomBytes(8).toString("hex");
        const anoStr = ano || new Date().getFullYear();
        const eventoSlug = (evento_nome || "geral").toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 40);
        const key = `acervo/${anoStr}/${eventoSlug}/${randomSuffix}${ext}`;
        const result = await storagePut(key, req.file.buffer, req.file.mimetype);
        url_arquivo = result.url;
        s3_key = result.key;
        nome_arquivo_original = req.file.originalname;
        tamanho_bytes = req.file.size;
        mime_type = req.file.mimetype;
      }

      // Obter userId e nome do usuário
      const userId = user.userId || user.user_id || null;
      const userName = user.name || user.user_nome || null;

      const [result] = await getPool().execute(
        `INSERT INTO crm_acervo 
          (nome, descricao, tipo_doc, evento_id, evento_nome, cliente_id, cliente_nome, ano, 
           url_arquivo, url_drive, nome_arquivo_original, tamanho_bytes, mime_type, s3_key, tags,
           criado_por, criado_por_nome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nome, descricao || null,
          TIPOS_DOC.includes(tipo_doc) ? tipo_doc : "outro",
          evento_id ? parseInt(evento_id) : null,
          evento_nome || null,
          cliente_id ? parseInt(cliente_id) : null,
          cliente_nome || null,
          ano ? parseInt(ano) : new Date().getFullYear(),
          url_arquivo,
          url_drive || null,
          nome_arquivo_original,
          tamanho_bytes,
          mime_type,
          s3_key,
          tags || null,
          userId,
          userName,
        ]
      ) as any;

      const doc = await dbOne("SELECT * FROM crm_acervo WHERE id = ?", [result.insertId]);
      res.status(201).json(doc);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Atualizar documento (metadados) ───────────────────────────────────────
  r.put("/:id", requireCrmAuth, async (req, res) => {
    try {
      const { nome, descricao, tipo_doc, evento_id, evento_nome, cliente_id, cliente_nome, ano, url_drive, tags } = req.body;
      await getPool().execute(
        `UPDATE crm_acervo SET
          nome = COALESCE(?, nome),
          descricao = COALESCE(?, descricao),
          tipo_doc = COALESCE(?, tipo_doc),
          evento_id = ?,
          evento_nome = COALESCE(?, evento_nome),
          cliente_id = ?,
          cliente_nome = COALESCE(?, cliente_nome),
          ano = COALESCE(?, ano),
          url_drive = COALESCE(?, url_drive),
          tags = COALESCE(?, tags)
        WHERE id = ?`,
        [
          nome || null, descricao || null,
          tipo_doc && TIPOS_DOC.includes(tipo_doc) ? tipo_doc : null,
          evento_id ? parseInt(evento_id) : null,
          evento_nome || null,
          cliente_id ? parseInt(cliente_id) : null,
          cliente_nome || null,
          ano ? parseInt(ano) : null,
          url_drive || null,
          tags || null,
          req.params.id
        ]
      );
      const doc = await dbOne("SELECT * FROM crm_acervo WHERE id = ?", [req.params.id]);
      res.json(doc);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Excluir documento ─────────────────────────────────────────────────────
  r.delete("/:id", requireCrmAuth, async (req, res) => {
    try {
      const doc = await dbOne("SELECT * FROM crm_acervo WHERE id = ?", [req.params.id]);
      if (!doc) return res.status(404).json({ error: "Documento não encontrado" });
      await getPool().execute("DELETE FROM crm_acervo WHERE id = ?", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Estatísticas do acervo ─────────────────────────────────────────────────
  r.get("/stats/resumo", requireCrmAuth, async (_req, res) => {
    try {
      const [total] = await db<{ total: number }>("SELECT COUNT(*) as total FROM crm_acervo");
      const porTipo = await db("SELECT tipo_doc, COUNT(*) as total FROM crm_acervo GROUP BY tipo_doc ORDER BY total DESC");
      const porAno = await db("SELECT ano, COUNT(*) as total FROM crm_acervo GROUP BY ano ORDER BY ano DESC");
      const porEvento = await db("SELECT evento_nome, COUNT(*) as total FROM crm_acervo WHERE evento_nome IS NOT NULL GROUP BY evento_nome ORDER BY total DESC LIMIT 10");
      res.json({ total: total.total, porTipo, porAno, porEvento });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Listar eventos disponíveis no acervo ──────────────────────────────────
  r.get("/meta/eventos", requireCrmAuth, async (_req, res) => {
    try {
      const rows = await db(
        "SELECT DISTINCT e.id, e.nome FROM crm_eventos e ORDER BY e.nome ASC"
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Listar clientes disponíveis ────────────────────────────────────────────
  r.get("/meta/clientes", requireCrmAuth, async (_req, res) => {
    try {
      const rows = await db(
        "SELECT id, nome FROM crm_clientes ORDER BY nome ASC"
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Anos disponíveis no acervo ─────────────────────────────────────────────
  r.get("/meta/anos", requireCrmAuth, async (_req, res) => {
    try {
      const rows = await db(
        "SELECT DISTINCT ano FROM crm_acervo WHERE ano IS NOT NULL ORDER BY ano DESC"
      );
      res.json(rows.map((r: any) => r.ano));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use("/api/crm/acervo", r);
}
