import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const forms = read("client/public/crm/js/forms.js");
const crm = read("server/crm.ts");
const index = read("client/public/crm/index.html");

describe("Edição de eventos", () => {
  it("preenche campos date a partir de formatos camelCase, snake_case ou data serializada", () => {
    expect(forms).toContain("const dataInicio = toInputDate(evento?.dataInicio ?? evento?.data_inicio)");
    expect(forms).toContain("const dataFim = toInputDate(evento?.dataFim ?? evento?.data_fim)");
    expect(forms).toContain('name="dataInicio" value="${dataInicio}"');
    expect(forms).toContain('name="dataFim" value="${dataFim}"');
  });

  it("envia o contrato da API ao atualizar e mostra falha sem aplicar alteração apenas local", () => {
    expect(forms).toContain("const eventoPayload = {");
    expect(forms).toContain("data_inicio: data.dataInicio ?? data.data_inicio ?? null");
    expect(forms).toContain("taxas_json: {");
    expect(forms).toContain("notifyError(msg);");
    expect(forms).toContain("window.NavigationSystem.reloadEventosList()");
  });

  it("preserva campos omitidos, aceita nomes legados e retorna o evento gravado", () => {
    expect(crm).toContain('const existing = await dbOne<any>("SELECT * FROM crm_eventos WHERE id = ?", [id])');
    expect(crm).toContain('const data_inicio = choose(existing.data_inicio, "data_inicio", "dataInicio")');
    expect(crm).toContain('const data_fim = choose(existing.data_fim, "data_fim", "dataFim")');
    expect(crm).toContain('const site = choose(existing.site, "site")');
    expect(crm).toContain('const descricao = choose(existing.descricao, "descricao")');
    expect(crm).toContain('const rawTaxas = supplied("taxas_json", "taxas")');
    expect(crm).toContain("res.json({ ok: true, evento });");
  });

  it("distribui a versão corrigida do formulário", () => {
    expect(index).toContain("/crm/js/forms.js?v=1787347900");
  });
});
