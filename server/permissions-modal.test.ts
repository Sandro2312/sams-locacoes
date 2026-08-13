import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../client/public/crm/js/permissions.js"), "utf8");

describe("Modal de gerenciamento de permissões", () => {
  it("mantém cabeçalho e ações acessíveis enquanto apenas o conteúdo rola", () => {
    expect(source).toContain('id="permission-dialog"');
    expect(source).toContain("flex flex-col overflow-hidden");
    expect(source).toContain("flex-1 min-h-0 overflow-y-auto overscroll-contain");
    expect(source).toContain("flex-none flex flex-col-reverse sm:flex-row");
  });

  it("permite fechar por cancelar, pelo botão, por Esc e ao clicar fora do diálogo", () => {
    expect(source).toContain("e.target === modalShell");
    expect(source).toContain("currentOverlay && !currentOverlay.classList.contains('hidden')");
    expect(source).toContain("document.getElementById('permission-close')?.focus()");
  });

  it("oferece busca, resumo da seleção e bloqueia salvamentos duplicados", () => {
    expect(source).toContain('id="permission-search"');
    expect(source).toContain('id="permission-selection-summary"');
    expect(source).toContain("filterPermissions(query)");
    expect(source).toContain("refreshPermissionReview()");
    expect(source).toContain("if (saveBtn?.disabled) return;");
  });

  it("reconhece Administrador e Desenvolvedor como perfis privilegiados", () => {
    expect(source).toContain("'desenvolvedor', 'developer'");
    expect(source).toContain("possui acesso privilegiado");
  });
});
