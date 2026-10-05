import { Request, Response, Router } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionFromCrm } from "./crm";

type CrmSession = { userId: number; role: string; name: string };

type PurchaseInput = {
  descricao: string;
  fornecedor: string | null;
  categoria: string;
  valorTotalCents: number;
  valorEntradaCents: number;
  valorFinanciadoCents: number;
  parcelas: number;
  dataEntrada: string | null;
  primeiroVencimento: string | null;
  statusEntrada: "pendente" | "pago";
  dataPagamentoEntrada: string | null;
  formaPagamentoEntrada: string | null;
  formaPagamentoParcelas: string | null;
  centroCusto: string | null;
  eventoId: number | null;
  clienteId: number | null;
  projetoStandId: number | null;
  observacoes: string | null;
};

const FINANCE_ROLES = new Set(["admin", "administrador", "manager", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"]);
const PURCHASE_CATEGORIES = new Set(["veiculo", "maquina", "equipamento", "mobiliario", "ferramenta", "tecnologia", "estoque", "servico", "outros"]);
let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) pool = mysql.createPool(ENV.databaseUrl);
  return pool;
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
    if (!FINANCE_ROLES.has(role)) return res.status(403).json({ error: "Acesso restrito às compras financeiras" });
    (req as any).crmUser = user;
    next();
  }).catch(() => res.status(500).json({ error: "Não foi possível validar a sessão" }));
}

function text(value: unknown, max = 255) { return String(value ?? "").trim().slice(0, max); }
function nullableText(value: unknown, max = 255) { const normalized = text(value, max); return normalized || null; }
function safeInt(value: unknown, fallback = 0, min = 0, max = 999999) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function money(value: unknown, allowZero = false) {
  let raw = String(value ?? "").trim().replace(/\s/g, "");
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error("VALOR_INVALIDO");
  const cents = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || (!allowZero && cents === 0) || cents > 99999999999999) throw new Error("VALOR_INVALIDO");
  return cents;
}

function isoDate(value: unknown) {
  const date = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error("DATA_INVALIDA");
  return date;
}

function optionalDate(value: unknown) {
  const raw = text(value, 10);
  return raw ? isoDate(raw) : null;
}

function addMonths(dateValue: string, months: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const monthIndex = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, monthIndex + 1, 0)).getUTCDate();
  return `${targetYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function centsToAmount(cents: number) { return (cents / 100).toFixed(2); }

function equalInstallments(totalCents: number, count: number) {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - (base * count);
  return Array.from({ length: count }, (_, index) => base + (index === count - 1 ? remainder : 0));
}

function buildCode() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `CMP-${ymd}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

async function one<T = any>(conn: mysql.PoolConnection, sql: string, params: any[] = []) {
  const [rows] = await conn.execute(sql, params);
  return (rows as T[])[0] ?? null;
}

