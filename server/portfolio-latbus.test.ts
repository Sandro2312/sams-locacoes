import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const portfolioPath = resolve(process.cwd(), "client/src/components/PortfolioSection.tsx");
const portfolioSource = readFileSync(portfolioPath, "utf8");

describe("projeto Perto S.A. na LAT.BUS 2026", () => {
  it("mantém o projeto no portfólio como referência de cliente e feira, sem mídia não autorizada", () => {
    expect(portfolioSource).toContain('titulo: "Stand Perto S.A. — LAT.BUS 2026"');
    expect(portfolioSource).toContain('cliente: "Perto S.A."');
    expect(portfolioSource).toContain('evento: "LAT.BUS 2026 — São Paulo Expo, São Paulo/SP"');
    expect(portfolioSource).toMatch(/cliente: "Perto S\.A\.",[\s\S]*?imagem: null,[\s\S]*?video: null,[\s\S]*?galeria: \[\]/);
  });

  it("não exibe ícone de vídeo ou clique para projetos sem mídia", () => {
    expect(portfolioSource).toContain("const temMidia = Boolean(projeto.imagem || projeto.video || projeto.galeria.length > 0);");
    expect(portfolioSource).toContain('onClick={temMidia ? () => abrirProjeto(projeto) : undefined}');
    expect(portfolioSource).toContain("Portfólio SAMS");
    expect(portfolioSource).toContain("Montagem de stand");
    expect(portfolioSource).toContain("Imagens em breve");
  });
});
