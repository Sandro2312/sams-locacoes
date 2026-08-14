import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(new URL("./crm-juridico.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const clientSource = readFileSync(new URL("../client/public/crm/js/crm-juridico-peticionamento.js", import.meta.url), "utf8");
const documentsClientSource = readFileSync(new URL("../client/public/crm/js/crm-juridico-documentos.js", import.meta.url), "utf8");

describe("Peticionamento Assistido e IA jurídica", () => {
  it("persiste peças, revisões, análises e autorização de IA sem alterar processos existentes", () => {
    expect(schemaSource).toContain('iaAutorizada: int("ia_autorizada").notNull().default(0)');
    expect(schemaSource).toContain('crmProcessosJuridicosPecas = mysqlTable("crm_processos_juridicos_pecas"');
    expect(schemaSource).toContain('crmProcessosJuridicosPecasVersoes = mysqlTable("crm_processos_juridicos_pecas_versoes"');
    expect(schemaSource).toContain('crmProcessosJuridicosIaAnalises = mysqlTable("crm_processos_juridicos_ia_analises"');
    expect(schemaSource).toContain('uniqueIndex("crm_pecas_versoes_peca_versao_unique")');
  });

  it("mantém o protocolo fora do CRM e exige revisão/checklist antes da aprovação", () => {
    expect(serverSource).toContain('r.post("/processos/:id/pecas/:pecaId/aprovar", requireLegalAccess');
    expect(serverSource).toContain('confirmacaoRevisao !== true');
    expect(serverSource).toContain('Conclua o checklist antes de aprovar a peça.');
    expect(serverSource).toContain('Peça aprovada para protocolo manual no portal oficial.');
    expect(serverSource).toContain('RECORD_MANUAL_FILING');
    expect(clientSource).toContain('assine e protocole somente no portal oficial');
    expect(clientSource).toContain('não realiza protocolo automático');
  });

  it("protege as funções de IA por autorização, sigilo, limites, fontes e auditoria", () => {
    expect(serverSource).toContain('requireProcessAiAuthorization');
    expect(serverSource).toContain('canAccessProcessDocuments');
    expect(serverSource).toContain('consumeLegalAiLimit');
    expect(serverSource).toContain('r.post("/processos/:id/ia/resumir-documento", requireLegalAccess');
    expect(serverSource).toContain('r.post("/processos/:id/ia/cronologia", requireLegalAccess');
    expect(serverSource).toContain('AI_DOCUMENT_SUMMARY');
    expect(serverSource).toContain('AI_PROCESS_TIMELINE');
    expect(serverSource).toContain('response_format');
    expect(clientSource).toContain('Revise todas as datas e atos antes de usar.');
  });

  it("organiza o dossiê por categoria e tags, inclusive no upload contextual", () => {
    expect(schemaSource).toContain('categoriaDossie: varchar("categoria_dossie", { length: 60 })');
    expect(schemaSource).toContain('tagsDossie: text("tags_dossie")');
    expect(serverSource).toContain('r.patch("/processos/:id/documentos/:vinculoId/organizacao", requireLegalAccess');
    expect(serverSource).toContain('ORGANIZE_DOCUMENT');
    expect(clientSource).toContain('Dossiê do processo');
    expect(clientSource).toContain('Salvar organização');
    expect(documentsClientSource).toContain('categoriaDossie');
    expect(documentsClientSource).toContain('tagsDossie');
  });

  it("traz UI mobile de rascunhos, versões, checklist, aprovação, dossiê e IA", () => {
    expect(clientSource).toContain('Peticionamento Assistido');
    expect(clientSource).toContain('Checklist de protocolo');
    expect(clientSource).toContain('Histórico de versões');
    expect(clientSource).toContain('Assistência por IA');
    expect(clientSource).toContain('Gerar cronologia');
    expect(clientSource).toContain('grid-cols-1');
    expect(clientSource).toContain('sm:flex-row');
  });
});
