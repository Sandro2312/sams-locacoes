/**
 * crm-assistente.ts — Veruska, assistente virtual do CRM da SAMS Locações
 * Endpoint: POST /api/crm/assistente/perguntar
 *
 * CORREÇÕES v2:
 * - P1: Middleware usa getSessionFromCrm (padrão crm-acervo.ts) — não bloqueia /login
 * - P2: Queries SQL corrigidas (vencimento, tipo pagar, crm_tarefas em vez de crm_kanban)
 * - P3: Permissões adicionadas em consultar_eventos, consultar_cliente e consultar_kanban
 */
import { Router, Request, Response } from "express";
import mysql from "mysql2/promise";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { invokeLLM, Tool } from "./_core/llm";
import { getSessionFromCrm } from "./crm";

class VeruskaServiceError extends Error {
  constructor(public code: string, public userMessage: string) {
    super(code);
  }
}

// ─── DB helper ────────────────────────────────────────────────────────────────
let _pool: mysql.Pool | null = null;
function getPool() {
  if (!_pool) _pool = mysql.createPool(ENV.databaseUrl);
  return _pool;
}
async function db<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

// ─── Auth middleware — padrão crm-acervo.ts (não interfere com /login) ────────
function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  return parseCookieHeader(header)[name];
}

function requireCrmAuth(req: Request, res: Response, next: Function) {
  let token = getCookie(req, "crm_session");
  if (!token) {
    const authHeader = req.headers["authorization"] || req.headers["x-crm-token"];
    if (authHeader) {
      const parts = String(authHeader).split(" ");
      token = parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : parts[0];
    }
  }
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  getSessionFromCrm(token).then(session => {
    if (!session) return res.status(401).json({ error: "Sessão expirada" });
    (req as any).crmUser = session;
    next();
  }).catch(() => res.status(500).json({ error: "Erro interno" }));
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

// ─── Permissões (mesma lógica do crm.ts) ─────────────────────────────────────
const ADMIN_ROLES = ["admin", "manager", "administrador", "gerente", "gerencia", "desenvolvedor", "developer"];
function isAdmin(role: string) { return ADMIN_ROLES.includes(role?.toLowerCase()); }
function canAccessFinanceiro(role: string) {
  return ["admin", "manager", "administrador", "gerente", "gerencia", "desenvolvedor", "developer", "financeiro"].includes(role?.toLowerCase());
}
// Eventos, Clientes, Tarefas: qualquer usuário autenticado (mesma lógica dos GETs no crm.ts)
function canAccessEventos(_role: string) { return true; }
function canAccessClientes(_role: string) { return true; }
function canAccessTarefas(_role: string) { return true; }

// ─── Ferramentas (tool use) ───────────────────────────────────────────────────
const TOOLS = [
  {
    name: "consultar_pendencias_financeiras",
    description: "Consulta contas a receber e contas a pagar em aberto. Retorna lista com descrição, valor, vencimento e status.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", description: "Filtrar por tipo: 'receber', 'pagar' ou 'ambos' (padrão: 'ambos')" },
        limite: { type: "number", description: "Máximo de registros por tipo (padrão 20, máximo 50)" },
      },
      required: [],
    },
  },
  {
    name: "consultar_eventos",
    description: "Consulta eventos/feiras cadastrados no sistema, com filtros opcionais por status ou período.",
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
    description: "Consulta tarefas administrativas do Kanban/Tarefas, com filtros opcionais por status ou prioridade.",
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

const PROJECT_TOOLS: Tool[] = TOOLS.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema,
  },
}));

