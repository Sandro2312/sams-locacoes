import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const modulesSource = readFileSync(resolve(__dirname, "../client/public/crm/js/modules.js"), "utf8");
const navigationSource = readFileSync(resolve(__dirname, "../client/public/crm/js/navigation.js"), "utf8");

describe("Atalho de pendências financeiras", () => {
  it("encaminha débitos pendentes para a mesma página usada pelo cartão Despesas", () => {
    expect(modulesSource).toContain("const destinoPagina = tipo === 'cred' ? 'receitas' : 'custos'");
    expect(modulesSource).toContain("Ver todas as ' + destinoNome");
    expect(modulesSource).toContain("NavigationSystem.navigateToPage('financeiro',".replace(/'/g, "\\'"));
    expect(navigationSource).toContain("custos: { name: 'Despesas'");
  });

  it("mantém o atalho acessível e responsivo dentro da tabela de pendências", () => {
    expect(modulesSource).toContain('type="button"');
    expect(modulesSource).toContain('aria-label="Ver todos os itens em ');
    expect(modulesSource).toContain("focus:ring-2 focus:ring-blue-500");
    expect(modulesSource).toContain("inline-flex items-center");
  });
});
