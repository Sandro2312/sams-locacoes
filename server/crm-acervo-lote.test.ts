import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseGoogleDriveSharedLink } from "./crm-acervo";

const source = readFileSync(new URL("./crm-acervo.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../client/public/crm/js/acervo.js", import.meta.url), "utf8");

describe("importação em lote do Acervo por Google Drive", () => {
  it("normaliza links compartilhados de arquivo, pasta e Google Docs", () => {
    expect(parseGoogleDriveSharedLink("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing")).toEqual({
      resourceId: "1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
      resourceType: "arquivo",
      canonicalUrl: "https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
    });
    expect(parseGoogleDriveSharedLink("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz012345?usp=drive_link")).toEqual({
      resourceId: "1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
      resourceType: "pasta",
      canonicalUrl: "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
    });
    expect(parseGoogleDriveSharedLink("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/edit#gid=0")).toEqual({
      resourceId: "1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
      resourceType: "arquivo",
      canonicalUrl: "https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
    });
  });

  it("rejeita URLs não seguras ou fora do Google Drive", () => {
    expect(parseGoogleDriveSharedLink("http://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view")).toBeNull();
    expect(parseGoogleDriveSharedLink("https://example.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view")).toBeNull();
    expect(parseGoogleDriveSharedLink("https://drive.google.com/open?id=curto")).toBeNull();
  });

  it("mantém a API autenticada, limitada, transacional e auditável", () => {
    expect(source).toContain('r.post("/importar-lote", requireCrmAuth');
    expect(source).toContain("const MAX_IMPORT_LOTE = 50");
    expect(source).toContain("await connection.beginTransaction()");
    expect(source).toContain("await connection.rollback()");
    expect(source).toContain("await connection.commit()");
    expect(source).toContain('SELECT url_drive FROM crm_acervo WHERE url_drive IN');
    expect(source).toContain('"IMPORT_ACERVO_LOTE"');
    expect(source).toContain("parseGoogleDriveSharedLink(item.url_drive)");
  });

  it("exige prévia editável e confirmação antes de chamar a importação", () => {
    expect(client).toContain('id="acervo-btn-importar-lote"');
    expect(client).toContain('id="acervo-import-preview"');
    expect(client).toContain('data-acervo-import-field="nome"');
    expect(client).toContain('data-acervo-import-field="url_drive"');
    expect(client).toContain('Nenhum documento é criado antes da confirmação final.');
    expect(client).toContain('Importar ${itens.length} referência(s) do Google Drive no Acervo?');
    expect(client).toContain("this.api('POST', '/importar-lote'");
  });
});
