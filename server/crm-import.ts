/**
 * crm-import.ts
 * Importação em lote via planilha (Excel/CSV) para 4 tabelas do CRM.
 * Endpoints:
 *   POST /api/crm/clientes/importar          — preview ou gravar clientes
 *   POST /api/crm/eventos/importar           — preview ou gravar eventos
 *   POST /api/crm/contas-receber/importar    — preview ou gravar contas a receber
 *   POST /api/crm/transacoes/importar        — preview ou gravar transações
 *   GET  /api/crm/importar/modelo/:tabela    — baixar .xlsx modelo
 */

import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import mysql from "mysql2/promise";
import { ENV } from "./_core/env";

let _importPool: mysql.Pool | null = null;
function getPool() {
  if (!_importPool) _importPool = mysql.createPool(ENV.databaseUrl);
  return _importPool;
}
async function db<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

// ─── Multer: memória, max 10 MB ───────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname) ||
      file.mimetype.includes("spreadsheet") ||
      file.mimetype.includes("csv") ||
      file.mimetype.includes("excel") ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/octet-stream";
    cb(null, ok);
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseDate(v: any): string | null {
  if (!v) return null;
  if (typeof v === "number") {
    // Número serial do Excel
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/AAAA
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // MM/DD/AAAA
  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[1]}-${m2[2]}`;
  return null;
}

function parseDecimal(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function sheetToRows(buffer: Buffer, mimetype: string, originalname: string): Record<string, any>[] {
  const isCSV = /\.csv$/i.test(originalname) || mimetype === "text/csv";
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false, raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

// ─── Audit ────────────────────────────────────────────────────────────────────
async function audit(userId: number | null, action: string, table: string, recordId: number | null, details?: any, ip?: string) {
  try {
    await db(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
      [userId, action, table, recordId, details ? JSON.stringify(details) : null, ip ?? null]
    );
  } catch { /* não bloquear */ }
}

// ─── Middleware de auth ───────────────────────────────────────────────────────
function requireCrmAuth(req: any, res: any, next: any) {
  if (!(req as any).crmUser) return res.status(401).json({ error: "Não autenticado" });
  next();
}

// ─── Modelos de planilha ─────────────────────────────────────────────────────
const MODELOS: Record<string, { headers: string[]; exemplo: Record<string, string> }> = {
  clientes: {
    headers: ["nome", "email", "telefone", "documento", "cep", "endereco", "bairro", "cidade", "estado", "segmento", "status", "observacoes"],
    exemplo: { nome: "SAMS Locações Ltda", email: "contato@sams.com.br", telefone: "(11) 99999-9999", documento: "00.000.000/0001-00", cep: "01310-100", endereco: "Av. Paulista, 1000", bairro: "Bela Vista", cidade: "São Paulo", estado: "SP", segmento: "Indústria", status: "Ativo", observacoes: "" },
  },
  eventos: {
    headers: ["nome", "organizadora", "local", "endereco", "data_inicio", "data_fim", "status", "observacoes"],
    exemplo: { nome: "FORMÓBILE 2026", organizadora: "Reed Exhibitions", local: "Expo Center Norte", endereco: "R. José Bernardo Pinto, 333 - Vila Guilherme", data_inicio: "2026-08-10", data_fim: "2026-08-14", status: "Planejado", observacoes: "" },
  },
  "contas-receber": {
    headers: ["cliente", "descricao", "valor", "vencimento", "status", "data_pagamento", "valor_pago", "forma_pagamento", "observacoes"],
    exemplo: { cliente: "SAMS Locações Ltda", descricao: "Montagem Stand Feira X", valor: "15000.00", vencimento: "2026-09-01", status: "pendente", data_pagamento: "", valor_pago: "", forma_pagamento: "Transferência", observacoes: "" },
  },
  transacoes: {
    headers: ["descricao", "tipo", "valor", "status", "centro_custo", "data", "evento", "cliente", "observacoes"],
    exemplo: { descricao: "Aluguel de equipamentos", tipo: "pagar", valor: "3500.00", status: "pendente", centro_custo: "Operacional", data: "2026-08-01", evento: "FORMÓBILE 2026", cliente: "", observacoes: "" },
  },
};

// ─── Validadores por tabela ───────────────────────────────────────────────────

interface RowResult {
  row: number;
  data: Record<string, any>;
  status: "ok" | "warning" | "duplicate" | "error";
  messages: string[];
  resolved: Record<string, any>; // campos resolvidos (cliente_id, evento_id)
}

async function validateClientes(rows: Record<string, any>[]): Promise<RowResult[]> {
  // Buscar documentos e emails existentes
  const existingDocs = new Set<string>();
  const existingEmails = new Set<string>();
  const existing = await db("SELECT documento, email FROM crm_clientes WHERE documento IS NOT NULL OR email IS NOT NULL") as any[];
  for (const r of existing) {
    if (r.documento) existingDocs.add(normalize(r.documento));
    if (r.email) existingEmails.add(normalize(r.email));
  }

  return rows.map((row, i) => {
    const messages: string[] = [];
    let status: RowResult["status"] = "ok";
    const nome = String(row["nome"] ?? "").trim();
    if (!nome) { messages.push("Campo obrigatório 'nome' está vazio"); status = "error"; }
    const doc = String(row["documento"] ?? "").trim();
    const email = String(row["email"] ?? "").trim();
    if (doc && existingDocs.has(normalize(doc))) {
      messages.push(`Possível duplicata: documento '${doc}' já existe na base`);
      status = "duplicate";
    } else if (email && existingEmails.has(normalize(email))) {
      messages.push(`Possível duplicata: email '${email}' já existe na base`);
      if (status === "ok") status = "duplicate";
    }
    const estadoVal = String(row["estado"] ?? "").trim().toUpperCase().slice(0, 2);
    return {
      row: i + 2,
      data: {
        nome,
        email: email || null,
        telefone: String(row["telefone"] ?? "").trim() || null,
        documento: doc || null,
        cep: String(row["cep"] ?? "").trim() || null,
        endereco: String(row["endereco"] ?? "").trim() || null,
        bairro: String(row["bairro"] ?? "").trim() || null,
        cidade: String(row["cidade"] ?? "").trim() || null,
        estado: estadoVal || null,
        segmento: String(row["segmento"] ?? "").trim() || null,
        status: String(row["status"] ?? "Ativo").trim() || "Ativo",
        observacoes: String(row["observacoes"] ?? "").trim() || null,
      },
      resolved: {},
      status,
      messages,
    };
  });
}

async function validateEventos(rows: Record<string, any>[]): Promise<RowResult[]> {
  const existing = await db("SELECT nome, data_inicio FROM crm_eventos") as any[];
  const existingKeys = new Set(existing.map((e: any) => `${normalize(e.nome)}|${e.data_inicio ?? ""}`));

  return rows.map((row, i) => {
    const messages: string[] = [];
    let status: RowResult["status"] = "ok";
    const nome = String(row["nome"] ?? "").trim();
    if (!nome) { messages.push("Campo obrigatório 'nome' está vazio"); status = "error"; }
    const dataInicio = parseDate(row["data_inicio"]);
    const dataFim = parseDate(row["data_fim"]);
    if (row["data_inicio"] && !dataInicio) messages.push(`Formato de data_inicio inválido: '${row["data_inicio"]}' (use AAAA-MM-DD)`);
    if (row["data_fim"] && !dataFim) messages.push(`Formato de data_fim inválido: '${row["data_fim"]}' (use AAAA-MM-DD)`);
    const key = `${normalize(nome)}|${dataInicio ?? ""}`;
    if (existingKeys.has(key)) {
      messages.push(`Possível duplicata: evento '${nome}' com data_inicio '${dataInicio}' já existe`);
      status = "duplicate";
    }
    if (messages.length && status === "ok") status = "warning";
    return {
      row: i + 2,
      data: {
        nome,
        organizadora: String(row["organizadora"] ?? "").trim() || null,
        local: String(row["local"] ?? "").trim() || null,
        endereco: String(row["endereco"] ?? "").trim() || null,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: String(row["status"] ?? "Planejado").trim() || "Planejado",
        observacoes: String(row["observacoes"] ?? "").trim() || null,
      },
      resolved: {},
      status,
      messages,
    };
  });
}

async function validateContasReceber(rows: Record<string, any>[]): Promise<RowResult[]> {
  // Carregar clientes para resolução
  const clientes = await db("SELECT id, nome, documento FROM crm_clientes") as any[];

  // Verificar duplicatas existentes
  const existing = await db("SELECT descricao, valor, vencimento FROM crm_contas_receber") as any[];
  const existingKeys = new Set(existing.map((e: any) => `${normalize(e.descricao)}|${e.valor}|${e.vencimento}`));

  return rows.map((row, i) => {
    const messages: string[] = [];
    let status: RowResult["status"] = "ok";
    const descricao = String(row["descricao"] ?? "").trim();
    if (!descricao) { messages.push("Campo obrigatório 'descricao' está vazio"); status = "error"; }
    const valor = parseDecimal(row["valor"]);
    if (valor === null) { messages.push("Campo obrigatório 'valor' inválido ou vazio"); if (status === "ok") status = "error"; }
    const vencimento = parseDate(row["vencimento"]);
    if (!vencimento) { messages.push(`Campo obrigatório 'vencimento' inválido: '${row["vencimento"]}' (use AAAA-MM-DD)`); if (status === "ok") status = "error"; }

    // Resolução de cliente
    let clienteId: number | null = null;
    const clienteStr = String(row["cliente"] ?? "").trim();
    if (clienteStr) {
      const byDoc = clientes.find((c: any) => c.documento && normalize(c.documento) === normalize(clienteStr));
      const byNome = clientes.find((c: any) => normalize(c.nome) === normalize(clienteStr));
      if (byDoc) clienteId = byDoc.id;
      else if (byNome) clienteId = byNome.id;
      else {
        messages.push(`Cliente não encontrado: '${clienteStr}' — será importado sem vínculo`);
        if (status === "ok") status = "warning";
      }
    }

    // Duplicata
    const key = `${normalize(descricao)}|${valor}|${vencimento ?? ""}`;
    if (existingKeys.has(key)) {
      messages.push(`Possível duplicata: mesma descrição, valor e vencimento já existem`);
      if (status === "ok") status = "duplicate";
    }

    const statusVal = String(row["status"] ?? "pendente").trim().toLowerCase();
    const validStatus = ["pendente", "pago", "vencido", "cancelado"];
    const finalStatus = validStatus.includes(statusVal) ? statusVal : "pendente";
    if (statusVal && !validStatus.includes(statusVal)) messages.push(`Status '${statusVal}' inválido, será importado como 'pendente'`);

    return {
      row: i + 2,
      data: {
        descricao,
        valor,
        vencimento,
        status: finalStatus,
        data_pagamento: parseDate(row["data_pagamento"]),
        valor_pago: parseDecimal(row["valor_pago"]),
        forma_pagamento: String(row["forma_pagamento"] ?? "").trim() || null,
        observacoes: String(row["observacoes"] ?? "").trim() || null,
      },
      resolved: { cliente_id: clienteId, cliente_nome: clienteStr || null },
      status,
      messages,
    };
  });
}

async function validateTransacoes(rows: Record<string, any>[]): Promise<RowResult[]> {
  const clientes = await db("SELECT id, nome, documento FROM crm_clientes") as any[];
  const eventos = await db("SELECT id, nome FROM crm_eventos") as any[];
  const existing = await db("SELECT descricao, valor, data FROM crm_transacoes") as any[];
  const existingKeys = new Set(existing.map((e: any) => `${normalize(e.descricao)}|${e.valor}|${e.data ?? ""}`));

  return rows.map((row, i) => {
    const messages: string[] = [];
    let status: RowResult["status"] = "ok";
    const descricao = String(row["descricao"] ?? "").trim();
    if (!descricao) { messages.push("Campo obrigatório 'descricao' está vazio"); status = "error"; }
    const tipo = String(row["tipo"] ?? "").trim().toLowerCase();
    if (!tipo) { messages.push("Campo obrigatório 'tipo' está vazio (use 'pagar' ou 'receber')"); if (status === "ok") status = "error"; }
    else if (!["pagar", "receber"].includes(tipo)) { messages.push(`Tipo '${tipo}' inválido — use exatamente 'pagar' ou 'receber'`); if (status === "ok") status = "error"; }
    const valor = parseDecimal(row["valor"]);
    if (valor === null) { messages.push("Campo obrigatório 'valor' inválido ou vazio"); if (status === "ok") status = "error"; }
    const data = parseDate(row["data"]);
    if (row["data"] && !data) messages.push(`Formato de data inválido: '${row["data"]}' (use AAAA-MM-DD)`);

    // Resolução de cliente
    let clienteId: number | null = null;
    const clienteStr = String(row["cliente"] ?? "").trim();
    if (clienteStr) {
      const byDoc = clientes.find((c: any) => c.documento && normalize(c.documento) === normalize(clienteStr));
      const byNome = clientes.find((c: any) => normalize(c.nome) === normalize(clienteStr));
      if (byDoc) clienteId = byDoc.id;
      else if (byNome) clienteId = byNome.id;
      else { messages.push(`Cliente não encontrado: '${clienteStr}' — importado sem vínculo`); if (status === "ok") status = "warning"; }
    }

    // Resolução de evento
    let eventoId: number | null = null;
    const eventoStr = String(row["evento"] ?? "").trim();
    if (eventoStr) {
      const ev = eventos.find((e: any) => normalize(e.nome) === normalize(eventoStr));
      if (ev) eventoId = ev.id;
      else { messages.push(`Evento não encontrado: '${eventoStr}' — importado sem vínculo`); if (status === "ok") status = "warning"; }
    }

    // Duplicata
    const key = `${normalize(descricao)}|${valor}|${data ?? ""}`;
    if (existingKeys.has(key)) {
      messages.push(`Possível duplicata: mesma descrição, valor e data já existem`);
      if (status === "ok") status = "duplicate";
    }

    if (messages.length && status === "ok") status = "warning";

    return {
      row: i + 2,
      data: {
        descricao,
        tipo,
        valor,
        status: String(row["status"] ?? "pendente").trim() || "pendente",
        centro_custo: String(row["centro_custo"] ?? "").trim() || null,
        data,
        observacoes: String(row["observacoes"] ?? "").trim() || null,
      },
      resolved: { cliente_id: clienteId, evento_id: eventoId, cliente_nome: clienteStr || null, evento_nome: eventoStr || null },
      status,
      messages,
    };
  });
}

// ─── Gravação em lote ─────────────────────────────────────────────────────────

async function insertClientes(rows: RowResult[], userId: number, ip: string) {
  let imported = 0; const errors: string[] = [];
  for (const r of rows) {
    try {
      const d = r.data;
      const res: any = await db(
        "INSERT INTO crm_clientes (nome,email,telefone,documento,cep,endereco,bairro,cidade,estado,segmento,status,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [d.nome,d.email,d.telefone,d.documento,d.cep,d.endereco,d.bairro,d.cidade,d.estado,d.segmento,d.status,d.observacoes]
      );
      await audit(userId, "import_create", "crm_clientes", res?.insertId ?? null, { nome: d.nome }, ip);
      imported++;
    } catch (e: any) { errors.push(`Linha ${r.row}: ${e?.message}`); }
  }
  return { imported, errors };
}

async function insertEventos(rows: RowResult[], userId: number, ip: string) {
  let imported = 0; const errors: string[] = [];
  for (const r of rows) {
    try {
      const d = r.data;
      const res: any = await db(
        "INSERT INTO crm_eventos (nome,organizadora,local,endereco,data_inicio,data_fim,status,observacoes) VALUES (?,?,?,?,?,?,?,?)",
        [d.nome,d.organizadora,d.local,d.endereco,d.data_inicio,d.data_fim,d.status,d.observacoes]
      );
      await audit(userId, "import_create", "crm_eventos", res?.insertId ?? null, { nome: d.nome }, ip);
      imported++;
    } catch (e: any) { errors.push(`Linha ${r.row}: ${e?.message}`); }
  }
  return { imported, errors };
}

async function insertContasReceber(rows: RowResult[], userId: number, ip: string) {
  let imported = 0; const errors: string[] = [];
  for (const r of rows) {
    try {
      const d = r.data; const rv = r.resolved;
      const res: any = await db(
        "INSERT INTO crm_contas_receber (cliente_id,descricao,valor,vencimento,status,data_pagamento,valor_pago,forma_pagamento,observacoes) VALUES (?,?,?,?,?,?,?,?,?)",
        [rv.cliente_id,d.descricao,d.valor,d.vencimento,d.status,d.data_pagamento,d.valor_pago,d.forma_pagamento,d.observacoes]
      );
      await audit(userId, "import_create", "crm_contas_receber", res?.insertId ?? null, { descricao: d.descricao, valor: d.valor }, ip);
      imported++;
    } catch (e: any) { errors.push(`Linha ${r.row}: ${e?.message}`); }
  }
  return { imported, errors };
}

async function insertTransacoes(rows: RowResult[], userId: number, ip: string) {
  let imported = 0; const errors: string[] = [];
  for (const r of rows) {
    try {
      const d = r.data; const rv = r.resolved;
      const res: any = await db(
        "INSERT INTO crm_transacoes (descricao,tipo,valor,status,centro_custo,data,observacoes,evento_id,cliente_id,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [d.descricao,d.tipo,d.valor,d.status,d.centro_custo,d.data,d.observacoes,rv.evento_id,rv.cliente_id,userId]
      );
      await audit(userId, "import_create", "crm_transacoes", res?.insertId ?? null, { descricao: d.descricao, tipo: d.tipo, valor: d.valor }, ip);
      imported++;
    } catch (e: any) { errors.push(`Linha ${r.row}: ${e?.message}`); }
  }
  return { imported, errors };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function registerImportRoutes(r: any) {

  // GET /api/crm/importar/modelo/:tabela — baixar .xlsx modelo
  r.get("/importar/modelo/:tabela", requireCrmAuth, (req: any, res: any) => {
    const tabela = req.params.tabela as string;
    const modelo = MODELOS[tabela];
    if (!modelo) return res.status(404).json({ error: `Tabela '${tabela}' não tem modelo disponível` });

    const wb = XLSX.utils.book_new();
    const data = [modelo.headers, Object.values(modelo.exemplo)];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Largura das colunas
    ws["!cols"] = modelo.headers.map(() => ({ wch: 22 }));

    XLSX.utils.book_append_sheet(wb, ws, "Importação");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="modelo_${tabela}.xlsx"`);
    res.send(buf);
  });

  // ── Clientes ──────────────────────────────────────────────────────────────
  r.post("/clientes/importar", requireCrmAuth, upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      const rows = sheetToRows(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!rows.length) return res.status(400).json({ error: "Planilha vazia ou sem dados" });
      const validated = await validateClientes(rows);

      // Modo preview (sem confirmar)
      if (req.body.preview === "1" || req.body.preview === "true") {
        return res.json({ preview: true, total: validated.length, rows: validated });
      }

      // Modo gravar: receber lista de índices selecionados
      let selectedIndexes: number[] = [];
      try { selectedIndexes = JSON.parse(req.body.selected ?? "[]"); } catch { selectedIndexes = validated.map((_, i) => i); }
      const toInsert = selectedIndexes.map(i => validated[i]).filter(r => r && r.status !== "error");
      const u = req.crmUser;
      const result = await insertClientes(toInsert, u.userId, req.ip);
      res.json({ ok: true, ...result, total_selecionados: toInsert.length });
    } catch (e: any) { res.status(500).json({ error: e?.message }); }
  });

  // ── Eventos ───────────────────────────────────────────────────────────────
  r.post("/eventos/importar", requireCrmAuth, upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      const rows = sheetToRows(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!rows.length) return res.status(400).json({ error: "Planilha vazia ou sem dados" });
      const validated = await validateEventos(rows);

      if (req.body.preview === "1" || req.body.preview === "true") {
        return res.json({ preview: true, total: validated.length, rows: validated });
      }

      let selectedIndexes: number[] = [];
      try { selectedIndexes = JSON.parse(req.body.selected ?? "[]"); } catch { selectedIndexes = validated.map((_, i) => i); }
      const toInsert = selectedIndexes.map(i => validated[i]).filter(r => r && r.status !== "error");
      const u = req.crmUser;
      const result = await insertEventos(toInsert, u.userId, req.ip);
      res.json({ ok: true, ...result, total_selecionados: toInsert.length });
    } catch (e: any) { res.status(500).json({ error: e?.message }); }
  });

  // ── Contas a Receber ──────────────────────────────────────────────────────
  r.post("/contas-receber/importar", requireCrmAuth, upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      const rows = sheetToRows(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!rows.length) return res.status(400).json({ error: "Planilha vazia ou sem dados" });
      const validated = await validateContasReceber(rows);

      if (req.body.preview === "1" || req.body.preview === "true") {
        return res.json({ preview: true, total: validated.length, rows: validated });
      }

      let selectedIndexes: number[] = [];
      try { selectedIndexes = JSON.parse(req.body.selected ?? "[]"); } catch { selectedIndexes = validated.map((_, i) => i); }
      const toInsert = selectedIndexes.map(i => validated[i]).filter(r => r && r.status !== "error");
      const u = req.crmUser;
      const result = await insertContasReceber(toInsert, u.userId, req.ip);
      res.json({ ok: true, ...result, total_selecionados: toInsert.length });
    } catch (e: any) { res.status(500).json({ error: e?.message }); }
  });

  // ── Transações ────────────────────────────────────────────────────────────
  r.post("/transacoes/importar", requireCrmAuth, upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      const rows = sheetToRows(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!rows.length) return res.status(400).json({ error: "Planilha vazia ou sem dados" });
      const validated = await validateTransacoes(rows);

      if (req.body.preview === "1" || req.body.preview === "true") {
        return res.json({ preview: true, total: validated.length, rows: validated });
      }

      let selectedIndexes: number[] = [];
      try { selectedIndexes = JSON.parse(req.body.selected ?? "[]"); } catch { selectedIndexes = validated.map((_, i) => i); }
      const toInsert = selectedIndexes.map(i => validated[i]).filter(r => r && r.status !== "error");
      const u = req.crmUser;
      const result = await insertTransacoes(toInsert, u.userId, req.ip);
      res.json({ ok: true, ...result, total_selecionados: toInsert.length });
    } catch (e: any) { res.status(500).json({ error: e?.message }); }
  });
}
