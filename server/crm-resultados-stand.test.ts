import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const api = readFileSync(resolve(root, "server/crm-resultados-stand.ts"), "utf8");
const crm = readFileSync(resolve(root, "server/crm.ts"), "utf8");
const ui = readFileSync(resolve(root, "client/public/crm/js/crm-resultados-stand.js"), "utf8");
const navigation = readFileSync(resolve(root, "client/public/crm/js/navigation.js"), "utf8");
const index = readFileSync(resolve(root, "client/public/crm/index.html"), "utf8");
const closing = readFileSync(resolve(root, "client/public/crm/js/crm-projetos-stand-fechamento.js"), "utf8");

describe("Resultado por Stand a partir de lotes confirmados", () => {
  it("registra uma rota financeira protegida e somente de leitura", () => {
    expect(crm).toContain('import { registerResultadosStandRoutes } from "./crm-resultados-stand"');
    expect(crm).toContain("registerResultadosStandRoutes(app)");
    expect(api).toContain('app.use("/api/crm/financeiro/resultados-stand", r)');
    expect(api).toContain('r.get("/", requireFinance');
    expect(api).not.toMatch(/r\.(post|put|delete)\(/);
  });

  it("considera apenas lotes confirmados e ignora lançamentos cancelados", () => {
    expect(api).toContain("l.status = 'confirmado'");
    expect(api).toContain("LOWER(TRIM(COALESCE(status, ''))) <> 'cancelado'");
    expect(api).toContain("crm_lotes_financeiros_stand");
    expect(api).toContain("crm_contas_receber");
    expect(api).toContain("crm_transacoes");
    expect(api).toContain("GROUP BY l.cliente_id, l.evento_id, l.centro_custo");
  });

  it("mantém Projeto de Stand e rateios como detalhes opcionais controlados", () => {
    expect(api).toContain("crm_projetos_stand");
    expect(api).toContain("projetos_correspondentes = 1");
    expect(api).toContain("rateios: { disponivel: false");
    expect(ui).toContain("Detalhes avançados");
    expect(ui).toContain("Rateios não incluídos nesta etapa.");
  });

  it("apresenta filtros e visualização responsiva sem depender do módulo de Projetos", () => {
    expect(navigation).toContain("window.ResultadosStandModule?.render?.()");
    expect(ui).toContain("data-resultados-stand-filter");
    expect(ui).toContain("hidden overflow-x-auto");
    expect(ui).toContain("space-y-3 md:hidden");
    expect(index).toContain('/crm/js/crm-resultados-stand.js?v=1788359400');
    expect(closing).toContain("window.ResultadosStandModule?.load?.()");
  });
});
