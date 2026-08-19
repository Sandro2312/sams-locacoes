import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("rotas de artigos do blog", () => {
  const blogPath = path.resolve(process.cwd(), "client/src/pages/Blog.tsx");
  const articlePath = path.resolve(process.cwd(), "client/src/pages/BlogArtigo.tsx");
  const catalogo = fs.readFileSync(blogPath, "utf8");
  const conteudo = fs.readFileSync(articlePath, "utf8");
  const slugs = [...catalogo.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);

  it("mantém conteúdo individual para cada artigo exibido na listagem", () => {
    expect(slugs).toHaveLength(6);
    for (const slug of slugs) {
      expect(conteudo).toContain(`"${slug}": {`);
    }
  });

  it("preserva o CTA de orçamento na leitura individual", () => {
    expect(conteudo).toContain("Solicitar Orçamento Gratuito");
    expect(conteudo).toContain('navigate("/orcamento")');
  });
});
