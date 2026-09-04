import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const apiSource = readFileSync(resolve(root, "server/crm-projetos-stand.ts"), "utf8");
const adminSource = readFileSync(resolve(root, "server/crm-admin.ts"), "utf8");
const crmSource = readFileSync(resolve(root, "server/crm.ts"), "utf8");
const formsSource = readFileSync(resolve(root, "client/public/crm/js/forms.js"), "utf8");
const receitasSource = readFileSync(resolve(root, "client/public/crm/js/crm-contas-receber.js"), "utf8");
const navigationSource = readFileSync(resolve(root, "client/public/crm/js/navigation.js"), "utf8");
const migrationSource = readFileSync(resolve(root, "drizzle/migrations/0004_crm_projetos_stand.sql"), "utf8");
const opportunityMigrationSource = readFileSync(resolve(root, "drizzle/0005_cooing_peter_quill.sql"), "utf8");
const projectUiSource = readFileSync(resolve(root, "client/public/crm/js/crm-projetos-stand.js"), "utf8");
const resultsUiSource = readFileSync(resolve(root, "client/public/crm/js/crm-resultados-stand.js"), "utf8");

describe("Projetos de Stand — apuração por evento e cliente", () => {
  it("cria uma estrutura opcional, sem alteração de dados históricos", () => {
    expect(migrationSource).toContain("CREATE TABLE IF NOT EXISTS crm_projetos_stand");
    expect(migrationSource).toContain("ADD COLUMN IF NOT EXISTS projeto_stand_id INT NULL");
    expect(migrationSource).toContain("ADD COLUMN IF NOT EXISTS evento_id INT NULL");
    expect(migrationSource).not.toMatch(/UPDATE\s+crm_(transacoes|contas_receber)/i);
  });

  it("protege criação, edição e exclusão para perfis financeiros e preserva a consulta autenticada", () => {
    expect(apiSource).toContain("function requireFinanceManager");
    expect(apiSource).toContain('r.get("/", requireCrmAuth');
    expect(apiSource).toContain('r.post("/", requireFinanceManager');
    expect(apiSource).toContain('r.put("/:id", requireFinanceManager');
    expect(apiSource).toContain('r.delete("/:id", requireFinanceManager');
    expect(apiSource).toContain("possui lançamentos ou rateios vinculados e não pode ser excluído");
  });

  it("impede incoerência entre um Projeto de Stand e uma despesa vinculada", () => {
    expect(adminSource).toContain("O evento informado não corresponde ao Projeto de Stand");
    expect(adminSource).toContain("O cliente informado não corresponde ao Projeto de Stand");
    expect(adminSource).toContain("projeto_stand_id");
  });

  it("vincula novas receitas ao projeto e valida o mesmo evento e cliente", () => {
    expect(crmSource).toContain("finalProjetoStandId");
    expect(crmSource).toContain("INSERT INTO crm_contas_receber");
    expect(crmSource).toContain("projeto_stand_id");
    expect(crmSource).toContain("Projeto de Stand selecionado não existe");
  });

  it("expõe os seletores nos formulários e a página de Resultado por Stand", () => {
    expect(formsSource).toContain('name="projetoStandId"');
    expect(formsSource).toContain('name="eventoId"');
    expect(receitasSource).toContain('name="projetoStandId"');
    expect(receitasSource).toContain('name="eventoId"');
    expect(navigationSource).toContain("resultados_stand");
    expect(navigationSource).toContain("window.ResultadosStandModule?.load?.()");
    expect(resultsUiSource).toContain("Resultado por Stand");
  });

  it("permite custos para lead potencial sem exigir cliente convertido", () => {
    expect(opportunityMigrationSource).toContain("MODIFY COLUMN `cliente_id` int");
    expect(opportunityMigrationSource).toContain("ADD `lead_id` int");
    expect(opportunityMigrationSource).toContain("ADD `oportunidade_id` int");
    expect(opportunityMigrationSource).not.toMatch(/UPDATE\s+crm_projetos_stand/i);
    expect(apiSource).toContain("Evento, cliente ou lead potencial");
    expect(apiSource).toContain("situacao_comercial");
    expect(apiSource).toContain("LEFT JOIN crm_leads");
  });

  it("mostra e filtra o custo comercial de oportunidades perdidas sem ocultar o projeto", () => {
    expect(projectUiSource).toContain('name="leadId"');
    expect(projectUiSource).toContain('name="oportunidadeId"');
    expect(projectUiSource).toContain('name="situacaoComercial"');
    expect(projectUiSource).toContain("projeto-stand-lead-filter");
    expect(projectUiSource).toContain("projeto-stand-situacao-filter");
    expect(projectUiSource).toContain("Projetos perdidos permanecem visíveis");
  });
});
