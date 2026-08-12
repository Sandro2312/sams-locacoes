import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "client/public/crm/js/auth.js"),
  "utf8",
);

describe("AuthSystem — entrada explícita no CRM", () => {
  it("mantém a tela de login no carregamento, mesmo quando existe uma sessão válida", () => {
    const start = source.indexOf("    init() {");
    const end = source.indexOf("    // Verificar sessão existente", start);
    const init = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(init).toContain("if (this.initialized) return;");
    expect(init).toContain("this.initialized = true;");
    expect(init).toContain("this.currentUser = null;");
    expect(init).toContain("this.showLogin();");
    expect(init).not.toContain("this.checkSession();");
  });

  it("mantém checkSession disponível para fluxos explícitos futuros, sem usá-la no bootstrap", () => {
    expect(source).toContain("async checkSession()");
  });
});
