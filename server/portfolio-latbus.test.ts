import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const portfolioPath = resolve(process.cwd(), "client/src/components/PortfolioSection.tsx");
const portfolioSource = readFileSync(portfolioPath, "utf8");

describe("projeto Perto S.A. na LAT.BUS 2026", () => {
  it("mantém o projeto no portfólio com cliente, evento e ativo contextual", () => {
    expect(portfolioSource).toContain('titulo: "Stand Perto S.A. — LAT.BUS 2026"');
    expect(portfolioSource).toContain('cliente: "Perto S.A."');
    expect(portfolioSource).toContain('evento: "LAT.BUS 2026 — São Paulo Expo, São Paulo/SP"');
    expect(portfolioSource).toContain('/manus-storage/latbus-2026-identidade-visual_65ae3a1b.webp');
  });

  it("identifica a imagem como contextual e preserva a fonte oficial do evento", () => {
    expect(portfolioSource).toContain("Imagem de apoio da identidade visual pública da LAT.BUS 2026");
    expect(portfolioSource).toContain('fonteEvento: "https://www.latbus2026.com.br/"');
    expect(portfolioSource).toContain("Informações oficiais da LAT.BUS 2026");
  });
});
