import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./crm-juridico.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../client/public/crm/js/crm-juridico.js", import.meta.url), "utf8");

describe("módulo Jurídico persistente", () => {
  it("mantém classificação obrigatória e não leva a chave Datajud ao navegador", () => {
    expect(source).toContain('const RAMOS = new Set(["trabalhista", "civel"])');
    expect(source).toContain('requireLegalAccess');
    expect(source).toContain('process.env.DATAJUD_API_KEY');
    expect(client).not.toContain('DATAJUD_API_KEY');
  });

  it("exige número CNJ completo e registra a consulta para revisão", () => {
    expect(source).toContain('numero.length !== 20');
    expect(source).toContain('crm_processos_juridicos_consultas');
    expect(client).toContain('Revise antes de atualizar o cadastro');
  });

  it("oferece processos, prazos e visualização responsiva", () => {
    expect(client).toContain('Processos Jurídicos');
    expect(client).toContain('Agenda Jurídica');
    expect(client).toContain('Trabalhista');
    expect(client).toContain('Cível');
  });
});
