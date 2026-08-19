import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./crm-juridico.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../client/public/crm/js/crm-juridico.js", import.meta.url), "utf8");
const hearingsClient = readFileSync(new URL("../client/public/crm/js/crm-juridico-audiencias.js", import.meta.url), "utf8");

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

  it("persiste local e link seguro na audiência", () => {
    expect(source).toContain('local_audiencia');
    expect(source).toContain('link_audiencia');
    expect(source).toContain('function audienceLink(value: unknown)');
    expect(source).toContain("['http:', 'https:'].includes(parsed.protocol)");
    expect(source).toContain('link de audiência válido');
    expect(source).toContain('error?.message?.includes("link de audiência válido") || error?.message?.includes("horário da audiência") ? 400 : 500');
  });

  it("vincula apenas PDF à audiência e preserva o documento no Acervo", () => {
    expect(source).toContain('r.post("/processos/:id/prazos/:prazoId/documentos"');
    expect(source).toContain('Anexe somente um arquivo PDF à audiência.');
    expect(source).toContain('crm_processos_juridicos_prazos_documentos');
    expect(source).toContain('ATTACH_HEARING_DOCUMENT');
    expect(source).toContain('ata_audiencia');
    expect(hearingsClient).toContain('accept="application/pdf,.pdf"');
    expect(hearingsClient).toContain('/prazos/${encodeURIComponent(saved.id)}/documentos');
  });

  it("calcula e comunica o alerta visual de audiência em até sete dias", () => {
    expect(source).toContain('AS audiencia_proxima');
    expect(source).toContain('INTERVAL 7 DAY');
    expect(hearingsClient).toContain('function isHearingSoon(value)');
    expect(hearingsClient).toContain('Audiência em até 7 dias');
    expect(hearingsClient).toContain('Em até 7 dias');
  });

  it("extrai dados de PDF de audiência somente com IA autorizada e revisão humana", () => {
    expect(source).toContain('r.post("/processos/:id/prazos/:prazoId/ia/extrair-audiencia"');
    expect(source).toContain('requireProcessAiAuthorization(processo, user)');
    expect(source).toContain('confirmacaoRevisao !== true');
    expect(source).toContain('ExtracaoDadosAudiencia');
    expect(source).toContain('AI_HEARING_EXTRACTION');
    expect(source).toContain('Não ofereça orientação jurídica');
    expect(hearingsClient).toContain('Extrair sugestões do PDF desta audiência?');
    expect(hearingsClient).toContain('Revisar dados extraídos');
  });

  it("aplica dados extraídos apenas após confirmação e mantém o próximo prazo coerente", () => {
    expect(source).toContain('r.patch("/processos/:id/prazos/:prazoId/audiencia-extraida"');
    expect(source).toContain('APPLY_HEARING_EXTRACTION');
    expect(source).toContain('MIN(data_prazo) FROM crm_processos_juridicos_prazos');
    expect(source).toContain('function audienceTime(value: unknown)');
    expect(source).toContain('hora_audiencia');
  });

  it("oferece calendário interativo e modal de leitura rápida do PDF no detalhe da audiência", () => {
    expect(hearingsClient).toContain('Calendário de audiências');
    expect(hearingsClient).toContain('data-audiencia-calendar-prev');
    expect(hearingsClient).toContain('data-audiencia-calendar-item');
    expect(hearingsClient).toContain('juridico-preview-audiencia-pdf-modal');
    expect(hearingsClient).toContain('Leitura rápida do documento contextual');
    expect(hearingsClient).toContain('data-audiencia-preview-pdf');
  });
});
