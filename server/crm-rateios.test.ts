import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const migrationTables = readFileSync(resolve(root, "drizzle/0006_flowery_shooting_star.sql"), "utf8");
const migrationIntegrity = readFileSync(resolve(root, "drizzle/0007_mysterious_scourge.sql"), "utf8");
const rateiosSource = readFileSync(resolve(root, "server/crm-rateios.ts"), "utf8");
const standsSource = readFileSync(resolve(root, "server/crm-projetos-stand.ts"), "utf8");
const rateiosUiSource = readFileSync(resolve(root, "client/public/crm/js/crm-rateios.js"), "utf8");
const navigationSource = readFileSync(resolve(root, "client/public/crm/js/navigation.js"), "utf8");

describe("Rateios auditáveis de custos compartilhados", () => {
  it("cria um livro de alocações separado sem atualizar a transação de origem", () => {
    expect(migrationTables).toContain("CREATE TABLE `crm_rateio_regras`");
    expect(migrationTables).toContain("CREATE TABLE `crm_rateio_alocacoes`");
    expect(migrationTables).not.toMatch(/UPDATE\s+crm_transacoes/i);
    expect(migrationIntegrity).toContain("crm_rateio_regras_transacao_unique");
    expect(migrationIntegrity).toContain("crm_rateio_alocacoes_regra_projeto_unique");
  });

  it("exige despesa de evento sem stand e valida todos os destinatários no mesmo evento", () => {
    expect(rateiosSource).toContain("t.evento_id IS NOT NULL");
    expect(rateiosSource).toContain("t.projeto_stand_id IS NULL");
    expect(rateiosSource).toContain("Todos os Projetos de Stand selecionados devem pertencer ao mesmo evento da despesa");
    expect(rateiosSource).toContain("FOR UPDATE");
    expect(rateiosSource).toContain("beginTransaction");
  });

  it("mantém a soma do rateio em centavos e audita criação e desfazimento", () => {
    expect(rateiosSource).toContain("function splitCents");
    expect(rateiosSource).toContain("totalCents - parts.reduce");
    expect(rateiosSource).toContain('await audit(user, "CREATE"');
    expect(rateiosSource).toContain('await audit(user, "DELETE"');
    expect(rateiosSource).toContain("DELETE FROM crm_rateio_alocacoes");
    expect(rateiosSource).not.toMatch(/UPDATE\s+crm_transacoes/i);
  });

  it("separa custo direto de custo rateado no Resultado por Stand", () => {
    expect(standsSource).toContain("AS custos_rateados");
    expect(standsSource).toContain("margem_apos_rateio");
    expect(rateiosUiSource).toContain("Rateio de Custos Compartilhados");
    expect(rateiosUiSource).toContain("A despesa de origem não será alterada");
    expect(navigationSource).toContain("rateios: { name: 'Rateios'");
  });
});
