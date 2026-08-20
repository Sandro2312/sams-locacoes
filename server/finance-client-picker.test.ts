import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const formsSource = fs.readFileSync(path.resolve(root, "client/public/crm/js/forms.js"), "utf8");
const contasReceberSource = fs.readFileSync(path.resolve(root, "client/public/crm/js/crm-contas-receber.js"), "utf8");
const modulesSource = fs.readFileSync(path.resolve(root, "client/public/crm/js/modules.js"), "utf8");
const indexSource = fs.readFileSync(path.resolve(root, "client/public/crm/index.html"), "utf8");

describe("Financeiro — busca e cadastro contextual de cliente", () => {
  it("sincroniza todos os clientes cadastrados em blocos antes de montar o seletor financeiro", () => {
    expect(modulesSource).toContain("const BLOCK = 500");
    expect(modulesSource).toContain("/api/crm/clientes?limit=${BLOCK}&offset=${offset}");
    expect(formsSource).toContain("await ModuleSystem.syncClientesFromBackend()");
    expect(formsSource).toContain("getClientesFinanceiros()");
  });

  it("oferece busca acessível e limita a lista inicial nos dois formulários financeiros", () => {
    expect(formsSource).toContain('data-client-search');
    expect(formsSource).toContain('data-client-search-count');
    expect(formsSource).toContain('data-client-initial-limit="80"');
    expect(formsSource).toContain("const initialLimit");
    expect(contasReceberSource).toContain('data-client-search');
    expect(contasReceberSource).toContain('data-client-initial-limit="80"');
    expect(indexSource).toContain("crm-contas-receber.js?v=1787247000");
    expect(indexSource).toContain("forms.js?v=1787247000");
  });

  it("preserva o lançamento e seleciona o novo cliente quando o cadastro é aberto pelo formulário financeiro", () => {
    expect(formsSource).toContain("captureFinancialDraft(form)");
    expect(formsSource).toContain("window.__samsReturnToFinanceAfterClient");
    expect(formsSource).toContain("returnToFinancialDraft(createdId)");
    expect(formsSource).toContain("Cliente cadastrado e vinculado ao lançamento em edição.");
    expect(formsSource).toContain("comprovante deverá ser anexado novamente");
  });

  it("mantém o retorno seguro também quando o usuário cancela o cadastro contextual", () => {
    expect(formsSource).toContain('creatingClient && window.__samsReturnToFinanceAfterClient');
    expect(formsSource).toContain('FormSystem.returnToFinancialDraft()');
    expect(formsSource).toContain('Voltar ao lançamento');
  });
});
