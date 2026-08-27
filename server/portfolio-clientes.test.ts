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

  it("publica o case Reebok com player inline e sem autoplay com áudio", () => {
    expect(portfolio).toContain('titulo: "Stand Reebok — Fitness Brasil"');
    expect(portfolio).toContain('video: "/manus-storage/stand-reebok-fitness-brasil_bacb670c.mp4"');
    expect(portfolio).toContain('playsInline');
    expect(portfolio).not.toContain('                    autoPlay');
  });
});
