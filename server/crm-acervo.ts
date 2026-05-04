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
const TIPOS_DOC = [
  "contrato", "briefing", "projeto", "foto", "video",
  "planilha", "apresentacao", "logotipo", "nota_fiscal", "outro"
] as const;

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
