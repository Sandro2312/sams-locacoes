import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const navigationSource = fs.readFileSync(
  path.resolve(process.cwd(), "client/public/crm/js/navigation.js"),
  "utf8",
);

describe("Dashboard Financeiro", () => {
  it("mantém Dashboard como página formal do módulo", () => {
    expect(navigationSource).toContain("dashboard: { name: 'Dashboard', icon: 'fas fa-chart-pie' }");
    expect(navigationSource).toContain("module === 'financeiro' && page === 'dashboard'");
    expect(navigationSource).toContain("ModuleSystem?.financeiro?.renderDashboardHome?.()");
    expect(navigationSource).toContain("ModuleSystem?.financeiro?.initDashboardHome?.()");
  });

  it("permite Dashboard ao Administrador, Desenvolvedor e usuários com permissão financeira", () => {
    expect(navigationSource).toContain("['administrador', 'admin', 'desenvolvedor', 'developer'].includes(role)");
    expect(navigationSource).toContain("if (hasFinancePerms) allowed.add('dashboard')");
  });
});
