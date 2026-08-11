import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "server/crm-admin.ts"),
  "utf8",
);

describe("CRM Admin — paginação compatível com TiDB", () => {
  it("usa apenas inteiros previamente validados ao montar LIMIT/OFFSET de transações", () => {
    const start = source.indexOf('// ── CRM: Transações (Financeiro)');
    const end = source.indexOf('rt.post("/", requireAuth', start);
    const endpoint = source.slice(start, end);

    expect(endpoint).toContain("const safeLimit");
    expect(endpoint).toContain("const safeOffset");
    expect(endpoint).toContain("LIMIT ${safeLimit} OFFSET ${safeOffset}");
    expect(endpoint).not.toContain("LIMIT ? OFFSET ?");
  });

  it("aplica a mesma proteção à paginação da lista de tarefas", () => {
    const start = source.indexOf('rtarefas.get("/", requireAuth');
    const end = source.indexOf('rtarefas.post("/", requireAuth', start);
    const endpoint = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(endpoint).toContain("const safeLimit");
    expect(endpoint).toContain("const safeOffset");
    expect(endpoint).toContain("LIMIT ${safeLimit} OFFSET ${safeOffset}");
    expect(endpoint).not.toContain("LIMIT ? OFFSET ?");
  });
});
