import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";

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

  it("inclui o checklist em uma única transação antes de qualquer confirmação financeira", () => {
    expect(api).toContain('r.post("/:id/itens-em-lote", requireFinance');
    expect(api).toContain('const items = rawItems.map(normalizeItem)');
    expect(api).toContain('Informe de 1 a 30 itens para inclusão no lote');
    expect(api).toContain('await conn.beginTransaction()');
    expect(api).toContain('await conn.rollback()');
    expect(api).toContain('ADD_FINANCE_BATCH_ITEMS');
    expect(api).toContain('itemIds');
  });

  it("inclui os itens selecionados do checklist de forma atômica antes da confirmação financeira final", () => {
    expect(api).toContain('r.post("/:id/itens-em-lote", requireFinance');
    expect(api).toContain('Informe de 1 a 30 itens para inclusão no lote');
    expect(api).toContain('const items = rawItems.map(normalizeItem)');
    expect(api).toContain('await conn.beginTransaction()');
    expect(api).toContain('await conn.rollback()');
    expect(api).toContain('ADD_FINANCE_BATCH_ITEMS');
    expect(api).toContain('itemIds');
    expect(api).toContain('LOTE_JA_CONFIRMADO');
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
    expect(guide).toContain('Confirmar lançamentos');
    expect(guide).toContain('data-finance-batch-confirmation-panel class="rounded-2xl border-4 border-emerald-500 bg-slate-950');
    expect(guide).toContain('Ação necessária');
    expect(guide).toContain('Revise os itens abaixo');
    expect(guide).not.toContain('data-finance-batch-confirmation-dock');
    expect(guide).not.toContain('sticky bottom-3');
    expect(guide).toContain('Ações');
    expect(guide).toContain('Confirmar ${itens.length} lançamento(s) do lote');
    expect(guide).toContain('formatDate =');
    expect(guide).toContain('Conta a Receber');
    expect(guide).toContain('Ver Receitas');
    expect(guide).toContain("openFinancePage('receitas')");
    expect(guide).toContain("openFinancePage('custos')");
    expect(navigation).toContain('window.LoteFinanceiroModule?.load?.()');
    expect(navigation).toContain("window.LoteFinanceiroModule?.load?.()");
    expect(guide).toContain('showConfirmationSuccess');
    expect(guide).toContain('Lançamentos confirmados');
    expect(index).toContain('/crm/js/crm-lotes-financeiros.js?v=1788357800');
  });

  it("exibe checklist expansível e exige revisão em modal antes de salvar o rascunho", () => {
    expect(guide).toContain('const checklistCatalog =');
    expect(guide).toContain('Venda do stand');
    expect(guide).toContain('Locação de painéis de LED');
    expect(guide).toContain('Lançamento personalizado');
    expect(guide).toContain('revisar-itens-checklist');
    expect(guide).toContain('finance-batch-checklist-review');
    expect(guide).toContain('Revisão antes de salvar');
    expect(guide).toContain('Salvar itens no rascunho');
    expect(guide).toContain('/itens-em-lote');
    expect(guide).toContain('A geração das receitas e despesas reais continua na confirmação final do lote.');
  });

  it("mantém a revisão acessível e responsiva em desktop e mobile", () => {
    expect(guide).toContain('aria-label="Checklist de lançamentos típicos"');
    expect(guide).toContain('aria-controls="${id}-content"');
    expect(guide).toContain('aria-modal');
    expect(guide).toContain('focus:ring-4');
    expect(guide).toContain('grid-cols-1 gap-6 xl:grid-cols-2');
    expect(guide).toContain('w-full shrink-0');
    expect(guide).toContain('sm:w-auto');
    expect(guide).toContain('flex items-end');
    expect(guide).toContain('sm:items-center sm:justify-center');
  });

  it("consulta o cadastro atualizado ao pesquisar um cliente e o seleciona sem depender da lista anterior", async () => {
    const listeners = new Map<string, (event: { target: unknown }) => void>();
    const search = { value: "MM HORTI", matches: (selector: string) => selector === "[data-finance-batch-client-search]" };
    const select = { value: "", innerHTML: "" };
    const count = { textContent: "" };
    const resultsHost = { innerHTML: "" };
    const workspace = { innerHTML: "" };
    const fetchCalls: string[] = [];
    const document = {
      addEventListener: (type: string, listener: (event: { target: unknown }) => void) => listeners.set(type, listener),
      querySelector: (selector: string) => ({
        "[data-finance-batch-page]": {},
        "[data-finance-batch-client-search]": search,
        "[data-finance-batch-client]": select,
        "[data-finance-batch-client-count]": count,
        "[data-finance-batch-client-results-host]": resultsHost,
      } as Record<string, unknown>)[selector] ?? null,
      getElementById: (id: string) => id === "finance-batch-workspace" ? workspace : null,
    };
    const window = {
      ModuleSystem: { showNotification: () => undefined },
      setTimeout: (callback: () => void, _delay: number) => setTimeout(callback, 0),
      clearTimeout,
    };
    runInNewContext(guide, {
      window,
      document,
      fetch: async (url: string) => {
        fetchCalls.push(url);
        const data = url.includes("q=MM%20HORTI")
          ? [{ id: 987654, nome: "MM HORTIFRUTIGRANJEIROS", email: "", documento: "" }]
          : url.includes("/api/crm/clientes")
            ? [{ id: 1, nome: "Cliente anterior", email: "", documento: "" }]
            : [{ id: 1, nome: "Evento de teste" }];
        return { ok: true, json: async () => ({ data, total: data.length }) };
      },
      console,
      Map,
      Intl,
      String,
      Number,
      Array,
      JSON,
      encodeURIComponent,
    });
    await (window as any).LoteFinanceiroModule.load();
    listeners.get("input")?.({ target: search });
    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(fetchCalls).toContain("/api/crm/clientes?q=MM%20HORTI&limit=80");
    expect(select.value).toBe("987654");
    expect(count.textContent).toContain("selecionado automaticamente");
    expect(resultsHost.innerHTML).toContain("MM HORTIFRUTIGRANJEIROS");
  });
});
