import mysql from "mysql2/promise";
import { ENV } from "./_core/env";

export type SiteLeadCaptureInput = {
  source: "site_contato" | "site_orcamento";
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  eventInterest?: string;
  standArea?: string;
  message?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export function normalizeLeadEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeLeadPhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function cleanText(value?: string | null, max = 4000) {
  return String(value || "").trim().slice(0, max);
}

function parseExactArea(value?: string | null) {
  const normalized = cleanText(value, 100)
    .toLowerCase()
    .replace("m²", "")
    .replace("m2", "")
    .trim()
    .replace(",", ".");
  return /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

let pool: mysql.Pool | null = null;
function getPool() {
  if (!pool) pool = mysql.createPool(ENV.databaseUrl);
  return pool;
}

async function resolveCommercialOwner(conn: mysql.PoolConnection) {
  const [settingRows] = await conn.execute<any[]>("SELECT valor FROM crm_settings WHERE chave = 'captacao_site_responsavel_id' LIMIT 1");
  const configuredId = Number(String(settingRows?.[0]?.valor || "").replace(/\D/g, ""));
  if (Number.isFinite(configuredId) && configuredId > 0) {
    const [configuredRows] = await conn.execute<any[]>(
      `SELECT id, name, role FROM crm_users
       WHERE id = ? AND active = 1
         AND LOWER(role) IN ('desenvolvedor','developer','administrador','admin','gerente','gerencia','manager')
       LIMIT 1`,
      [configuredId],
    );
    if (configuredRows?.[0]) return configuredRows[0];
  }

  const [fallbackRows] = await conn.execute<any[]>(
    `SELECT id, name, role FROM crm_users
     WHERE active = 1
       AND LOWER(role) IN ('desenvolvedor','developer','administrador','admin','gerente','gerencia','manager')
     ORDER BY CASE LOWER(role)
       WHEN 'desenvolvedor' THEN 1 WHEN 'developer' THEN 1
       WHEN 'administrador' THEN 2 WHEN 'admin' THEN 2
       ELSE 3 END, id ASC
     LIMIT 1`,
  );
  return fallbackRows?.[0] || null;
}

function buildSummary(input: SiteLeadCaptureInput) {
  const rows = [
    `Origem: ${input.source === "site_orcamento" ? "Solicitação de orçamento no site" : "Formulário de contato no site"}`,
    input.company ? `Empresa: ${input.company}` : "",
    input.email ? `E-mail: ${input.email}` : "",
    input.phone ? `WhatsApp: ${input.phone}` : "",
    input.eventInterest ? `Evento/Interesse: ${input.eventInterest}` : "",
    input.standArea ? `Metragem: ${input.standArea}` : "",
    input.message ? `Mensagem: ${input.message}` : "",
  ].filter(Boolean);
  return rows.join("\n").slice(0, 6500);
}

/**
 * Cria ou atualiza um lead do CRM e cria apenas uma tarefa aberta de captação por lead.
 * A chamada deve ser isolada do envio público: uma falha aqui nunca invalida o formulário do visitante.
 */
export async function captureLeadFromSite(input: SiteLeadCaptureInput) {
  const name = cleanText(input.name, 255);
  const email = normalizeLeadEmail(input.email);
  const phone = normalizeLeadPhone(input.phone);
  if (!name || (!email && !phone)) throw new Error("Captação sem identificação suficiente");

  const company = cleanText(input.company, 255);
  const eventInterest = cleanText(input.eventInterest, 255);
  const standArea = cleanText(input.standArea, 100);
  const standAreaNumeric = parseExactArea(standArea);
  const message = cleanText(input.message, 4000);
  const utmSource = cleanText(input.utmSource, 100);
  const utmMedium = cleanText(input.utmMedium, 100);
  const utmCampaign = cleanText(input.utmCampaign, 100);
  const conn = await getPool().getConnection();

  try {
    await conn.beginTransaction();
    const owner = await resolveCommercialOwner(conn);
    const duplicateConditions: string[] = [];
    const duplicateParams: any[] = [];
    if (email) {
      duplicateConditions.push("LOWER(TRIM(email)) = ?");
      duplicateParams.push(email);
    }
    if (phone) {
      const normalizePhoneSql = (field: string) => `REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${field}, ''), '(', ''), ')', ''), '-', ''), ' ', '')`;
      duplicateConditions.push(`(${normalizePhoneSql("whatsapp")} = ? OR ${normalizePhoneSql("telefone")} = ?)`);
      duplicateParams.push(phone, phone);
    }

    const [existingRows] = await conn.execute<any[]>(
      `SELECT id, responsavel_id FROM crm_leads WHERE ${duplicateConditions.join(" OR ")} ORDER BY id DESC LIMIT 1`,
      duplicateParams,
    );
    const existing = existingRows?.[0] || null;
    let leadId: number;
    let duplicated = false;

    if (existing) {
      duplicated = true;
      leadId = Number(existing.id);
      await conn.execute(
        `UPDATE crm_leads
         SET last_activity_at = NOW(),
             responsavel_id = COALESCE(responsavel_id, ?),
             origem = CASE WHEN origem IS NULL OR TRIM(origem) = '' THEN ? ELSE origem END
         WHERE id = ?`,
        [owner?.id || null, input.source, leadId],
      );
      await conn.execute(
        "INSERT INTO crm_lead_interactions (lead_id, user_id, tipo, descricao) VALUES (?, NULL, 'captacao_site', ?)",
        [leadId, `Novo envio recebido pelo site.\n${buildSummary({ ...input, company, email, phone, eventInterest, standArea, message })}`],
      );
    } else {
      const [leadResult] = await conn.execute<any>(
        `INSERT INTO crm_leads
         (nome, email, telefone, whatsapp, status, origem, evento_interesse, metragem_estimada, responsavel_id, temperatura, observacoes, utm_source, utm_medium, utm_campaign, last_activity_at)
         VALUES (?,?,?,?, 'novo', ?, ?, ?, ?, 'frio', ?, ?, ?, ?, NOW())`,
        [name, email || null, phone || null, phone || null, input.source, eventInterest || null, standAreaNumeric, owner?.id || null, buildSummary({ ...input, company, email, phone, eventInterest, standArea, message }), utmSource || null, utmMedium || null, utmCampaign || null],
      );
      leadId = Number(leadResult.insertId);
    }

    const [openTaskRows] = await conn.execute<any[]>(
      `SELECT id FROM crm_tarefas
       WHERE modulo = 'captacao_site' AND referencia_id = ?
         AND status NOT IN ('concluida', 'cancelada')
       ORDER BY id DESC LIMIT 1`,
      [leadId],
    );
    let taskId = Number(openTaskRows?.[0]?.id || 0) || null;
    if (!taskId) {
      const sourceLabel = input.source === "site_orcamento" ? "Orçamento do site" : "Contato do site";
      const [taskResult] = await conn.execute<any>(
        `INSERT INTO crm_tarefas
         (titulo, descricao, responsavel_id, status, prioridade, data_vencimento, modulo, referencia_id, created_by)
         VALUES (?, ?, ?, 'pendente', ?, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'captacao_site', ?, ?)`,
        [`${sourceLabel} — ${name}`.slice(0, 255), buildSummary({ ...input, company, email, phone, eventInterest, standArea, message }), owner?.id || null, input.source === "site_orcamento" ? "alta" : "media", leadId, owner?.id || null],
      );
      taskId = Number(taskResult.insertId);
    }

    await conn.execute(
      "INSERT INTO crm_auditoria (user_id, action, table_name, record_id, details, ip) VALUES (NULL, 'captacao_site', 'crm_leads', ?, ?, NULL)",
      [leadId, JSON.stringify({ source: input.source, duplicated, taskId, ownerId: owner?.id || null })],
    );
    await conn.commit();
    return { leadId, taskId, duplicated, ownerId: owner?.id || null };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