// ─── Implementação das ferramentas ────────────────────────────────────────────
async function executeTool(name: string, input: any, role: string): Promise<string> {
  try {
    if (name === "consultar_pendencias_financeiras") {
      if (!canAccessFinanceiro(role)) return JSON.stringify({ erro: "Sem permissão para acessar dados financeiros." });
      const tipo = input.tipo ?? "ambos";
      const limite = Math.min(parseInt(input.limite ?? "20", 10), 50);
      const result: any = {};
      if (tipo === "receber" || tipo === "ambos") {
        // P2: coluna 'vencimento' (não data_vencimento); JOIN para cliente_nome
        const rows = await db(
          `SELECT cr.id, cr.descricao, cr.valor, cr.vencimento, cr.status,
                  COALESCE(c.nome, '') as cliente_nome
           FROM crm_contas_receber cr
           LEFT JOIN crm_clientes c ON cr.cliente_id = c.id
           WHERE cr.status NOT IN ('pago','Pago','baixado','Baixado','cancelado','Cancelado')
           ORDER BY cr.vencimento ASC LIMIT ${limite}`
        );
        result.contas_receber = rows;
      }
      if (tipo === "pagar" || tipo === "ambos") {
        // P2: tipo='pagar' (não 'despesa'); coluna 'data' (não data_vencimento)
        const rows = await db(
          `SELECT id, descricao, valor, data as vencimento, status, centro_custo
           FROM crm_transacoes
           WHERE (tipo = 'pagar' OR tipo LIKE '%despesa%' OR tipo LIKE '%pagar%')
             AND status NOT IN ('pago','Pago','baixado','Baixado','cancelado','Cancelado')
           ORDER BY data ASC LIMIT ${limite}`
        );
        result.contas_pagar = rows;
      }
      return JSON.stringify(result);
    }

    if (name === "consultar_eventos") {
      // P3: permissão adicionada
      if (!canAccessEventos(role)) return JSON.stringify({ erro: "Sem permissão para acessar eventos." });
      const limite = Math.min(parseInt(input.limite ?? "10", 10), 30);
      let sql = "SELECT id, nome, local, data_inicio, data_fim, status FROM crm_eventos WHERE 1=1";
      const params: any[] = [];
      if (input.status) { sql += " AND status = ?"; params.push(input.status); }
      if (input.data_inicio) { sql += " AND data_inicio >= ?"; params.push(input.data_inicio); }
      if (input.data_fim) { sql += " AND data_fim <= ?"; params.push(input.data_fim); }
      sql += ` ORDER BY data_inicio DESC LIMIT ${limite}`;
      const rows = await db(sql, params);
      return JSON.stringify({ eventos: rows, total: rows.length });
    }

    if (name === "consultar_cliente") {
      // P3: permissão adicionada
      if (!canAccessClientes(role)) return JSON.stringify({ erro: "Sem permissão para acessar clientes." });
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
      // P2: coluna 'vencimento' em crm_contas_receber
      const [receitas] = await db<{ total: number }>(
        `SELECT COALESCE(SUM(valor),0) as total FROM crm_contas_receber
         WHERE status IN ('pago','Pago','baixado','Baixado') AND vencimento BETWEEN ? AND ?`,
        [inicio, fim]
      );
      // P2: tipo='pagar'/'despesa' e coluna 'data' em crm_transacoes
      const [despesas] = await db<{ total: number }>(
        `SELECT COALESCE(SUM(valor),0) as total FROM crm_transacoes
         WHERE (tipo = 'pagar' OR tipo LIKE '%despesa%')
           AND status IN ('pago','Pago','baixado','Baixado')
           AND data BETWEEN ? AND ?`,
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
      // P3: permissão adicionada
      if (!canAccessTarefas(role)) return JSON.stringify({ erro: "Sem permissão para acessar tarefas." });
      const limite = Math.min(parseInt(input.limite ?? "10", 10), 30);
      // P2: usar crm_tarefas (não crm_kanban que não existe)
      // Colunas: id, titulo, descricao, status, prioridade, responsavel_id, data_vencimento, created_by
      let sql = `SELECT t.id, t.titulo, t.descricao, t.status, t.prioridade,
                        t.data_vencimento, u.name as responsavel_nome
                 FROM crm_tarefas t
                 LEFT JOIN crm_users u ON t.responsavel_id = u.id
                 WHERE 1=1`;
      const params: any[] = [];
      if (input.status) { sql += " AND t.status = ?"; params.push(input.status); }
      if (input.prioridade) { sql += " AND t.prioridade = ?"; params.push(input.prioridade); }
      sql += ` ORDER BY FIELD(t.prioridade,'critica','alta','media','baixa'), t.data_vencimento ASC LIMIT ${limite}`;
      const rows = await db(sql, params);
      return JSON.stringify({ tarefas: rows, total: rows.length });
    }

    return JSON.stringify({ erro: `Ferramenta desconhecida: ${name}` });
  } catch (e: any) {
    return JSON.stringify({ erro: `Erro ao executar ferramenta: ${e.message}` });
  }
}

// ─── Chamada à IA gerenciada do projeto com tool use ──────────────────────────
async function callProjectAssistant(messages: any[], role: string): Promise<{ text: string; toolsUsed: string[] }> {
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
  const conversation: any[] = [{ role: "system", content: systemPrompt }, ...messages];
  const toolsUsed: string[] = [];
  for (let iteration = 0; iteration < 5; iteration++) {
    try {
      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: conversation,
        tools: PROJECT_TOOLS,
        toolChoice: "auto",
        maxTokens: 1400,
      });
      const message = response.choices?.[0]?.message;
      const text = typeof message?.content === "string" ? message.content : "";
      const toolCalls = message?.tool_calls || [];
      if (toolCalls.length === 0) {
        return { text: text || "Não consegui gerar uma resposta para esta consulta.", toolsUsed };
      }

      conversation.push({ role: "assistant", content: text, tool_calls: toolCalls });
      for (const toolCall of toolCalls) {
        toolsUsed.push(toolCall.function.name);
        let input: any = {};
        try { input = JSON.parse(toolCall.function.arguments || "{}"); } catch {}
        const result = await executeTool(toolCall.function.name, input, role);
        conversation.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }
    } catch (error: any) {
      console.error("[Veruska] Falha na IA gerenciada:", error?.message);
      throw new VeruskaServiceError("VERUSKA_IA_INDISPONIVEL", "A Veruska não conseguiu concluir a consulta agora. Tente novamente em alguns instantes.");
    }
  }
  return { text: "Não consegui completar a consulta após múltiplas tentativas.", toolsUsed };
}

