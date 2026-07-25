/**
 * crm-assistente.ts — Veruska, assistente virtual do CRM da SAMS Locações
 * Endpoint: POST /api/crm/assistente/perguntar
 * - Tool use (function calling) com Anthropic Claude
 * - Permissões por role (mesma lógica da UI)
 * - Limite diário configurável por usuário
 * - Auditoria em crm_auditoria
 */

import { Router, Request, Response } from "express";
import mysql from "mysql2/promise";
import * as ENV from "./_core/env";

// ─── DB helper (mesmo padrão do crm.ts) ──────────────────────────────────────
let _pool: mysql.Pool | null = null;
function getPool() {
  if (!_pool) _pool = mysql.createPool((ENV as any).databaseUrl ?? process.env.DATABASE_URL!);
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

// ─── Auditoria ────────────────────────────────────────────────────────────────
async function audit(userId: number | null, action: string, table: string, recordId: number | null, details?: any, ip?: string) {
  try {
    await db(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (?,?,?,?,?,?)",
      [userId, action, table, recordId, details ? JSON.stringify(details) : null, ip ?? null]
    );
  } catch { /* não bloquear por falha de auditoria */ }
}

// ─── Limite diário por usuário ────────────────────────────────────────────────
const DAILY_LIMIT = parseInt(process.env.VERUSKA_DAILY_LIMIT ?? "50", 10);
const _dailyBuckets = new Map<string, { count: number; resetAt: number }>();

function checkDailyLimit(userId: number): { ok: boolean; remaining: number; resetAt: number } {
  const key = `veruska:${userId}`;
  const now = Date.now();
  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(24, 0, 0, 0);
  const resetAt = startOfTomorrow.getTime();

  const cur = _dailyBuckets.get(key);
  if (!cur || now >= cur.resetAt) {
    _dailyBuckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: DAILY_LIMIT - 1, resetAt };
  }
  if (cur.count >= DAILY_LIMIT) return { ok: false, remaining: 0, resetAt: cur.resetAt };
  cur.count += 1;
  _dailyBuckets.set(key, cur);
  return { ok: true, remaining: DAILY_LIMIT - cur.count, resetAt: cur.resetAt };
}

// ─── Permissões por role ──────────────────────────────────────────────────────
const ADMIN_ROLES = ["admin", "manager", "administrador", "gerente", "gerencia"];
function isAdmin(role: string) { return ADMIN_ROLES.includes(role?.toLowerCase()); }
function canAccessFinanceiro(role: string) {
  return ["admin", "manager", "administrador", "gerente", "gerencia", "financeiro"].includes(role?.toLowerCase());
}

// ─── Ferramentas (tool use) ───────────────────────────────────────────────────
const TOOLS = [
  {
    name: "consultar_pendencias_financeiras",
    description: "Consulta contas a receber e contas a pagar em aberto (não pagas). Retorna lista com descrição, valor, vencimento e status.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["receber", "pagar", "ambos"], description: "Tipo de pendência" },
        limite: { type: "number", description: "Máximo de registros (padrão 20)" },
      },
      required: [],
    },
  },
  {
    name: "consultar_eventos",
    description: "Consulta eventos cadastrados no sistema, com filtros opcionais por status ou período.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filtrar por status (ex: ativo, concluido, cancelado)" },
        data_inicio: { type: "string", description: "Data de início no formato YYYY-MM-DD" },
        data_fim: { type: "string", description: "Data de fim no formato YYYY-MM-DD" },
        limite: { type: "number", description: "Máximo de registros (padrão 10)" },
      },
      required: [],
    },
  },
  {
    name: "consultar_cliente",
    description: "Busca clientes pelo nome ou CNPJ/CPF.",
    input_schema: {
      type: "object",
      properties: {
        busca: { type: "string", description: "Nome, CNPJ ou CPF do cliente" },
      },
      required: ["busca"],
    },
  },
  {
    name: "consultar_resumo_financeiro",
    description: "Retorna resumo financeiro (receitas, despesas, lucro) de um período.",
    input_schema: {
      type: "object",
      properties: {
        data_inicio: { type: "string", description: "Data de início no formato YYYY-MM-DD" },
        data_fim: { type: "string", description: "Data de fim no formato YYYY-MM-DD" },
      },
      required: [],
    },
  },
  {
    name: "consultar_kanban",
    description: "Consulta tarefas administrativas do Kanban, com filtros opcionais por status ou prioridade.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filtrar por status (ex: pendente, em_andamento, concluido)" },
        prioridade: { type: "string", description: "Filtrar por prioridade (ex: critica, alta, media, baixa)" },
        limite: { type: "number", description: "Máximo de registros (padrão 10)" },
      },
      required: [],
    },
  },
];

