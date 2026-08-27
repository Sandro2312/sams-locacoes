import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("Schema do Guia de Lançamentos", () => {
  const migrationBase = read("drizzle/0018_wakeful_human_torch.sql");
  const migrationDatas = read("drizzle/0019_famous_wrecker.sql");
  const migrationValores = read("drizzle/0020_special_slipstream.sql");
  const routes = read("server/crm-lotes-financeiros.ts");

  it("mantém versionadas as duas tabelas obrigatórias do lote financeiro", () => {
    expect(migrationBase).toContain("CREATE TABLE `crm_lotes_financeiros_stand`");
    expect(migrationBase).toContain("CREATE TABLE `crm_lotes_financeiros_stand_itens`");
    expect(migrationBase).toContain("`cliente_id` int NOT NULL");
    expect(migrationBase).toContain("`evento_id` int NOT NULL");
  });

  it("mantém os campos de parcelas exigidos pela rota de criação", () => {
    expect(migrationDatas).toContain("ADD `datas_vencimento` text");
    expect(migrationValores).toContain("ADD `valores_parcelas` text");
    expect(routes).toContain("crm_lotes_financeiros_stand");
    expect(routes).toContain("crm_lotes_financeiros_stand_itens");
  });
});
