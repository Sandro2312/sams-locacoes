import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const root = resolve(__dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");
const api = read("server/crm-planejamento-montagem.ts");
const crm = read("server/crm.ts");
const schema = read("drizzle/schema.ts");
const migration = read("drizzle/0022_planejamento_montagem.sql");
const ui = read("client/public/crm/js/crm-planejamento-montagem.js");
const navigation = read("client/public/crm/js/navigation.js");
const index = read("client/public/crm/index.html");

describe("Planejamento e Execução de Montagem — Fase 1", () => {
  it("adiciona somente dados operacionais sem reescrever lançamentos financeiros", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS projeto_stand_id");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS crm_os_ocorrencias");
    expect(migration).toContain("data_inicio_real");
    expect(migration).toContain("quantidade_real");
    expect(migration).not.toMatch(/(?:INSERT INTO|UPDATE|DELETE FROM|ALTER TABLE)\s+crm_(?:transacoes|contas_receber)/i);
    expect(schema).toContain('export const crmOrdensServico');
    expect(schema).toContain('export const crmOsEquipe');
    expect(schema).toContain('export const crmOsMateriais');
    expect(schema).toContain('export const crmOsOcorrencias');
  });

  it("registra a API protegida e preserva a auditoria de alterações operacionais", () => {
    expect(crm).toContain('import { registerPlanejamentoMontagemRoutes } from "./crm-planejamento-montagem"');
    expect(crm).toContain("registerPlanejamentoMontagemRoutes(app)");
    expect(api).toContain('app.use("/api/crm/montagem-planejamento", r)');
    expect(api).toContain("function requireCrmAuth");
    expect(api).toContain("function requireOperationalWrite");
    expect(api).toContain("OPERATIONAL_WRITERS");
    expect(api).toContain("CREATE_OPERATION_PLAN");
    expect(api).toContain("UPDATE_OPERATION_PLAN");
    expect(api).toContain("ADD_OPERATION_TEAM");
    expect(api).toContain("ADD_OPERATION_MATERIAL");
    expect(api).toContain("ADD_OPERATION_ISSUE");
  });

  it("valida relações, períodos, conclusão e valores antes de persistir", () => {
    expect(api).toContain("validateRelations(eventoId, projetoStandId)");
    expect(api).toContain("EVENTO_PROJETO_DIVERGENTE");
    expect(api).toContain("PERIODO_INVALIDO");
    expect(api).toContain("FINALIZACAO_INCOMPLETA");
    expect(api).toContain("DECIMAL_INVALIDO");
    expect(api).toContain("STATUS_INVALIDO");
    expect(api).toContain("MATERIAL_STATUS_INVALIDO");
  });

  it("calcula alertas de prontidão e conflitos sem criar despesa, receita ou rateio", () => {
    expect(api).toContain("conflitos_equipe");
    expect(api).toContain("materiais_prontos");
    expect(api).toContain("ocorrencias_abertas");
    expect(api).not.toMatch(/INSERT INTO\s+crm_(?:transacoes|contas_receber|rateio)/i);
    expect(api).not.toMatch(/UPDATE\s+crm_(?:transacoes|contas_receber|rateio)/i);
  });

  it("entrega uma tela responsiva, mobile e vinculada à navegação oficial", () => {
    expect(ui).toContain("window.PlanejamentoMontagemModule");
    expect(ui).toContain("planejamento operacional");
    expect(ui).toContain("Esta área não cria nem altera lançamentos financeiros.");
    expect(ui).toContain("md:hidden");
    expect(ui).toContain('type="datetime-local"');
    expect(ui).toContain("data-montagem-action");
    expect(ui).toContain("data-montagem-team-form");
    expect(ui).toContain("data-montagem-material-form");
    expect(ui).toContain("data-montagem-issue-form");
    expect(ui).toContain("Agenda operacional");
    expect(ui).toContain("Próximos 14 dias");
    expect(ui).toContain("Conflito de equipe");
    expect(ui).toContain("min-w-[980px]");
    expect(navigation).toContain("Planos de Montagem");
    expect(navigation).toContain("window.PlanejamentoMontagemModule?.render?.()");
    expect(navigation).toContain("window.PlanejamentoMontagemModule?.load?.()");
    expect(index).toContain('/crm/js/crm-planejamento-montagem.js?v=1791204200');
    expect(index).toContain('/crm/js/navigation.js?v=1791203900');
  });

  it("renderiza o estado vazio sem depender de dados financeiros ou de um navegador específico", () => {
    const window: Record<string, unknown> = {};
    runInNewContext(ui, { window, console, setTimeout, clearTimeout, URLSearchParams });
    const markup = (window.PlanejamentoMontagemModule as { render: () => string }).render();

    expect(markup).toContain('data-montagem-planejamento-page');
    expect(markup).toContain('Novo plano');
    expect(markup).toContain('Nenhum Plano de Montagem encontrado');
    expect(markup).toContain('md:hidden');
    expect(markup).not.toContain('undefined');
  });
});
