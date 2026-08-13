import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const adminSource = readFileSync(resolve(root, "server/crm-admin.ts"), "utf8");
const modulesSource = readFileSync(resolve(root, "client/public/crm/js/modules.js"), "utf8");
const navigationSource = readFileSync(resolve(root, "client/public/crm/js/navigation.js"), "utf8");

describe("Financeiro — despesas vencidas", () => {
  it("não inclui despesas pagas apenas por variação de maiúsculas/minúsculas no alerta", () => {
    const start = adminSource.indexOf('app.get("/api/crm/financeiro/alertas"');
    const end = adminSource.indexOf('// ── CRM: Eventos import-url', start);
    const endpoint = adminSource.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(endpoint).toContain("LOWER(TRIM(COALESCE(status, ''))) NOT IN ('pago','baixado','cancelado')");
    expect(endpoint).toContain("LOWER(TRIM(COALESCE(status, ''))) NOT IN ('pago','recebido','baixado','cancelado')");
    expect(endpoint).not.toContain("AND status NOT IN ('pago','baixado','cancelado')");
  });

  it("calcula vencimento por data passada e status em aberto na tabela de despesas", () => {
    expect(modulesSource).toContain('const isOverdue = (transacao) =>');
    expect(modulesSource).toContain("dueDate < localDateKey()");
    expect(modulesSource).toContain("data-financeiro-vencido");
    expect(modulesSource).toContain("displayStatus(transacao)");
  });

  it("faz o seletor Vencido usar a mesma marcação calculada da linha", () => {
    const start = navigationSource.indexOf('// ── Financeiro: Despesas');
    const end = navigationSource.indexOf('// ── Financeiro: Receitas', start);
    const filter = navigationSource.slice(start, end);

    expect(filter).toContain("if (st === 'vencido')");
    expect(filter).toContain("row.getAttribute('data-financeiro-vencido') === '1'");
    expect(filter).toContain("row.getAttribute('data-financeiro-status')");
  });
});