function normalizePurchase(raw: any): PurchaseInput {
  const descricao = text(raw?.descricao, 255);
  const categoria = text(raw?.categoria || "outros", 80).toLowerCase();
  const valorTotalCents = money(raw?.valorTotal ?? raw?.valor_total);
  const valorEntradaCents = money(raw?.valorEntrada ?? raw?.valor_entrada ?? 0, true);
  const valorFinanciadoCents = valorTotalCents - valorEntradaCents;
  const parcelas = safeInt(raw?.parcelas, 0, 0, 120);
  const dataEntrada = optionalDate(raw?.dataEntrada ?? raw?.data_entrada);
  const primeiroVencimento = optionalDate(raw?.primeiroVencimento ?? raw?.primeiro_vencimento);
  const statusEntrada = text((raw?.statusEntrada ?? raw?.status_entrada) || "pendente", 20).toLowerCase();
  const dataPagamentoEntrada = optionalDate(raw?.dataPagamentoEntrada ?? raw?.data_pagamento_entrada);

  if (!descricao) throw new Error("DESCRICAO_OBRIGATORIA");
  if (!PURCHASE_CATEGORIES.has(categoria)) throw new Error("CATEGORIA_INVALIDA");
  if (valorEntradaCents > valorTotalCents) throw new Error("ENTRADA_MAIOR_QUE_TOTAL");
  if (valorEntradaCents > 0 && !dataEntrada) throw new Error("DATA_ENTRADA_OBRIGATORIA");
  if (valorFinanciadoCents > 0 && (parcelas < 1 || !primeiroVencimento)) throw new Error("PARCELAS_OU_VENCIMENTO_INVALIDOS");
  if (valorFinanciadoCents === 0 && parcelas !== 0) throw new Error("PARCELAS_NAO_APLICAVEIS");
  if (!["pendente", "pago"].includes(statusEntrada)) throw new Error("STATUS_ENTRADA_INVALIDO");
  if (statusEntrada === "pago" && valorEntradaCents > 0 && !dataPagamentoEntrada) throw new Error("DATA_PAGAMENTO_ENTRADA_OBRIGATORIA");

  return {
    descricao,
    fornecedor: nullableText(raw?.fornecedor, 255),
    categoria,
    valorTotalCents,
    valorEntradaCents,
    valorFinanciadoCents,
    parcelas,
    dataEntrada,
    primeiroVencimento,
    statusEntrada: statusEntrada as "pendente" | "pago",
    dataPagamentoEntrada,
    formaPagamentoEntrada: nullableText(raw?.formaPagamentoEntrada ?? raw?.forma_pagamento_entrada, 120),
    formaPagamentoParcelas: nullableText(raw?.formaPagamentoParcelas ?? raw?.forma_pagamento_parcelas, 120),
    centroCusto: nullableText(raw?.centroCusto ?? raw?.centro_custo, 150),
    eventoId: safeInt(raw?.eventoId ?? raw?.evento_id, 0, 0) || null,
    clienteId: safeInt(raw?.clienteId ?? raw?.cliente_id, 0, 0) || null,
    projetoStandId: safeInt(raw?.projetoStandId ?? raw?.projeto_stand_id, 0, 0) || null,
    observacoes: nullableText(raw?.observacoes, 4000),
  };
}

async function audit(conn: mysql.PoolConnection, user: CrmSession, compraId: number, details: Record<string, unknown>, ip?: string) {
  await conn.execute(
    "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
    [user.userId, "CREATE_GENERAL_PURCHASE", "crm_compras", compraId, JSON.stringify(details), ip || null],
  );
}

