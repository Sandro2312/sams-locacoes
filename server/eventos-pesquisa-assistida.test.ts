import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deriveEventFieldsFromSources } from "./crm";

const root = resolve(__dirname, "..");
const server = readFileSync(resolve(root, "server/crm.ts"), "utf8");
const forms = readFileSync(resolve(root, "client/public/crm/js/forms.js"), "utf8");
const index = readFileSync(resolve(root, "client/public/crm/index.html"), "utf8");

describe("Pesquisa assistida de eventos", () => {
  it("protege, limita, audita e usa fallback de busca pública de evento", () => {
    expect(server).toContain('r.post("/eventos/pesquisar", requireCrmAuth');
    expect(server).toContain('consumeRateLimit(`evento-pesquisa:${u.userId}`, 12');
    expect(server).toContain('async function searchPublicEventSources');
    expect(server).toContain('https://www.bing.com/search');
    expect(server).toContain('const fontesEncontradas');
    expect(server).toContain('const sourcesByUrl = new Map<string, EventoPesquisaFonte>()');
    expect(server).toContain('existing.trecho = `${existing.trecho} ${source.trecho}`');
    expect(server).toContain('class="b_lineclamp\\d');
    expect(server).toContain('.replace(/\\s+/g, "").replace(/[›>].*$/, "")');
    expect(server).toContain('event_search');
  });

  it("extrai somente das evidências, não solicita taxas e normaliza apenas datas ISO", () => {
    expect(server).toContain('Nunca invente datas, organizadora, local, endereço ou taxas');
    expect(server).toContain('Use EXCLUSIVAMENTE os trechos de fontes públicas');
    expect(server).toContain('const isoDate =');
    expect(server).toContain('fontes');
  });

  it("usa extração determinística quando a IA retorna somente o resumo", () => {
    expect(server).toContain('function deriveEventFieldsFromSources');
    expect(server).toContain('const derived = deriveEventFieldsFromSources(fontesEncontradas)');
    expect(server).toContain('dataInicio: isoDate(parsed.dataInicio) || derived.dataInicio');
    expect(server).toContain('local: text(parsed.local, 180) || text(derived.local, 180)');
  });

  it("extrai datas, local e realizadora de um trecho público do CONGREGARH", () => {
    const derived = deriveEventFieldsFromSources([{
      titulo: "CONGREGARH 2026 · Quem imagina o futuro?",
      url: "https://congregarh.com.br/",
      trecho: "O evento será realizado nos dias 30 de setembro, 1 e 2 de outubro de 2026, no Centro de Eventos da PUCRS, em Porto Alegre/RS. Realizado pela ABRH-RS.",
    }]);
    expect(derived.dataInicio).toBe("2026-09-30");
    expect(derived.dataFim).toBe("2026-10-02");
    expect(derived.local).toContain("Centro de Eventos da PUCRS");
    expect(derived.organizadora).toBe("ABRH-RS");
  });

  it("exibe carregamento, pré-visualização confirmável e fontes sem preencher antes da revisão", () => {
    expect(forms).toContain('data-evento-pesquisa="1"');
    expect(forms).toContain("const setIfEmpty");
    expect(forms).toContain('data-evento-pesquisa-aplicar');
    expect(forms).toContain('background:#047857!important');
    expect(forms).toContain('data-evento-pesquisa-descartar');
    expect(forms).toContain('Pré-visualização dos dados encontrados');
    expect(forms).toContain('fa-circle-notch fa-spin');
    expect(forms).toContain("pendingSuggestion = suggestion");
    expect(forms).toContain("applySuggestion(pendingSuggestion)");
    expect(forms).toContain('name="site"');
    expect(forms).toContain('name="descricao"');
    expect(forms).toContain('/api/crm/eventos/pesquisar');
  });

  it("retorna e persiste site e descrição sem preencher taxas", () => {
    expect(server).toContain('site: { type: "string", description: "URL oficial do evento ou vazia" }');
    expect(server).toContain('descricao: { type: "string", description: "Descrição curta confirmada pelas fontes ou vazia" }');
    expect(server).toContain('INSERT INTO crm_eventos (nome, organizadora, local, endereco, site, descricao');
    expect(server).toContain('const site = choose(existing.site, "site")');
    expect(server).toContain('const descricao = choose(existing.descricao, "descricao")');
  });

  it("distribui o formulário atualizado", () => {
    expect(index).toContain('/crm/js/forms.js?v=1787339800');
  });
});
