import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const compras = fs.readFileSync(path.join(root, "server/crm-compras.ts"), "utf8");
const crm = fs.readFileSync(path.join(root, "server/crm.ts"), "utf8");
const forms = fs.readFileSync(path.join(root, "client/public/crm/js/forms.js"), "utf8");
const modules = fs.readFileSync(path.join(root, "client/public/crm/js/modules.js"), "utf8");
const admin = fs.readFileSync(path.join(root, "server/crm-admin.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "drizzle/0025_compras_gerais_financeiro.sql"), "utf8");

describe("Compras gerais e abertura limpa de despesas", () => {
  it("cria compra e todos os lançamentos em uma única transação auditada", () => {
    expect(compras).toContain('router.post("/"');
    expect(compras).toContain("await connection.beginTransaction()");
    expect(compras).toContain("await connection.commit()");
    expect(compras).toContain("await connection?.rollback()");
    expect(compras).toContain("INSERT INTO crm_compras");
    expect(compras).toContain("INSERT INTO crm_transacoes");
    expect(compras).toContain("CREATE_GENERAL_PURCHASE");
    expect(compras).toContain("equalInstallments");
    expect(compras).toContain("ENTRADA_MAIOR_QUE_TOTAL");
    expect(compras).toContain("PARCELAS_OU_VENCIMENTO_INVALIDOS");
  });

  it("mantém compra fora de Ordem de Serviço e integra a rota principal do CRM", () => {
    expect(compras).not.toContain("crm_ordens_servico");
    expect(crm).toContain('import { registerComprasRoutes } from "./crm-compras"');
    expect(crm).toContain("registerComprasRoutes(app)");
  });

  it("preserva os detalhes financeiros também nas despesas gerais", () => {
    expect(admin).toContain("const fornecedor = req.body?.fornecedor || null");
    expect(admin).toContain("const categoria = req.body?.categoria || null");
    expect(admin).toContain("const formaPagamento = req.body?.forma_pagamento");
    expect(admin).toContain("dataPagamento");
    expect(forms).toContain("forma_pagamento: item.formaPagamento");
    expect(forms).toContain("data_pagamento: item.dataPagamento");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS data_pagamento");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS crm_compras");
  });

  it("abre despesas sem reuso automático de centro de custo ou defaults financeiros", () => {
    const autocompleteStart = forms.indexOf("setupCentroCustoAutocomplete(form)");
    const autocompleteEnd = forms.indexOf("// Inicializar sistema", autocompleteStart);
    const autocomplete = forms.slice(autocompleteStart, autocompleteEnd);
    expect(autocomplete).not.toContain("sams_last_centro_custo");
    expect(forms).toContain("if (['transacoes', 'financeiro', 'compras'].includes(m)) return;");
    expect(forms).toContain('data-module="transacoes" data-id="${id || \'\'}" data-client-initial-limit="80" autocomplete="off"');
  });

  it("oferece confirmação visível para a compra e acesso pela tela de despesas", () => {
    expect(forms).toContain("Nova Compra Geral");
    expect(forms).toContain("Confirmar compra e criar Contas a Pagar");
    expect(forms).toContain("Nada é gravado até usar");
    expect(modules).toContain('data-module="compras"');
    expect(modules).toContain("Nova Compra");
  });
});
