import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const navigationSource = readFileSync(resolve(__dirname, "../client/public/crm/js/navigation.js"), "utf8");
const authSource = readFileSync(resolve(__dirname, "../client/public/crm/js/auth.js"), "utf8");
const kanbanSource = readFileSync(resolve(__dirname, "../client/public/crm/js/kanban.js"), "utf8");

describe("Acesso ao Kanban", () => {
  it("mantém o Kanban disponível para perfis operacionais previstos", () => {
    expect(authSource).toContain("modules: ['marketing', 'kanban', 'acervo']");
    expect(authSource).toContain("modules: ['marketing', 'comercial', 'financeiro', 'kanban', 'acervo']");
    expect(authSource).toContain("modules: ['projetos', 'kanban', 'acervo']");
    expect(authSource).toContain("modules: ['montagem', 'kanban', 'acervo']");
  });

  it("direciona navegações sem sessão ao login, sem liberar módulos indevidamente", () => {
    expect(navigationSource).toContain("ensureAuthenticated()");
    expect(navigationSource).toContain("if (auth && typeof auth.showLogin === 'function') auth.showLogin();");
    expect(navigationSource).toContain("if (!this.ensureAuthenticated()) return;");
    expect(navigationSource).toContain("if (!AuthSystem.hasModuleAccess(module) && module !== 'dashboard')");
  });

  it("reconhece Desenvolvedor acima de Administrador nas ações de gestão do Kanban", () => {
    expect(kanbanSource).toContain("if (r === 'desenvolvedor' || r === 'developer') return 4;");
    expect(kanbanSource).toContain("if (n === 'desenvolvedor' || n === 'developer') return 4;");
    expect(kanbanSource).toContain("if (role === 'desenvolvedor' || role === 'developer' || nivel === 'desenvolvedor' || nivel === 'developer') return 4;");
    expect(kanbanSource).toContain("if (!this.isAdminOrManager(user)) return null;");
  });
});
