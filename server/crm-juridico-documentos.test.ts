import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(new URL("./crm-juridico.ts", import.meta.url), "utf8");
const clientSource = readFileSync(new URL("../client/public/crm/js/crm-juridico-documentos.js", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

describe("documentos de processos jurídicos", () => {
  it("persiste um vínculo auditável sem alterar a estrutura do documento no Acervo", () => {
    expect(schemaSource).toContain('crmProcessosJuridicosDocumentos = mysqlTable("crm_processos_juridicos_documentos"');
    expect(schemaSource).toContain('uniqueIndex("crm_processos_documentos_processo_acervo_unique")');
    expect(serverSource).toContain('INSERT INTO crm_processos_juridicos_documentos');
    expect(serverSource).toContain('"ATTACH_DOCUMENT"');
    expect(serverSource).toContain('"DETACH_DOCUMENT"');
  });

  it("impõe autenticação jurídica, tipos permitidos e limite de 25 MB", () => {
    expect(serverSource).toContain('r.post("/processos/:id/documentos", requireLegalAccess, legalUploadMiddleware');
    expect(serverSource).toContain('fileSize: 25 * 1024 * 1024');
    expect(serverSource).toContain('DOCUMENT_CLASSIFICATIONS');
    expect(serverSource).toContain('canAccessProcessDocuments');
    expect(clientSource).toContain('const MAX_FILE_BYTES = 25 * 1024 * 1024');
    expect(clientSource).toContain('Tipo de arquivo não permitido.');
  });

  it("entrega uma interface contextual com listagem, anexo e desvinculação sem apagar o Acervo", () => {
    expect(serverSource).toContain('FROM crm_processos_juridicos_documentos d JOIN crm_acervo a');
    expect(serverSource).toContain('O registro original foi preservado no Acervo.');
    expect(clientSource).toContain('Documentos do processo');
    expect(clientSource).toContain('Anexar documento');
    expect(clientSource).toContain('Desvincular');
    expect(clientSource).toContain('O arquivo continuará preservado no Acervo.');
  });
});
