import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const modules = read("client/public/crm/js/modules.js");
const crm = read("server/crm.ts");
const lote = read("server/crm-lotes-financeiros.ts");
const index = read("client/public/crm/index.html");

describe("Financeiro — centro de custo de lançamentos por stand", () => {
  it("mantém o centro detalhado do lote e o vínculo de evento nas duas estruturas financeiras", () => {
    expect(lote).toContain("[lote.cliente_id, lote.evento_id, lote.centro_custo");
    expect(lote).toContain("[descricao, parcela.valor, lote.centro_custo, parcela.vencimento");
  });

  it("inclui o nome do evento nas contas a receber para filtrar receitas criadas pelo guia", () => {
    expect(crm).toContain("COALESCE(e.nome, '') as evento_nome");
    expect(crm).toContain("LEFT JOIN crm_eventos e ON cr.evento_id = e.id");
    expect(modules).toContain("eventoId: r.eventoId ?? r.evento_id ?? null");
    expect(modules).toContain("eventoNome: r.eventoNome ?? r.evento_nome ?? null");
  });

  it("aceita tanto o centro detalhado do stand quanto o nome do evento nos filtros e relatórios", () => {
    expect(modules).toContain("matchesCentroCustoFilter(record, value)");
    expect(modules).toContain("findEventoByCentroCustoFilter(value)");
    expect(modules).toContain("transacoes.filter(t => this.matchesCentroCustoFilter(t, selectedRaw))");
    expect(modules).toContain(".filter(cr => !selectedKey || this.matchesCentroCustoFilter(cr, selectedRaw))");
    expect(modules).toContain("const selectedEvent = filterKey ? this.findEventoByCentroCustoFilter(filterCentroCusto) : null");
  });

  it("distribui a versão atualizada dos filtros financeiros", () => {
    expect(index).toContain("/crm/js/modules.js?v=1787316000");
  });
});
