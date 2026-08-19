import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeLeadEmail, normalizeLeadPhone } from "./lead-capture";

const routerSource = readFileSync(resolve(__dirname, "./routers.ts"), "utf8");
const captureSource = readFileSync(resolve(__dirname, "./lead-capture.ts"), "utf8");
const adminSource = readFileSync(resolve(__dirname, "./crm-admin.ts"), "utf8");
const kanbanSource = readFileSync(resolve(__dirname, "../client/public/crm/js/kanban.js"), "utf8");

describe("Captação do site para Leads e Kanban", () => {
  it("normaliza identificadores usados na deduplicação", () => {
    expect(normalizeLeadEmail("  CONTATO@Exemplo.com ")).toBe("contato@exemplo.com");
    expect(normalizeLeadPhone("(51) 9 9988-2705")).toBe("51999882705");
  });

  it("preserva metragens por faixa na descrição sem forçar valor numérico impreciso", () => {
    expect(captureSource).toContain("function parseExactArea");
    expect(captureSource).toContain("const standAreaNumeric = parseExactArea(standArea);");
    expect(captureSource).toContain("standAreaNumeric, owner?.id || null");
  });

  it("cria uma única tarefa aberta de captação por lead dentro de transação", () => {
    expect(captureSource).toContain("await conn.beginTransaction()");
    expect(captureSource).toContain("modulo = 'captacao_site' AND referencia_id = ?");
    expect(captureSource).toContain("status NOT IN ('concluida', 'cancelada')");
    expect(captureSource).toContain("await conn.commit()");
    expect(captureSource).toContain("await conn.rollback()");
  });

  it("aciona a captação nos dois formulários públicos sem substituir seus registros originais", () => {
    expect(routerSource).toContain("source: input.origemCaptacao");
    expect(routerSource).toContain('default("site_contato")');
    expect(routerSource).toContain('source: "site_orcamento"');
    expect(routerSource).toContain("await db.insert(contatos).values");
    expect(routerSource).toContain("await db.insert(orcamentos).values");
  });

  it("identifica uma conversão pelo blog e cria tarefa comercial rastreável", () => {
    expect(routerSource).toContain('z.enum(["site_contato", "blog_artigo"])');
    expect(captureSource).toContain('"blog_artigo"');
    expect(captureSource).toContain("Formulário contextual de artigo no blog");
    expect(captureSource).toContain('"Lead do Blog"');
  });

  it("preserva movimentos de cards por atualização parcial e importa tarefas de captação", () => {
    expect(adminSource).toContain("const normalizeTaskStatus");
    expect(adminSource).toContain("const current = await dbOne<any>(\"SELECT * FROM crm_tarefas WHERE id=?\"");
    expect(kanbanSource).toContain("async syncServerTasks(options = {})");
    expect(kanbanSource).toContain("async syncCapturedLeadTasks()");
    expect(kanbanSource).toContain("origem === 'captacao_site'");
  });

  it("normaliza o contrato snake_case da API de tarefas para a Agenda do responsável", () => {
    const modulesSource = readFileSync(resolve(__dirname, "../client/public/crm/js/modules.js"), "utf8");
    expect(modulesSource).toContain("t.responsavelId != null ? t.responsavelId : t.responsavel_id");
    expect(modulesSource).toContain("t.responsavel != null ? t.responsavel : t.responsavel_nome");
    expect(modulesSource).toContain("t.data_vencimento || t.prazo");
  });

  it("expõe o detalhe autenticado da tarefa para a ação Abrir da Agenda", () => {
    expect(adminSource).toContain('rtarefas.get("/:id", requireAuth');
    expect(adminSource).toContain("WHERE t.id=?");
    expect(adminSource).toContain("Tarefa não encontrada");
  });
});
