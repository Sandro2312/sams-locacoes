import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const api = read("server/crm-lotes-financeiros.ts");
const crm = read("server/crm.ts");
const schema = read("drizzle/schema.ts");
const migration = read("drizzle/0018_wakeful_human_torch.sql");
const dueDatesMigration = read("drizzle/0019_famous_wrecker.sql");
const installmentValuesMigration = read("drizzle/0020_special_slipstream.sql");
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
    expect(api).toContain("lancamentos_criados: storedCreated(item.lancamentos_criados)");
  });

  it("preserva datas individualizadas por parcela e não serializa datas como objetos", () => {
    expect(schema).toContain('datasVencimento: text("datas_vencimento")');
    expect(schema).toContain('valoresParcelas: text("valores_parcelas")');
    expect(dueDatesMigration).toContain("ADD `datas_vencimento` text");
    expect(installmentValuesMigration).toContain("ADD `valores_parcelas` text");
    expect(api).toContain("datasVencimento: string[]");
    expect(api).toContain("DATAS_PARCELAS_INCONSISTENTES");
    expect(api).toContain("VALORES_PARCELAS_INCONSISTENTES");
    expect(api).toContain("function parcelValues");
    expect(api).toContain("JSON.stringify(item.valoresParcelas)");
    expect(api).toContain("JSON.stringify(item.datasVencimento)");
    expect(api).toContain("value instanceof Date");
  });

  it("oferece lote financeiro no Financeiro sem depender de Projeto de Stand", () => {
    expect(guide).toContain("Lançamentos em lote por Stand");
    expect(guide).toContain("Não cria venda nem Projeto de Stand");
    expect(guide).toContain("Criar lote e adicionar itens");
    expect(guide).toContain("Revisar e confirmar lançamentos");
    expect(guide).toContain('data-finance-batch-client-search');
    expect(guide).toContain('data-finance-batch-client-count');
    expect(guide).toContain('data-finance-batch-client-results-host');
    expect(guide).toContain('data-finance-batch-client-result');
    expect(guide).toContain('Resultados encontrados — clique para selecionar:');
    expect(guide).toContain('selecionado para o lote.');
    expect(guide).toContain('1 cliente encontrado e selecionado automaticamente.');
    expect(guide).toContain('function buscarClientesAtualizados()');
    expect(guide).toContain("/api/crm/clientes?q=${encodeURIComponent(term)}&limit=80");
    expect(guide).toContain('Buscando clientes atualizados...');
    expect(guide).toContain('mergeClientes(clientes);');
    expect(guide).toContain('if (request !== state.clientSearchRequest) return;');
    expect(guide).toContain('window.clearTimeout(state.clientSearchTimer)');
    expect(guide).toContain('data-finance-batch-event-search');
    expect(guide).toContain('data-finance-batch-event-count');
    expect(guide).toContain('data-finance-batch-event-results-host');
    expect(guide).toContain('data-finance-batch-event-result');
    expect(guide).toContain('1 evento encontrado e selecionado automaticamente.');
    expect(guide).toContain("fetchAll('/api/crm/eventos')");
    expect(guide).toContain('function searchEvent(term)');
    expect(guide).toContain('results.length === 1');
    expect(guide).toContain('data-finance-batch-item-data-parcela');
    expect(guide).toContain('Vencimentos e valores por parcela');
    expect(guide).toContain('data-finance-batch-item-valor-parcela');
    expect(guide).toContain('Soma das parcelas:');
    expect(guide).toContain('Confirmar no Financeiro');
    expect(guide).toContain('Confirmar e criar lançamentos');
    expect(guide).toContain('Criar lançamentos');
    expect(guide).toContain('Ações');
    expect(guide).toContain('Criar ${itens.length} item(ns) como lançamentos reais');
    expect(guide).toContain('formatDate =');
    expect(guide).toContain('Conta a Receber');
    expect(guide).toContain('Ver Receitas');
    expect(guide).toContain("openFinancePage('receitas')");
    expect(guide).toContain("openFinancePage('custos')");
    expect(navigation).toContain('window.LoteFinanceiroModule?.load?.()');
    expect(navigation).toContain("window.LoteFinanceiroModule?.load?.()");
    expect(guide).toContain('showConfirmationSuccess');
    expect(guide).toContain('Lançamentos confirmados');
    expect(index).toContain('/crm/js/crm-lotes-financeiros.js?v=1788269400');
  });
});
