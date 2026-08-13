import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const serverSource = readFileSync(resolve(root, "server/crm-assistente.ts"), "utf8");
const clientSource = readFileSync(resolve(root, "client/public/crm/js/crm-veruska.js"), "utf8");

describe("Veruska — sessão e disponibilidade", () => {
  it("usa a IA gerenciada do projeto e mapeia falhas para mensagens seguras", () => {
    expect(serverSource).toContain('import { invokeLLM, Tool } from "./_core/llm"');
    expect(serverSource).toContain('model: "gpt-5-mini"');
    expect(serverSource).toContain("PROJECT_TOOLS");
    expect(serverSource).toContain("VERUSKA_IA_INDISPONIVEL");
    expect(serverSource).not.toContain("ANTHROPIC_API_KEY");
    expect(serverSource).toContain("ORDER BY cr.vencimento ASC LIMIT ${limite}");
    expect(serverSource).toContain("ORDER BY data ASC LIMIT ${limite}");
    expect(serverSource).toContain("ORDER BY data_inicio DESC LIMIT ${limite}");
    expect(serverSource).toContain("t.data_vencimento ASC LIMIT ${limite}");
  });

  it("envia credenciais de fallback e orienta o usuário quando a sessão expira", () => {
    expect(clientSource).toContain("window.AuthSystem._getAuthHeaders");
    expect(clientSource).toContain("credentials: 'include'");
    expect(clientSource).toContain("Sua sessão expirou. Faça login novamente");
    expect(clientSource).toContain("data-veruska-prompt");
    expect(clientSource).toContain("Não foi possível concluir esta consulta agora");
  });
});
