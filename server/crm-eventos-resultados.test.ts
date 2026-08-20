import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const apiSource = readFileSync(resolve(root, "server/crm-eventos-resultados.ts"), "utf8");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(resolve(root, "drizzle/0015_perpetual_owl.sql"), "utf8");
const meetingsMigrationSource = readFileSync(resolve(root, "drizzle/0016_giant_swordsman.sql"), "utf8");
const crmSource = readFileSync(resolve(root, "server/crm.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/public/crm/js/crm-eventos-resultados.js"), "utf8");
const navigationSource = readFileSync(resolve(root, "client/public/crm/js/navigation.js"), "utf8");
const indexSource = readFileSync(resolve(root, "client/public/crm/index.html"), "utf8");

describe("Resultado do Evento", () => {
  it("cria uma estrutura complementar sem reescrever dados históricos", () => {
    expect(schemaSource).toContain('mysqlTable("crm_eventos_resultados"');
    expect(migrationSource).toContain("CREATE TABLE `crm_eventos_resultados`");
    expect(migrationSource).not.toMatch(/UPDATE\s+crm_(eventos|transacoes|contas_receber|leads)/i);
    expect(meetingsMigrationSource).toContain("ADD COLUMN `reunioes_realizadas`");
  });

  it("restringe metas e resultado consolidado aos perfis de gestão financeira", () => {
    expect(apiSource).toContain("function requireFinanceManager");
    expect(apiSource).toContain('r.get("/:eventoId", requireFinanceManager');
    expect(apiSource).toContain('r.put("/:eventoId", requireFinanceManager');
    expect(apiSource).toContain("Acesso restrito ao resultado financeiro de eventos");
  });

  it("calcula indicadores pelas fontes existentes sem inventar receitas ou custos", () => {
    expect(apiSource).toContain("FROM crm_leads");
    expect(apiSource).toContain("FROM crm_oportunidades");
    expect(apiSource).toContain("FROM crm_contas_receber");
    expect(apiSource).toContain("FROM crm_transacoes");
    expect(apiSource).toContain("crm_rateio_alocacoes");
    expect(apiSource).toContain("custo_projetos_perdidos");
    expect(apiSource).not.toMatch(/INSERT INTO crm_(transacoes|contas_receber)/i);
    expect(apiSource).not.toMatch(/UPDATE crm_(transacoes|contas_receber|leads)/i);
  });

  it("mantém a edição de metas auditável e exige validação de status e receita", () => {
    expect(apiSource).toContain("RESULT_STATUSES");
    expect(apiSource).toContain("META_RECEITA_INVALIDA");
    expect(apiSource).toContain("CREATE_EVENT_RESULT");
    expect(apiSource).toContain("UPDATE_EVENT_RESULT");
    expect(apiSource).toContain("crm_auditoria");
  });

  it("registra a rota isolada sem afetar o roteamento principal do CRM", () => {
    expect(crmSource).toContain('import { registerEventosResultadosRoutes } from "./crm-eventos-resultados"');
    expect(crmSource).toContain("registerEventosResultadosRoutes(app)");
    expect(apiSource).toContain('app.use("/api/crm/eventos-resultados", r)');
  });

  it("oferece painel responsivo, metas revisáveis e navegação financeira sem criar dados artificiais", () => {
    expect(uiSource).toContain("Resultado do Evento");
    expect(uiSource).toContain("Reuniões realizadas");
    expect(uiSource).toContain("Metas e fechamento");
    expect(uiSource).toContain("O painel não cria nem altera lançamentos financeiros");
    expect(uiSource).toContain("credentials: 'include'");
    expect(navigationSource).toContain("resultados_evento");
    expect(navigationSource).toContain("window.EventosResultadosModule?.load?.()");
    expect(indexSource).toContain("crm-eventos-resultados.js?v=");
  });
});
