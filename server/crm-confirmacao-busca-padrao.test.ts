import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const lote = read("client/public/crm/js/crm-lotes-financeiros.js");
const navigation = read("client/public/crm/js/navigation.js");
const index = read("client/public/crm/index.html");

describe("CRM — confirmação acessível e busca padrão", () => {
  it("mantém uma confirmação fixa enquanto houver itens em rascunho", () => {
    expect(lote).toContain("data-finance-batch-confirmation-dock");
    expect(lote).toContain("fixed bottom-4 right-4 z-50");
    expect(lote).toContain("Confirmar e criar lançamentos");
    expect(lote).toContain("data-finance-batch-action=\"confirmar\"");
  });

  it("informa visualmente as receitas e despesas após a confirmação", () => {
    expect(lote).toContain("showConfirmationSuccess(response.lancamentos || [])");
    expect(lote).toContain("finance-batch-confirmation-success");
    expect(lote).toContain("Lançamentos confirmados");
    expect(lote).toContain("Ver Receitas");
    expect(lote).toContain("Ver Despesas");
    expect(lote).toContain("fechar-sucesso");
  });

  it("instala uma busca padrão que filtra apenas a tabela carregada da página", () => {
    expect(navigation).toContain("installStandardSearch(module, page)");
    expect(navigation).toContain("data-crm-standard-search");
    expect(navigation).toContain("moduleContent.querySelectorAll('tbody tr')");
    expect(navigation).toContain("new MutationObserver(apply)");
    expect(navigation).toContain("this.installStandardSearch(module, page);");
  });

  it("mantém o guia fora da busca tabular genérica, pois ele possui sua busca contextual", () => {
    expect(navigation).toContain("'guia_lancamentos'");
    expect(lote).toContain("data-finance-batch-client-search");
  });

  it("distribui as versões atualizadas dos dois módulos", () => {
    expect(index).toMatch(/\/crm\/js\/crm-lotes-financeiros\.js\?v=\d+/);
    expect(index).toMatch(/\/crm\/js\/navigation\.js\?v=\d+/);
  });
});
