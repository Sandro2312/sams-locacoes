import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const loginHtml = fs.readFileSync(
  path.resolve(process.cwd(), "client/public/crm/index.html"),
  "utf8",
);
const authSource = fs.readFileSync(
  path.resolve(process.cwd(), "client/public/crm/js/auth.js"),
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

  it("preserva senhas em letras minúsculas no campo de autenticação, inclusive em navegadores móveis", () => {
    const start = loginHtml.indexOf('id="loginPassword"');
    const end = loginHtml.indexOf('data-placeholder="Mínimo 8 caracteres"', start);
    const passwordInput = loginHtml.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(passwordInput).toContain('autocapitalize="none"');
    expect(passwordInput).toContain('autocorrect="off"');
    expect(passwordInput).toContain('spellcheck="false"');
    expect(passwordInput).toContain('text-transform:none');
    expect(authSource).toContain("const password = passwordEl ? passwordEl.value : ''");
    expect(authSource).toContain('body: JSON.stringify({ email, password })');
    expect(authSource).not.toContain('password.toLowerCase()');
    expect(authSource).not.toContain('password.toUpperCase()');
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
