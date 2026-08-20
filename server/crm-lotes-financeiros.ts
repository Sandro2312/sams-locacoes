import { Router, Request, Response } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };
type LoteItemInput = {
  natureza: string;
  categoria?: string;
  descricao: string;
  valorTotal: unknown;
  parcelas?: unknown;
  primeiroVencimento: string;
  datasVencimento?: unknown;
  valoresParcelas?: unknown;
  formaPagamento?: string | null;
  observacoes?: string | null;
};
type NormalizedItem = {
  natureza: "receita" | "despesa";
  categoria: string;
  descricao: string;
  valorCents: number;
  parcelas: number;
  primeiroVencimento: string;
  datasVencimento: string[];
  valoresParcelas: string[];
  formaPagamento: string | null;
  observacoes: string | null;
};

const FINANCE_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"]);
const ITEM_NATURES = new Set(["receita", "despesa"]);
const ITEM_CATEGORIES = new Set(["venda_stand", "adicional", "projeto", "montagem", "taxas", "comissao_vendedor", "comissao_projetista", "logistica", "desmontagem", "fornecedor", "outros"]);
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
function tokenFrom(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const auth = String(req.headers.authorization || req.headers["x-crm-token"] || "").trim();
  return cookies.crm_session || (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : auth) || "";
}
function requireFinance(req: Request, res: Response, next: () => void) {
  const token = tokenFrom(req);
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSessionFromCrm(token).then((user) => {
    if (!user) return res.status(401).json({ error: "Sessão expirada" });
    const role = String((user as any).role || "").trim().toLowerCase();
    if (!FINANCE_ROLES.has(role)) return res.status(403).json({ error: "Acesso restrito aos lançamentos financeiros" });
    (req as any).crmUser = user;
    next();
  }).catch(() => res.status(500).json({ error: "Não foi possível validar a sessão" }));
}
function text(value: unknown, max = 255) { return String(value ?? "").trim().slice(0, max); }
function nullableText(value: unknown, max = 255) { const result = text(value, max); return result || null; }
function safeInt(value: unknown, fallback = 0, min = 0, max = 999999) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
function money(value: unknown) {
  let raw = String(value ?? "").trim().replace(/\s/g, "");
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error("VALOR_INVALIDO");
  const cents = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 99999999999999) throw new Error("VALOR_INVALIDO");
  return cents;
}
function isoDate(value: unknown) {
  const date = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error("DATA_INVALIDA");
  return date;
}
function asNumberFields(value: any): any {
  if (!value || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(asNumberFields);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "string" && /^-?\d+(?:\.\d+)?$/.test(item) ? Number(item) : asNumberFields(item)]));
}
function parcelDates(raw: unknown, parcelas: number, primeiroVencimento: string) {
  const supplied = Array.isArray(raw) ? raw.filter((date) => text(date, 10)).map(isoDate) : [];
  if (supplied.length && supplied.length !== parcelas) throw new Error("DATAS_PARCELAS_INCONSISTENTES");
  return supplied.length ? supplied : Array.from({ length: parcelas }, (_, index) => addMonths(primeiroVencimento, index));
}
function centsToAmount(cents: number) { return (cents / 100).toFixed(2); }
function equalParcelValues(totalCents: number, parcelas: number) {
  const base = Math.floor(totalCents / parcelas);
  const remainder = totalCents - (base * parcelas);
  return Array.from({ length: parcelas }, (_, index) => base + (index === parcelas - 1 ? remainder : 0));
}
function parcelValues(raw: unknown, parcelas: number, totalCents: number) {
  const supplied = Array.isArray(raw) ? raw : [];
  if (supplied.length && supplied.length !== parcelas) throw new Error("VALORES_PARCELAS_INCONSISTENTES");
  const values = supplied.length ? supplied.map(money) : equalParcelValues(totalCents, parcelas);
  if (values.reduce((sum, value) => sum + value, 0) !== totalCents) throw new Error("VALORES_PARCELAS_INCONSISTENTES");
  return values;
}
function normalizeItem(raw: any): NormalizedItem {
  const natureza = text(raw?.natureza, 20).toLowerCase();
  const categoria = text(raw?.categoria || "outros", 60).toLowerCase();
  const descricao = text(raw?.descricao, 500);
  const parcelas = safeInt(raw?.parcelas, 1, 1, 60);
  const primeiroVencimento = isoDate(raw?.primeiroVencimento ?? raw?.primeiro_vencimento);
  if (!ITEM_NATURES.has(natureza)) throw new Error("NATUREZA_INVALIDA");
  if (!ITEM_CATEGORIES.has(categoria)) throw new Error("CATEGORIA_INVALIDA");
  if (!descricao) throw new Error("DESCRICAO_OBRIGATORIA");
  const valorCents = money(raw?.valorTotal ?? raw?.valor_total);
  const valoresParcelas = parcelValues(raw?.valoresParcelas ?? raw?.valores_parcelas, parcelas, valorCents).map(centsToAmount);
  return {
    natureza: natureza as "receita" | "despesa",
    categoria,
    descricao,
    valorCents,
    parcelas,
    primeiroVencimento,
    datasVencimento: parcelDates(raw?.datasVencimento ?? raw?.datas_vencimento, parcelas, primeiroVencimento),
    valoresParcelas,
    formaPagamento: nullableText(raw?.formaPagamento ?? raw?.forma_pagamento, 120),
    observacoes: nullableText(raw?.observacoes, 4000),
  };
}
function addMonths(dateValue: string, months: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const monthIndex = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, monthIndex + 1, 0)).getUTCDate();
  return `${targetYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
function buildParcelas(totalCents: number, parcelas: number, primeiroVencimento: string, datasVencimento?: string[], valoresParcelas?: unknown) {
  const vencimentos = parcelDates(datasVencimento, parcelas, primeiroVencimento);
  const valores = parcelValues(valoresParcelas, parcelas, totalCents);
  return Array.from({ length: parcelas }, (_, index) => ({
    numero: index + 1,
    valor: centsToAmount(valores[index]),
    vencimento: vencimentos[index],
  }));
}
function storedDates(raw: unknown, parcelas: number, primeiroVencimento: string) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parcelDates(parsed, parcelas, primeiroVencimento);
  } catch { return parcelDates([], parcelas, primeiroVencimento); }
}
function storedValues(raw: unknown, parcelas: number, totalCents: number) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parcelValues(parsed, parcelas, totalCents).map(centsToAmount);
  } catch { return equalParcelValues(totalCents, parcelas).map(centsToAmount); }
}
function storedCreated(raw: unknown) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? asNumberFields(parsed) : [];
  } catch { return []; }
}
async function audit(conn: mysql.PoolConnection, user: CrmSession, action: string, recordId: number, details: Record<string, unknown>) {
  await conn.execute(
    "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
    [user.userId, action, "crm_lotes_financeiros_stand", recordId, JSON.stringify(details), null],
  );
}
async function getLote(loteId: number) {
  const lote = await dbOne<any>(
    `SELECT l.*, c.nome AS cliente_nome, e.nome AS evento_nome
       FROM crm_lotes_financeiros_stand l
       JOIN crm_clientes c ON c.id = l.cliente_id
       JOIN crm_eventos e ON e.id = l.evento_id
      WHERE l.id = ?`, [loteId],
  );
  if (!lote) return null;
  const itens = (await db<any>("SELECT * FROM crm_lotes_financeiros_stand_itens WHERE lote_id = ? ORDER BY id ASC", [loteId])).map((item) => {
    const primeiroVencimento = asNumberFields(item.primeiro_vencimento);
    const parcelas = Number(item.parcelas || 1);
    const totalCents = Math.round(Number(item.valor_total || 0) * 100);
    return {
      ...item,
      primeiro_vencimento: primeiroVencimento,
      datas_vencimento: storedDates(item.datas_vencimento, parcelas, String(primeiroVencimento)),
      valores_parcelas: storedValues(item.valores_parcelas, parcelas, totalCents),
      lancamentos_criados: storedCreated(item.lancamentos_criados),
    };
  });
  const resumo = itens.reduce((acc: any, item: any) => {
    const value = Number(item.valor_total || 0);
    if (item.natureza === "receita") acc.receitas += value;
    else acc.despesas += value;
    if (item.status === "rascunho") acc.pendentes += 1;
    return acc;
  }, { receitas: 0, despesas: 0, pendentes: 0 });
  return asNumberFields({ lote, itens, resumo: { ...resumo, resultado_estimado: resumo.receitas - resumo.despesas } });
}

export function registerLotesFinanceirosRoutes(app: any) {
  const r = Router();

  r.get("/", requireFinance, async (req, res) => {
    try {
      const limit = safeInt(req.query.limit, 30, 1, 100);
      const offset = safeInt(req.query.offset, 0, 0, 100000);
      const status = nullableText(req.query.status, 30);
      const where = status ? "WHERE l.status = ?" : "";
      const params = status ? [status] : [];
      const rows = await db<any>(
        `SELECT l.*, c.nome AS cliente_nome, e.nome AS evento_nome,
                (SELECT COUNT(*) FROM crm_lotes_financeiros_stand_itens i WHERE i.lote_id = l.id AND i.status = 'rascunho') AS itens_pendentes
           FROM crm_lotes_financeiros_stand l
           JOIN crm_clientes c ON c.id = l.cliente_id
           JOIN crm_eventos e ON e.id = l.evento_id
           ${where}
          ORDER BY l.updated_at DESC LIMIT ${limit} OFFSET ${offset}`, params,
      );
      res.json({ data: asNumberFields(rows), limit, offset });
    } catch (error: any) { res.status(500).json({ error: error?.message || "Não foi possível listar os lotes" }); }
  });

  r.post("/", requireFinance, async (req, res) => {
    const user = (req as any).crmUser as CrmSession;
    try {
      const clienteId = safeInt(req.body?.clienteId ?? req.body?.cliente_id, 0, 1);
      const eventoId = safeInt(req.body?.eventoId ?? req.body?.evento_id, 0, 1);
      const identificacaoStand = text(req.body?.identificacaoStand ?? req.body?.identificacao_stand, 180);
      if (!clienteId || !eventoId || !identificacaoStand) return res.status(400).json({ error: "Cliente, Evento e identificação do stand são obrigatórios" });
      const [cliente, evento] = await Promise.all([
        dbOne<any>("SELECT id, nome FROM crm_clientes WHERE id = ?", [clienteId]),
        dbOne<any>("SELECT id, nome FROM crm_eventos WHERE id = ?", [eventoId]),
      ]);
      if (!cliente) return res.status(400).json({ error: "Cliente não encontrado" });
      if (!evento) return res.status(400).json({ error: "Evento não encontrado" });
      const centroCusto = text(req.body?.centroCusto ?? req.body?.centro_custo, 220) || `${cliente.nome} · ${evento.nome} · ${identificacaoStand}`.slice(0, 220);
      const codigo = `LOTE-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;
      const [result] = await getPool().execute(
        `INSERT INTO crm_lotes_financeiros_stand
         (codigo, cliente_id, evento_id, identificacao_stand, centro_custo, status, observacoes, created_by, updated_by)
         VALUES (?,?,?,?,?,'rascunho',?,?,?)`,
        [codigo, clienteId, eventoId, identificacaoStand, centroCusto, nullableText(req.body?.observacoes, 4000), user.userId, user.userId],
      );
      const loteId = Number((result as any).insertId);
      const conn = await getPool().getConnection();
      try { await audit(conn, user, "CREATE_FINANCE_BATCH", loteId, { codigo, clienteId, eventoId, identificacaoStand }); } finally { conn.release(); }
      res.status(201).json({ ok: true, lote: await getLote(loteId) });
    } catch (error: any) { res.status(500).json({ error: error?.message || "Não foi possível criar o lote" }); }
  });

  r.get("/:id", requireFinance, async (req, res) => {
    try {
      const lote = await getLote(safeInt(req.params.id, 0, 1));
      if (!lote) return res.status(404).json({ error: "Lote financeiro não encontrado" });
      res.json(lote);
    } catch (error: any) { res.status(500).json({ error: error?.message || "Não foi possível carregar o lote" }); }
  });

  r.put("/:id", requireFinance, async (req, res) => {
    const user = (req as any).crmUser as CrmSession;
    try {
      const loteId = safeInt(req.params.id, 0, 1);
      const lote = await dbOne<any>("SELECT id, status FROM crm_lotes_financeiros_stand WHERE id = ?", [loteId]);
      if (!lote) return res.status(404).json({ error: "Lote financeiro não encontrado" });
      if (lote.status !== "rascunho") return res.status(409).json({ error: "Lote confirmado não pode ser alterado" });
      const identificacaoStand = text(req.body?.identificacaoStand ?? req.body?.identificacao_stand, 180);
      const centroCusto = text(req.body?.centroCusto ?? req.body?.centro_custo, 220);
      if (!identificacaoStand || !centroCusto) return res.status(400).json({ error: "Identificação do stand e centro de custo são obrigatórios" });
      await db("UPDATE crm_lotes_financeiros_stand SET identificacao_stand=?, centro_custo=?, observacoes=?, updated_by=? WHERE id=?", [identificacaoStand, centroCusto, nullableText(req.body?.observacoes, 4000), user.userId, loteId]);
      const conn = await getPool().getConnection();
      try { await audit(conn, user, "UPDATE_FINANCE_BATCH", loteId, { identificacaoStand, centroCusto }); } finally { conn.release(); }
      res.json({ ok: true, lote: await getLote(loteId) });
    } catch (error: any) { res.status(500).json({ error: error?.message || "Não foi possível atualizar o lote" }); }
  });

  r.post("/:id/itens", requireFinance, async (req, res) => {
    const user = (req as any).crmUser as CrmSession;
    try {
      const loteId = safeInt(req.params.id, 0, 1);
      const lote = await dbOne<any>("SELECT id, status FROM crm_lotes_financeiros_stand WHERE id = ?", [loteId]);
      if (!lote) return res.status(404).json({ error: "Lote financeiro não encontrado" });
      if (lote.status !== "rascunho") return res.status(409).json({ error: "Lote confirmado não aceita novos itens" });
      const item = normalizeItem(req.body);
      const [result] = await getPool().execute(
        `INSERT INTO crm_lotes_financeiros_stand_itens
         (lote_id, natureza, categoria, descricao, valor_total, parcelas, primeiro_vencimento, datas_vencimento, valores_parcelas, forma_pagamento, observacoes, status, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,'rascunho',?,?)`,
        [loteId, item.natureza, item.categoria, item.descricao, (item.valorCents / 100).toFixed(2), item.parcelas, item.primeiroVencimento, JSON.stringify(item.datasVencimento), JSON.stringify(item.valoresParcelas), item.formaPagamento, item.observacoes, user.userId, user.userId],
      );
      const itemId = Number((result as any).insertId);
      const conn = await getPool().getConnection();
      try { await audit(conn, user, "ADD_FINANCE_BATCH_ITEM", loteId, { itemId, natureza: item.natureza, categoria: item.categoria, valor: item.valorCents / 100, parcelas: item.parcelas }); } finally { conn.release(); }
      res.status(201).json({ ok: true, lote: await getLote(loteId) });
    } catch (error: any) {
      const known = ["VALOR_INVALIDO", "DATA_INVALIDA", "DATAS_PARCELAS_INCONSISTENTES", "VALORES_PARCELAS_INCONSISTENTES", "NATUREZA_INVALIDA", "CATEGORIA_INVALIDA", "DESCRICAO_OBRIGATORIA"];
      res.status(known.includes(error?.message) ? 400 : 500).json({ error: known.includes(error?.message) ? error.message : (error?.message || "Não foi possível adicionar o item") });
    }
  });

  r.delete("/:id/itens/:itemId", requireFinance, async (req, res) => {
    const user = (req as any).crmUser as CrmSession;
    try {
      const loteId = safeInt(req.params.id, 0, 1);
      const itemId = safeInt(req.params.itemId, 0, 1);
      const item = await dbOne<any>(`SELECT i.*, l.status AS lote_status FROM crm_lotes_financeiros_stand_itens i
                                      JOIN crm_lotes_financeiros_stand l ON l.id = i.lote_id WHERE i.id = ? AND i.lote_id = ?`, [itemId, loteId]);
      if (!item) return res.status(404).json({ error: "Item do lote não encontrado" });
      if (item.lote_status !== "rascunho" || item.status !== "rascunho") return res.status(409).json({ error: "Item confirmado não pode ser removido" });
      await db("DELETE FROM crm_lotes_financeiros_stand_itens WHERE id = ?", [itemId]);
      const conn = await getPool().getConnection();
      try { await audit(conn, user, "REMOVE_FINANCE_BATCH_ITEM", loteId, { itemId }); } finally { conn.release(); }
      res.json({ ok: true, lote: await getLote(loteId) });
    } catch (error: any) { res.status(500).json({ error: error?.message || "Não foi possível remover o item" }); }
  });

  r.post("/:id/confirmar", requireFinance, async (req, res) => {
    const user = (req as any).crmUser as CrmSession;
    try {
      if (req.body?.confirmacaoHumana !== true) return res.status(400).json({ error: "Confirme a revisão humana antes de gerar os lançamentos" });
      const loteId = safeInt(req.params.id, 0, 1);
      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();
        const [lotes] = await conn.execute("SELECT * FROM crm_lotes_financeiros_stand WHERE id = ? FOR UPDATE", [loteId]) as any;
        const lote = lotes?.[0];
        if (!lote) throw new Error("LOTE_NAO_ENCONTRADO");
        if (lote.status !== "rascunho") throw new Error("LOTE_JA_CONFIRMADO");
        const [itens] = await conn.execute("SELECT * FROM crm_lotes_financeiros_stand_itens WHERE lote_id = ? AND status = 'rascunho' ORDER BY id ASC FOR UPDATE", [loteId]) as any;
        if (!itens?.length) throw new Error("LOTE_SEM_ITENS");
        const allCreated: any[] = [];
        for (const item of itens as any[]) {
          const totalCents = Math.round(Number(item.valor_total) * 100);
          const primeiroVencimento = String(asNumberFields(item.primeiro_vencimento));
          const quantidadeParcelas = safeInt(item.parcelas, 1, 1, 60);
          const parcelas = buildParcelas(totalCents, quantidadeParcelas, primeiroVencimento, storedDates(item.datas_vencimento, quantidadeParcelas, primeiroVencimento), storedValues(item.valores_parcelas, quantidadeParcelas, totalCents));
          const created: any[] = [];
          for (const parcela of parcelas) {
            const descricao = parcelas.length > 1 ? `${item.descricao} — ${parcela.numero}/${parcelas.length}` : item.descricao;
            if (item.natureza === "receita") {
              const [result] = await conn.execute(
                `INSERT INTO crm_contas_receber
                 (cliente_id, evento_id, projeto_stand_id, centro_custo, descricao, valor, vencimento, status, forma_pagamento, observacoes)
                 VALUES (?,?,NULL,?,?,?,?, 'pendente',?,?)`,
                [lote.cliente_id, lote.evento_id, lote.centro_custo, descricao, parcela.valor, parcela.vencimento, item.forma_pagamento || null, item.observacoes || null],
              );
              created.push({ tipo: "conta_receber", id: Number((result as any).insertId), ...parcela });
            } else {
              const [result] = await conn.execute(
                `INSERT INTO crm_transacoes
                 (descricao, tipo, valor, status, centro_custo, data, observacoes, evento_id, cliente_id, projeto_stand_id, created_by)
                 VALUES (?,'pagar',?,'pendente',?,?,?,?,?,NULL,?)`,
                [descricao, parcela.valor, lote.centro_custo, parcela.vencimento, item.observacoes || null, lote.evento_id, lote.cliente_id, user.userId],
              );
              created.push({ tipo: "transacao", id: Number((result as any).insertId), ...parcela });
            }
          }
          await conn.execute("UPDATE crm_lotes_financeiros_stand_itens SET status='confirmado', lancamentos_criados=?, updated_by=? WHERE id=?", [JSON.stringify(created), user.userId, item.id]);
          allCreated.push({ itemId: item.id, natureza: item.natureza, lancamentos: created });
        }
        await conn.execute("UPDATE crm_lotes_financeiros_stand SET status='confirmado', confirmado_por=?, confirmado_por_nome=?, confirmado_em=NOW(), updated_by=? WHERE id=?", [user.userId, user.name, user.userId, loteId]);
        await audit(conn, user, "CONFIRM_FINANCE_BATCH", loteId, { itens: allCreated.length, lancamentos: allCreated });
        await conn.commit();
        res.json({ ok: true, lote: await getLote(loteId), lancamentos: allCreated });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally { conn.release(); }
    } catch (error: any) {
      const map: Record<string, string> = { LOTE_NAO_ENCONTRADO: "Lote financeiro não encontrado", LOTE_JA_CONFIRMADO: "Este lote já foi confirmado", LOTE_SEM_ITENS: "Adicione ao menos uma receita ou despesa antes de confirmar" };
      const status = map[error?.message] ? (error?.message === "LOTE_NAO_ENCONTRADO" ? 404 : 409) : 500;
      res.status(status).json({ error: map[error?.message] || error?.message || "Não foi possível confirmar o lote" });
    }
  });

  app.use("/api/crm/lotes-financeiros", r);
}
