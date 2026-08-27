import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(process.cwd(), "server/crm.ts"), "utf8");

describe("CRM — consulta de Contas a Receber", () => {
  it("preserva os vínculos de cliente e evento após a migração da base restaurada", () => {
    const start = source.indexOf('r.get("/contas-receber", requireCrmAuth');
    const end = source.indexOf('r.post("/contas-receber", requireCrmAuth', start);
    const endpoint = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(endpoint).toContain("COALESCE(c.nome, '') as cliente_nome");
    expect(endpoint).toContain("COALESCE(e.nome, '') as evento_nome");
    expect(endpoint).toContain("LEFT JOIN crm_eventos e ON cr.evento_id = e.id");
  });
});
