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

  it("expõe autoria, filtros acessíveis e dados estruturados para os artigos", () => {
    expect(catalogo).toContain("Equipe técnica da SAMS Locações");
    expect(catalogo).toContain("Filtrar por categoria");
    expect(catalogo).toContain("aria-pressed");
    expect(catalogo).toContain('type="application/ld+json"');
    expect(conteudo).toContain('type="application/ld+json"');
    expect(conteudo).toContain("Conteúdo técnico revisado pela");
  });

  it("inclui a captura atribuída ao artigo e recomenda leituras relacionadas", () => {
    const leadFormPath = path.resolve(process.cwd(), "client/src/components/BlogLeadForm.tsx");
    const leadForm = fs.readFileSync(leadFormPath, "utf8");
    expect(conteudo).toContain("BlogLeadForm articleSlug={artigo.slug}");
    expect(conteudo).toContain("relatedArticles");
    expect(conteudo).toContain("Artigos relacionados");
    expect(leadForm).toContain('origemCaptacao: "blog_artigo"');
    expect(leadForm).toContain("utmCampaign: articleSlug");
  });
});