export function registerComprasRoutes(app: any) {
  const router = Router();
  router.use(requireFinance);

  router.post("/", async (req: Request, res: Response) => {
    let connection: mysql.PoolConnection | null = null;
    try {
      const user = (req as any).crmUser as CrmSession;
      const input = normalizePurchase(req.body);
      connection = await getPool().getConnection();
      await connection.beginTransaction();

      let eventoId = input.eventoId;
      let clienteId = input.clienteId;
      if (input.projetoStandId) {
        const project = await one<{ evento_id: number; cliente_id: number }>(connection, "SELECT evento_id, cliente_id FROM crm_projetos_stand WHERE id=?", [input.projetoStandId]);
        if (!project) throw new Error("PROJETO_STAND_INVALIDO");
        if (eventoId && eventoId !== Number(project.evento_id)) throw new Error("EVENTO_PROJETO_INCONSISTENTE");
        if (clienteId && clienteId !== Number(project.cliente_id)) throw new Error("CLIENTE_PROJETO_INCONSISTENTE");
        eventoId = Number(project.evento_id);
        clienteId = Number(project.cliente_id);
      }

      const codigo = buildCode();
      const [headerResult] = await connection.execute<any>(
        `INSERT INTO crm_compras
         (codigo,descricao,fornecedor,categoria,valor_total,valor_entrada,valor_financiado,parcelas,data_entrada,primeiro_vencimento,forma_pagamento_entrada,forma_pagamento_parcelas,centro_custo,evento_id,cliente_id,projeto_stand_id,observacoes,status,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'ativo',?)`,
        [
          codigo, input.descricao, input.fornecedor, input.categoria,
          centsToAmount(input.valorTotalCents), centsToAmount(input.valorEntradaCents), centsToAmount(input.valorFinanciadoCents), input.parcelas,
          input.dataEntrada, input.primeiroVencimento, input.formaPagamentoEntrada, input.formaPagamentoParcelas,
          input.centroCusto, eventoId, clienteId, input.projetoStandId, input.observacoes, user.userId,
        ],
      );
      const compraId = Number(headerResult.insertId);
      const transactions: Array<{ id: number; tipo: "entrada" | "parcela"; numero: number; valor: string; vencimento: string }> = [];

      const insertTransaction = async (payload: { descricao: string; valorCents: number; status: string; data: string; dataPagamento: string | null; formaPagamento: string | null; parcelaNumero: number; tipo: "entrada" | "parcela" }) => {
        const [result] = await connection!.execute<any>(
          `INSERT INTO crm_transacoes
           (descricao,tipo,valor,status,centro_custo,fornecedor,categoria,forma_pagamento,data,data_pagamento,observacoes,evento_id,cliente_id,projeto_stand_id,compra_id,parcela_numero,created_by,recorrencia,recorrencia_grupo_id,recorrencia_indice)
           VALUES (?,'pagar',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'nenhuma',NULL,NULL)`,
          [
            payload.descricao, centsToAmount(payload.valorCents), payload.status, input.centroCusto,
            input.fornecedor, input.categoria, payload.formaPagamento, payload.data, payload.dataPagamento,
            input.observacoes, eventoId, clienteId, input.projetoStandId, compraId, payload.parcelaNumero, user.userId,
          ],
        );
        transactions.push({ id: Number(result.insertId), tipo: payload.tipo, numero: payload.parcelaNumero, valor: centsToAmount(payload.valorCents), vencimento: payload.data });
      };

      if (input.valorEntradaCents > 0 && input.dataEntrada) {
        await insertTransaction({
          descricao: `Compra ${codigo} — Entrada — ${input.descricao}`,
          valorCents: input.valorEntradaCents,
          status: input.statusEntrada,
          data: input.dataEntrada,
          dataPagamento: input.statusEntrada === "pago" ? input.dataPagamentoEntrada : null,
          formaPagamento: input.formaPagamentoEntrada,
          parcelaNumero: 0,
          tipo: "entrada",
        });
      }

      if (input.valorFinanciadoCents > 0 && input.primeiroVencimento) {
        const values = equalInstallments(input.valorFinanciadoCents, input.parcelas);
        for (let index = 0; index < input.parcelas; index += 1) {
          await insertTransaction({
            descricao: `Compra ${codigo} — Parcela ${index + 1}/${input.parcelas} — ${input.descricao}`,
            valorCents: values[index],
            status: "pendente",
            data: addMonths(input.primeiroVencimento, index),
            dataPagamento: null,
            formaPagamento: input.formaPagamentoParcelas,
            parcelaNumero: index + 1,
            tipo: "parcela",
          });
        }
      }

      await audit(connection, user, compraId, {
        codigo,
        descricao: input.descricao,
        categoria: input.categoria,
        valorTotal: centsToAmount(input.valorTotalCents),
        entrada: centsToAmount(input.valorEntradaCents),
        saldo: centsToAmount(input.valorFinanciadoCents),
        parcelas: input.parcelas,
        transactionIds: transactions.map((item) => item.id),
      }, req.ip);
      await connection.commit();
      res.status(201).json({ ok: true, compra: { id: compraId, codigo }, lancamentos: transactions });
    } catch (error: any) {
      await connection?.rollback().catch(() => undefined);
      const known = new Set([
        "DESCRICAO_OBRIGATORIA", "CATEGORIA_INVALIDA", "VALOR_INVALIDO", "ENTRADA_MAIOR_QUE_TOTAL", "DATA_ENTRADA_OBRIGATORIA",
        "PARCELAS_OU_VENCIMENTO_INVALIDOS", "PARCELAS_NAO_APLICAVEIS", "STATUS_ENTRADA_INVALIDO", "DATA_PAGAMENTO_ENTRADA_OBRIGATORIA",
        "DATA_INVALIDA", "PROJETO_STAND_INVALIDO", "EVENTO_PROJETO_INCONSISTENTE", "CLIENTE_PROJETO_INCONSISTENTE",
      ]);
      const message = known.has(error?.message) ? error.message : "Não foi possível registrar a compra";
      res.status(known.has(error?.message) ? 400 : 500).json({ error: message });
    } finally {
      connection?.release();
    }
  });

  app.use("/api/crm/compras", router);
}
