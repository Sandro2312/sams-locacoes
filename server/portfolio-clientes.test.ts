import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const parceiros = fs.readFileSync(path.join(root, "client/src/components/ParceirosSection.tsx"), "utf8");
const portfolio = fs.readFileSync(path.join(root, "client/src/components/PortfolioSection.tsx"), "utf8");

describe("Site público — clientes e vídeo do portfólio", () => {
  it("destaca Calçados Beira Rio e inclui Reebok no carrossel", () => {
    expect(parceiros).toContain('nome: "Calçados Beira Rio"');
    expect(parceiros).toContain('logo: "/manus-storage/calcados-beira-rio-oficial_826615a3.png"');
    expect(parceiros).toContain('nome: "Reebok"');
    expect(parceiros).toContain('logo: "/manus-storage/reebok-logo_381daf8c.png"');
    expect(parceiros).toContain("Cliente VIP");
  });

  it("inclui as sete marcas adicionais autorizadas no carrossel", () => {
    const marcas = [
      "Perto S.A.",
      "Siry Global",
      "Popper",
      "BiQ Adesivos",
      "Grupo Stickfran",
      "Aromasil",
      "AlcaFoods",
    ];
    marcas.forEach((marca) => expect(parceiros).toContain(`nome: "${marca}"`));
    expect(parceiros).toContain('logo: "/manus-storage/perto-logo_29321379.svg"');
    expect(parceiros).toContain('logo: "/manus-storage/siry-global-logo_8f7d7d46.webp"');
    expect(parceiros).toContain('logo: "/manus-storage/biq-adesivos-logo_40137aa8.png"');
    expect(parceiros).toContain('logo: "/manus-storage/aromasil-logo_26990b0e.webp"');
  });

  it("publica o case Reebok com player inline e sem autoplay com áudio", () => {
    expect(portfolio).toContain('titulo: "Stand Reebok — Fitness Brasil"');
    expect(portfolio).toContain('video: "/manus-storage/stand-reebok-fitness-brasil_bacb670c.mp4"');
    expect(portfolio).toContain('playsInline');
    expect(portfolio).not.toContain('                    autoPlay');
  });
});
