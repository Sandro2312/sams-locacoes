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

  it("lista processos sem violar only_full_group_by no ambiente publicado", () => {
    expect(source).toContain('(SELECT COUNT(*) FROM crm_processos_juridicos_prazos pp');
    expect(source).not.toContain('GROUP BY p.id');
  });

  it("serializa recargas e mantém o formulário aberto para salvar processos sequenciais", () => {
    expect(client).toContain('processosRequestId');
    expect(client).not.toContain('AbortController');
    expect(client).toContain('Salvar e novo');
    expect(client).toContain("saveMode === 'continue'");
  });

  it("registra audiência como prazo com ação visível, classificação e proteção contra duplicidade", () => {
    expect(source).toContain('const PRAZO_TYPES = new Set(["audiencia", "prazo_processual", "intimacao", "reuniao", "outro"])');
    expect(source).toContain('CREATE_HEARING');
    expect(source).toContain('Esta audiência já está registrada como pendente neste processo.');
    expect(client).toContain('Registrar audiência ou prazo');
    expect(client).toContain('Registrar audiência');
    expect(client).toContain('prazoTypeLabel');
  });
});