// ─── Router — padrão crm-acervo.ts (sub-rota, não app.use de nível global) ────
export function registerAssistenteRoutes(app: any) {
  const r = Router();

  // POST /api/crm/assistente/perguntar — requireCrmAuth aplicado na rota, não globalmente
  r.post("/perguntar", requireCrmAuth, async (req: Request, res: Response) => {
    const user = (req as any).crmUser;
    const { pergunta, historico } = req.body as { pergunta: string; historico?: { role: string; content: string }[] };
    if (!pergunta?.trim()) return res.status(400).json({ error: "Pergunta não pode ser vazia" });
    const limit = checkDailyLimit(user.userId);
    if (!limit.ok) {
      const resetDate = new Date(limit.resetAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return res.status(429).json({
        error: `Você atingiu o limite de ${DAILY_LIMIT} perguntas por dia. O limite será renovado às ${resetDate}.`,
        code: "DAILY_LIMIT_EXCEEDED",
        resetAt: limit.resetAt,
      });
    }
    try {
      const messages: any[] = [];
      if (historico?.length) {
        for (const msg of historico.slice(-8)) {
          if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      messages.push({ role: "user", content: pergunta });
      const { text, toolsUsed } = await callProjectAssistant(messages, user.role);
      await audit(
        user.userId, "veruska_pergunta", "assistente", null,
        { pergunta: pergunta.substring(0, 500), tools_used: toolsUsed, remaining: limit.remaining },
        req.ip
      );
      return res.json({ resposta: text, toolsUsed, remaining: limit.remaining });
    } catch (e: any) {
      console.error("[Veruska] Erro:", e.message);
      await audit(user.userId, "veruska_erro", "assistente", null, { erro: e.message, pergunta: pergunta?.substring(0, 200) }, req.ip);
      if (e instanceof VeruskaServiceError) {
        return res.status(503).json({ error: e.userMessage, code: e.code });
      }
      return res.status(500).json({ error: "Não foi possível processar a consulta agora. Tente novamente em alguns instantes.", code: "VERUSKA_ERRO_INTERNO" });
    }
  });

  // Montar como sub-rota de /api/crm/assistente (padrão crm-acervo.ts — não interfere com /login)
  app.use("/api/crm/assistente", r);
}