// ─── Implementação das ferramentas ────────────────────────────────────────────
async function executeTool(name: string, input: any, role: string): Promise<string> {
  try {
    if (name === "consultar_pendencias_financeiras") {
      if (!canAccessFinanceiro(role)) return JSON.stringify({ erro: "Sem permissão para acessar dados financeiros." });
      const tipo = input.tipo ?? "ambos";
      const limite = Math.min(parseInt(input.limite ?? "20", 10), 50);
      const result: any = {};
      if (tipo === "receber" || tipo === "ambos") {
        const rows = await db(
          `SELECT id, descricao, valor, data_vencimento, status, cliente_nome
           FROM crm_contas_receber
           WHERE status NOT IN ('Pago','Baixado','Cancelado')
           ORDER BY data_vencimento ASC LIMIT ?`,
          [limite]
        );
        result.contas_receber = rows;
      }
      if (tipo === "pagar" || tipo === "ambos") {
        const rows = await db(
          `SELECT id, descricao, valor, data_vencimento, status, categoria
           FROM crm_transacoes
           WHERE tipo = 'despesa' AND status NOT IN ('Pago','Baixado','Cancelado')
           ORDER BY data_vencimento ASC LIMIT ?`,
          [limite]
        );
        result.contas_pagar = rows;
      }
      return JSON.stringify(result);
    }

    if (name === "consultar_eventos") {
      const limite = Math.min(parseInt(input.limite ?? "10", 10), 30);
      let sql = "SELECT id, nome, local, data_inicio, data_fim, status FROM crm_eventos WHERE 1=1";
      const params: any[] = [];
      if (input.status) { sql += " AND status = ?"; params.push(input.status); }
      if (input.data_inicio) { sql += " AND data_inicio >= ?"; params.push(input.data_inicio); }
      if (input.data_fim) { sql += " AND data_fim <= ?"; params.push(input.data_fim); }
      sql += " ORDER BY data_inicio DESC LIMIT ?";
      params.push(limite);
      const rows = await db(sql, params);
      return JSON.stringify({ eventos: rows, total: rows.length });
    }

    if (name === "consultar_cliente") {
      const busca = `%${input.busca}%`;
      const rows = await db(
        `SELECT id, nome, documento, email, telefone, cidade, estado, segmento
         FROM crm_clientes
         WHERE nome LIKE ? OR documento LIKE ?
         LIMIT 10`,
        [busca, busca]
      );
      return JSON.stringify({ clientes: rows, total: rows.length });
    }

    if (name === "consultar_resumo_financeiro") {
      if (!canAccessFinanceiro(role)) return JSON.stringify({ erro: "Sem permissão para acessar dados financeiros." });
      const hoje = new Date().toISOString().split("T")[0];
      const inicio = input.data_inicio ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const fim = input.data_fim ?? hoje;
      const [receitas] = await db<{ total: number }>(
        `SELECT COALESCE(SUM(valor),0) as total FROM crm_contas_receber
         WHERE status IN ('Pago','Baixado') AND data_vencimento BETWEEN ? AND ?`,
        [inicio, fim]
      );
      const [despesas] = await db<{ total: number }>(
        `SELECT COALESCE(SUM(valor),0) as total FROM crm_transacoes
         WHERE tipo = 'despesa' AND status IN ('Pago','Baixado') AND data_vencimento BETWEEN ? AND ?`,
        [inicio, fim]
      );
      const rec = Number(receitas?.total ?? 0);
      const desp = Number(despesas?.total ?? 0);
      return JSON.stringify({
        periodo: { inicio, fim },
        receitas: rec,
        despesas: desp,
        lucro: rec - desp,
        margem_pct: rec > 0 ? (((rec - desp) / rec) * 100).toFixed(1) + "%" : "N/A",
      });
    }

    if (name === "consultar_kanban") {
      const limite = Math.min(parseInt(input.limite ?? "10", 10), 30);
      let sql = "SELECT id, titulo, descricao, status, prioridade, responsavel, data_prazo FROM crm_kanban WHERE 1=1";
      const params: any[] = [];
      if (input.status) { sql += " AND status = ?"; params.push(input.status); }
      if (input.prioridade) { sql += " AND prioridade = ?"; params.push(input.prioridade); }
      sql += " ORDER BY FIELD(prioridade,'critica','alta','media','baixa'), data_prazo ASC LIMIT ?";
      params.push(limite);
      const rows = await db(sql, params);
      return JSON.stringify({ tarefas: rows, total: rows.length });
    }

    return JSON.stringify({ erro: `Ferramenta desconhecida: ${name}` });
  } catch (e: any) {
    return JSON.stringify({ erro: `Erro ao executar ferramenta: ${e.message}` });
  }
}

