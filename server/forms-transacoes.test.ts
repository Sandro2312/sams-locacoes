import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const formsPath = path.resolve(process.cwd(), "client/public/crm/js/forms.js");

describe("FormSystem — persistência de transações", () => {
  const source = fs.readFileSync(formsPath, "utf8");
  const transactionBlockStart = source.indexOf("const postTransacao = async (item) =>");
  const transactionBlockEnd = source.indexOf("} else if (module === 'clientes')", transactionBlockStart);
  const transactionBlock = source.slice(transactionBlockStart, transactionBlockEnd);

  it("não usa fallback local que simula sucesso quando o POST falha", () => {
    expect(transactionBlockStart).toBeGreaterThanOrEqual(0);
    expect(transactionBlockEnd).toBeGreaterThan(transactionBlockStart);
    expect(transactionBlock).not.toContain("_localOnly: true");
    expect(transactionBlock).toContain("return { id: null, ok: false");
  });

  it("distingue sucesso real, falha total e falha parcial nas parcelas recorrentes", () => {
    expect(transactionBlock).toContain("return { id: json.id, ok: true }");
    expect(transactionBlock).toContain("let parcelasOk = 0");
    expect(transactionBlock).toContain("let parcelasFalha = 0");
    expect(transactionBlock).toContain("else if (parcelasOk === 0)");
    expect(transactionBlock).toContain("return null; // NÃO fechar o modal");
    expect(transactionBlock).toContain("Verifique e relance as parcelas faltantes.");
  });
});
