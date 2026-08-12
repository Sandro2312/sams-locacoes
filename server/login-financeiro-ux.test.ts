import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const loginHtml = fs.readFileSync(
  path.resolve(process.cwd(), "client/public/crm/index.html"),
  "utf8",
);
const modulesSource = fs.readFileSync(
  path.resolve(process.cwd(), "client/public/crm/js/modules.js"),
  "utf8",
);

describe("Experiência do login e atalhos financeiros", () => {
  it("mantém a descrição de Lembrar-me dentro de um rótulo responsivo e sem margem negativa", () => {
    const start = loginHtml.indexOf('<!-- Lembrar-me:');
    const end = loginHtml.indexOf('<!-- Botão Entrar -->', start);
    const rememberBlock = loginHtml.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(rememberBlock).toContain('align-items:flex-start');
    expect(rememberBlock).toContain('overflow-wrap:anywhere');
    expect(rememberBlock).toContain('id="rememberMeHint"');
    expect(rememberBlock).not.toContain('margin:-12px');
  });

  it("posiciona atalhos responsivos antes das listas extensas e usa a navegação oficial", () => {
    const quickAccessAt = modulesSource.indexOf('id="financeiroQuickAccess"');
    const dashboardBodyAt = modulesSource.indexOf('id="financeiroDashBody"');

    expect(quickAccessAt).toBeGreaterThanOrEqual(0);
    expect(quickAccessAt).toBeLessThan(dashboardBodyAt);
    expect(modulesSource).toContain('data-finance-page="despesas"');
    expect(modulesSource).toContain('data-finance-page="receitas"');
    expect(modulesSource).toContain('data-finance-page="comissoes"');
    expect(modulesSource).toContain('data-finance-page="boletos"');
    expect(modulesSource).toContain("window.NavigationSystem.navigateToPage('financeiro', page)");
  });
});
