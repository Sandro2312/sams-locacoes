import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(resolve(root, "drizzle/0017_tiny_rawhide_kid.sql"), "utf8");
const apiSource = readFileSync(resolve(root, "server/crm-projetos-stand-fechamento.ts"), "utf8");
const crmSource = readFileSync(resolve(root, "server/crm.ts"), "utf8");
const projectUiSource = readFileSync(resolve(root, "client/public/crm/js/crm-projetos-stand.js"), "utf8");
const guideUiSource = readFileSync(resolve(root, "client/public/crm/js/crm-projetos-stand-fechamento.js"), "utf8");
const formsSource = readFileSync(resolve(root, "client/public/crm/js/forms.js"), "utf8");
const receivableSource = readFileSync(resolve(root, "client/public/crm/js/crm-contas-receber.js"), "utf8");
const navigationSource = readFileSync(resolve(root, "client/public/crm/js/navigation.js"), "utf8");
const indexSource = readFileSync(resolve(root, "client/public/crm/index.html"), "utf8");

describe("Guia de Fechamento por Stand V1", () => {
  it("mantém o checklist em tabelas complementares e não destrutivas", () => {
    expect(schemaSource).toContain('crm_projetos_stand_fechamentos');
    expect(schemaSource).toContain('crm_projetos_stand_fechamento_itens');
    expect(migrationSource).toContain('CREATE TABLE `crm_projetos_stand_fechamentos`');
    expect(migrationSource).toContain('CREATE TABLE `crm_projetos_stand_fechamento_itens`');
    expect(migrationSource).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b|\bDELETE\s+FROM\b|\bALTER\s+TABLE\b/i);
  });

  it("consolida fontes financeiras de origem sem gravar receitas, despesas ou rateios", () => {
    expect(apiSource).toContain('FROM crm_contas_receber WHERE projeto_stand_id = ?');
    expect(apiSource).toContain('FROM crm_transacoes');
    expect(apiSource).toContain('FROM crm_rateio_alocacoes');
    expect(apiSource).toContain('FROM crm_orcamentos_tecnicos');
    expect(apiSource).not.toMatch(/INSERT INTO crm_contas_receber|UPDATE crm_contas_receber|INSERT INTO crm_transacoes|UPDATE crm_transacoes|INSERT INTO crm_rateio_alocacoes|UPDATE crm_rateio_alocacoes/);
  });

  it("protege o checklist, exige revisão humana e impede fechamento com pendências críticas", () => {
    expect(apiSource).toContain('r.get("/:id/fechamento", requireGuideEditor');
    expect(apiSource).toContain('r.put("/:id/fechamento", requireGuideEditor');
    expect(apiSource).toContain('confirmacaoRevisao !== true');
    expect(apiSource).toContain('Resolva ou classifique todas as categorias pendentes');
    expect(apiSource).toContain('Informe a justificativa para divergências críticas');
    expect(apiSource).toContain('CLOSE_STAND_CHECKLIST');
    expect(crmSource).toContain('registerProjetosStandFechamentoRoutes(app)');
  });

  it("mantém a experiência guiada e os atalhos pré-preenchidos no Projeto de Stand", () => {
    expect(projectUiSource).toContain('projeto-stand-guide');
    expect(guideUiSource).toContain('Guia de fechamento por stand');
    expect(guideUiSource).toContain('Criar parcela');
    expect(guideUiSource).toContain('Lançar despesa');
    expect(guideUiSource).toContain('window.__samsGuiaStandDefaults');
    expect(formsSource).toContain('window.__samsGuiaStandDefaults?.transacoes');
    expect(receivableSource).toContain('window.__samsGuiaStandDefaults?.contasReceber');
    expect(indexSource).toContain('crm-projetos-stand.js?v=1787251200');
    expect(indexSource).toContain('crm-projetos-stand-fechamento.js?v=1787252500');
  });

  it("expõe o guia como entrada principal no Financeiro com busca de stand", () => {
    expect(navigationSource).toContain("guia_lancamentos: { name: 'Guia de Lançamentos'");
    expect(navigationSource).toContain("page === 'guia_lancamentos'");
    expect(navigationSource).toContain('loadFinanceiro?.()');
    expect(guideUiSource).toContain('Guia de Lançamentos por Stand');
    expect(guideUiSource).toContain('data-finance-guide-search');
    expect(guideUiSource).toContain("fetchAll('/api/crm/projetos-stand'");
    expect(guideUiSource).toContain('data-finance-guide-action="open"');
    expect(guideUiSource).toContain('Stand selecionado automaticamente.');
    expect(guideUiSource).toContain('document.addEventListener(\'input\'');
    expect(guideUiSource).toContain('/api/crm/clientes');
    expect(guideUiSource).toContain('Continuar: criar Projeto de Stand');
    expect(guideUiSource).toContain('data-finance-guide-action="create-project"');
    expect(guideUiSource).toContain('role="button"');
    expect(guideUiSource).toContain('display:flex!important');
    expect(guideUiSource).toContain('Selecione o cliente antes de criar o Projeto de Stand.');
    expect(guideUiSource).toContain('sams:projeto-stand-salvo');
    expect(projectUiSource).toContain('sams:projeto-stand-salvo');
    expect(projectUiSource).toContain("navigateToPage?.('financeiro', 'guia_lancamentos')");
  });
});