// ─── Chamada à API da Anthropic com tool use ──────────────────────────────────
async function callAnthropic(messages: any[], role: string): Promise<{ text: string; toolsUsed: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ASSISTENTE_NAO_CONFIGURADA");

  const systemPrompt = `Você é Veruska, assistente virtual do CRM da SAMS Locações — empresa especializada em montagem de stands para feiras e eventos corporativos com mais de 15 anos de experiência.

Seu papel:
- Responder perguntas sobre dados do sistema usando as ferramentas disponíveis
- Tom direto, cordial, sem enrolação
- Todo número ou dado citado deve indicar de qual consulta veio (ex: "segundo as Contas a Receber...")
- NUNCA inventar dados que não vieram de uma ferramenta — se não souber, dizer claramente
- NUNCA burlar nem sugerir burlar permissões do sistema
- RECUSAR educadamente qualquer pedido de ação de escrita (criar, editar, apagar registros), orientando onde fazer manualmente na interface

Se o usuário pedir para criar/editar/apagar algo, responda: "Posso apenas consultar informações. Para [ação], acesse [módulo correspondente] no menu lateral."

Responda sempre em português brasileiro.`;

  const anthropicMessages = [...messages];
  const toolsUsed: string[] = [];

  // Agentic loop com tool use
  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json() as any;

    if (data.stop_reason === "end_turn") {
      const textBlock = data.content?.find((b: any) => b.type === "text");
      return { text: textBlock?.text ?? "Não consegui gerar uma resposta.", toolsUsed };
    }

    if (data.stop_reason === "tool_use") {
      // Adicionar resposta do assistente ao histórico
      anthropicMessages.push({ role: "assistant", content: data.content });

      // Executar cada ferramenta solicitada
      const toolResults: any[] = [];
      for (const block of data.content) {
        if (block.type === "tool_use") {
          toolsUsed.push(block.name);
          const result = await executeTool(block.name, block.input, role);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Adicionar resultados das ferramentas ao histórico
      anthropicMessages.push({ role: "user", content: toolResults });
      continue;
    }

    // stop_reason inesperado
    const textBlock = data.content?.find((b: any) => b.type === "text");
    return { text: textBlock?.text ?? "Resposta incompleta.", toolsUsed };
  }

  return { text: "Não consegui completar a consulta após múltiplas tentativas.", toolsUsed };
}

// ─── Router ───────────────────────────────────────────────────────────────────
export function registerAssistenteRoutes(app: any) {
  const r = Router();

  // POST /api/crm/assistente/perguntar
  r.post("/assistente/perguntar", async (req: Request, res: Response) => {
    const user = (req as any).crmUser;
    if (!user) return res.status(401).json({ error: "Não autenticado" });

    const { pergunta, historico } = req.body as { pergunta: string; historico?: { role: string; content: string }[] };
    if (!pergunta?.trim()) return res.status(400).json({ error: "Pergunta não pode ser vazia" });

    // Verificar limite diário
    const limit = checkDailyLimit(user.userId);
    if (!limit.ok) {
      const resetDate = new Date(limit.resetAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return res.status(429).json({
        error: `Você atingiu o limite de ${DAILY_LIMIT} perguntas por dia. O limite será renovado às ${resetDate}.`,
        code: "DAILY_LIMIT_EXCEEDED",
        resetAt: limit.resetAt,
      });
    }

    // Verificar se a API está configurada
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: "A assistente Veruska não está configurada. Entre em contato com o administrador do sistema.",
        code: "ASSISTENTE_NAO_CONFIGURADA",
      });
    }

    try {
      // Montar histórico de mensagens
      const messages: any[] = [];
      if (historico?.length) {
        for (const msg of historico.slice(-8)) { // máximo 8 mensagens anteriores
          if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      messages.push({ role: "user", content: pergunta });

      const { text, toolsUsed } = await callAnthropic(messages, user.role);

      // Auditoria
      await audit(
        user.userId,
        "veruska_pergunta",
        "assistente",
        null,
        { pergunta: pergunta.substring(0, 500), tools_used: toolsUsed, remaining: limit.remaining },
        req.ip
      );

      return res.json({
        resposta: text,
        toolsUsed,
        remaining: limit.remaining,
      });
    } catch (e: any) {
      if (e.message === "ASSISTENTE_NAO_CONFIGURADA") {
        return res.status(503).json({ error: "A assistente Veruska não está configurada.", code: "ASSISTENTE_NAO_CONFIGURADA" });
      }
      console.error("[Veruska] Erro:", e.message);
      await audit(user.userId, "veruska_erro", "assistente", null, { erro: e.message, pergunta: pergunta?.substring(0, 200) }, req.ip);
      return res.status(500).json({ error: "Erro interno ao processar sua pergunta. Tente novamente." });
    }
  });

  app.use("/api/crm", (req: Request, res: Response, next: any) => {
    // Reutilizar requireCrmAuth do crm.ts via middleware inline
    const token = (() => {
      const header = req.headers.cookie;
      if (header) {
        const match = header.match(/crm_session=([^;]+)/);
        if (match) return match[1];
      }
      const auth = req.headers["authorization"] || req.headers["x-crm-token"];
      if (auth) {
        const parts = String(auth).split(" ");
        return parts.length === 2 ? parts[1] : parts[0];
      }
      return null;
    })();

    if (!token) return res.status(401).json({ error: "Não autenticado" });

    // Buscar sessão diretamente
    db<{ user_id: number; role: string; name: string; expires_at: number }>(
      "SELECT user_id, role, name, expires_at FROM crm_sessions WHERE token = ? AND expires_at > ?",
      [token, Date.now()]
    ).then(rows => {
      if (!rows[0]) return res.status(401).json({ error: "Sessão expirada" });
      (req as any).crmUser = { userId: rows[0].user_id, role: rows[0].role, name: rows[0].name };
      next();
    }).catch(() => res.status(500).json({ error: "Erro interno" }));
  }, r);
}
