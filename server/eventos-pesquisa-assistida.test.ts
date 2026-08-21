import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
    expect(server).toContain('.replace(/\\s+/g, "").replace(/[›>].*$/, "")');
    expect(server).toContain('event_search');
  });

  it("extrai somente das evidências, não solicita taxas e normaliza apenas datas ISO", () => {
    expect(server).toContain('Nunca invente datas, organizadora, local, endereço ou taxas');
    expect(server).toContain('Use EXCLUSIVAMENTE os trechos de fontes públicas');
    expect(server).toContain('const isoDate =');
    expect(server).toContain('fontes');
  });

  it("preenche apenas campos vazios e mostra a revisão e as fontes", () => {
    expect(forms).toContain('data-evento-pesquisa="1"');
    expect(forms).toContain("const setIfEmpty");
    expect(forms).toContain('Taxas não são preenchidas automaticamente.');
    expect(forms).toContain('Revise tudo antes de salvar.');
    expect(forms).toContain('/api/crm/eventos/pesquisar');
  });

  it("distribui o formulário atualizado", () => {
    expect(index).toContain('/crm/js/forms.js?v=1787323600');
  });
});
