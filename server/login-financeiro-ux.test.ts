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
const navigationSource = fs.readFileSync(
  path.resolve(process.cwd(), "client/public/crm/js/navigation.js"),
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

  it("posiciona os cartões completos antes do Dashboard, sem atalhos duplicados", () => {
    const moduleStart = navigationSource.indexOf('generateModuleHTML(module, moduleInfo)');
    const moduleEnd = navigationSource.indexOf('async generatePageHTML', moduleStart);
    const moduleTemplate = navigationSource.slice(moduleStart, moduleEnd);
    const cardsAt = moduleTemplate.indexOf('<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">');
    const dashboardAt = moduleTemplate.indexOf('${extraDashboard}');

    expect(cardsAt).toBeGreaterThanOrEqual(0);
    expect(dashboardAt).toBeGreaterThan(cardsAt);
    expect(navigationSource).toContain("custos: { name: 'Despesas'");
    expect(navigationSource).toContain("receitas: { name: 'Receitas'");
    expect(navigationSource).toContain("comissoes: { name: 'Comissões'");
    expect(modulesSource).not.toContain('id="financeiroQuickAccess"');
  });
});
