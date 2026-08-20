import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const api = read("server/crm-lotes-financeiros.ts");
const crm = read("server/crm.ts");
const schema = read("drizzle/schema.ts");
const migration = read("drizzle/0018_wakeful_human_torch.sql");
const guide = read("client/public/crm/js/crm-lotes-financeiros.js");
const navigation = read("client/public/crm/js/navigation.js");
const index = read("client/public/crm/index.html");

describe("Lote Financeiro por Stand", () => {
  it("mantém rascunhos e itens em estruturas complementares, sem alterar tabelas de origem", () => {
    expect(schema).toContain("crmLotesFinanceirosStand");
    expect(schema).toContain("crmLotesFinanceirosStandItens");
    expect(migration).toContain("CREATE TABLE `crm_lotes_financeiros_stand`");
    expect(migration).toContain("CREATE TABLE `crm_lotes_financeiros_stand_itens`");
    expect(migration).not.toMatch(/ALTER TABLE\s+`?crm_(contas_receber|transacoes)`?/i);
  });

  it("registra a API protegida e exige revisão humana antes de criar lançamentos", () => {
    expect(crm).toContain('import { registerLotesFinanceirosRoutes } from "./crm-lotes-financeiros"');
    expect(crm).toContain("registerLotesFinanceirosRoutes(app)");
    expect(api).toContain('app.use("/api/crm/lotes-financeiros", r)');
    expect(api).toContain("r.post(\"/:id/confirmar\", requireFinance");
    expect(api).toContain("confirmacaoHumana !== true");
    expect(api).toContain("beginTransaction()");
    expect(api).toContain("CONFIRM_FINANCE_BATCH");
  });

  it("gera receitas e despesas parceladas usando os contratos financeiros existentes", () => {
    expect(api).toContain("INSERT INTO crm_contas_receber");
    expect(api).toContain("projeto_stand_id, centro_custo, descricao, valor, vencimento, status");
    expect(api).toContain("INSERT INTO crm_transacoes");
    expect(api).toContain("VALUES (?,'pagar',?,'pendente'");
    expect(api).toContain("buildParcelas");
    expect(api).toContain("lancamentos_criados");
  });

  it("oferece lote financeiro no Financeiro sem depender de Projeto de Stand", () => {
    expect(guide).toContain("Lançamentos em lote por Stand");
    expect(guide).toContain("Não cria venda nem Projeto de Stand");
    expect(guide).toContain("Criar lote e adicionar itens");
    expect(guide).toContain("Revisar e confirmar lançamentos");
    expect(guide).toContain('data-finance-batch-client-search');
    expect(guide).toContain('data-finance-batch-client-count');
    expect(guide).toContain('1 cliente encontrado e selecionado automaticamente.');
    expect(guide).toContain('results.length === 1');
    expect(navigation).toContain('window.LoteFinanceiroModule?.load?.()');
    expect(navigation).toContain("window.LoteFinanceiroModule?.load?.()");
    expect(index).toContain("/crm/js/crm-lotes-financeiros.js?v=1787253400");
  });
});
