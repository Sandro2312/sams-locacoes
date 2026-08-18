import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(new URL("./crm-projetos-stand.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const projectClientSource = readFileSync(new URL("../client/public/crm/js/crm-projetos-stand.js", import.meta.url), "utf8");
const budgetClientSource = readFileSync(new URL("../client/public/crm/js/crm-orcamentos-tecnicos.js", import.meta.url), "utf8");

describe("orçamento técnico versionado", () => {
  it("persiste versões e itens em tabelas independentes do financeiro e dos contratos", () => {
    expect(schemaSource).toContain('crmOrcamentosTecnicos = mysqlTable("crm_orcamentos_tecnicos"');
    expect(schemaSource).toContain('crmOrcamentosTecnicosItens = mysqlTable("crm_orcamentos_tecnicos_itens"');
    expect(schemaSource).toContain('uniqueIndex("crm_orcamentos_tecnicos_projeto_versao_unique")');
    expect(schemaSource).toContain('projetoStandId: int("projeto_stand_id").notNull()');
    expect(schemaSource).toContain('desconto: decimal("desconto"');
    expect(schemaSource).toContain('margemPercentual: decimal("margem_percentual"');
  });

  it("calcula custo, venda, desconto e margem com normalização monetária em centavos", () => {
    expect(serverSource).toContain('function moneyToCents');
    expect(serverSource).toContain('function quantityToMilli');
    expect(serverSource).toContain('costTotalCents: Math.round((costCents * quantityMilli) / 1000)');
    expect(serverSource).toContain('discountCents > subtotalSaleCents');
    expect(serverSource).toContain('marginCents = finalSaleCents - subtotalCostCents');
    expect(serverSource).toContain('DESCONTO_INVALIDO');
  });

  it("preserva versões enviadas ou aprovadas e exige duplicação para revisão", () => {
    expect(serverSource).toContain('function isLockedBudget');
    expect(serverSource).toContain('Esta versão está bloqueada. Duplique-a para criar uma nova revisão.');
    expect(serverSource).toContain('r.post("/:id/orcamentos/:orcamentoId/duplicar", requireBudgetEditor');
    expect(serverSource).toContain('DUPLICATE_TECHNICAL_BUDGET');
    const duplicateSection = serverSource.split('r.post("/:id/orcamentos/:orcamentoId/duplicar", requireBudgetEditor')[1].split('r.post("/:id/orcamentos/:orcamentoId/enviar", requireBudgetEditor')[0];
    const approvalSection = serverSource.split('r.post("/:id/orcamentos/:orcamentoId/aprovar", requireFinanceManager')[1];
    expect(duplicateSection).not.toContain("substituida");
    expect(approvalSection).toContain("status='substituida'");
  });

  it("controla envio, aprovação e auditoria por permissões adequadas", () => {
    expect(serverSource).toContain('r.post("/:id/orcamentos/:orcamentoId/enviar", requireBudgetEditor');
    expect(serverSource).toContain('r.post("/:id/orcamentos/:orcamentoId/aprovar", requireFinanceManager');
    expect(serverSource).toContain('confirmacaoRevisao !== true');
    expect(serverSource).toContain('CREATE_TECHNICAL_BUDGET');
    expect(serverSource).toContain('UPDATE_TECHNICAL_BUDGET');
    expect(serverSource).toContain('APPROVE_TECHNICAL_BUDGET');
  });

  it("sinaliza composição interna pendente e bloqueia aprovação até a conferência de custos", () => {
    expect(schemaSource).toContain('composicaoPendente: tinyint("composicao_pendente")');
    expect(serverSource).toContain('function pendingComposition');
    expect(serverSource).toContain('composicao_pendente');
    expect(serverSource).toContain('Conclua e confira a composição interna de custos antes de aprovar este orçamento');
    expect(budgetClientSource).toContain('Composição interna pendente');
    expect(budgetClientSource).toContain('Aguardando custos internos');
  });

  it("oferece acesso responsivo por Projeto de Stand, itens, totais e comparação de versões", () => {
    expect(projectClientSource).toContain('projeto-stand-budget');
    expect(budgetClientSource).toContain('Orçamento Técnico Versionado');
    expect(budgetClientSource).toContain('data-orcamento-tecnico-items');
    expect(budgetClientSource).toContain('data-orcamento-tecnico-subtotal-custo');
    expect(budgetClientSource).toContain('data-orcamento-tecnico-subtotal-venda');
    expect(budgetClientSource).toContain('Duplicar para revisão');
    expect(budgetClientSource).toContain('grid-cols-1');
    expect(budgetClientSource).toContain('sm:flex-row');
  });
});
