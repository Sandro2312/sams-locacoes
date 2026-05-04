import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";

const feiras = [
  {
    nome: "FIMEC",
    descricao: "Feira Internacional de Tecnologia para Calçados, Artefatos e Componentes",
    local: "Novo Hamburgo, RS",
    data: "Março 2026",
    segmento: "Calçados e Couro",
    status: "realizada",
    slug: "fimec-2026",
  },
  {
    nome: "FEIPLAR",
    descricao: "Feira e Congresso Internacionais de Plásticos",
    local: "São Paulo, SP",
    data: "Maio 2026",
    segmento: "Plásticos e Polímeros",
    status: "proxima",
    slug: "feiplar-2026",
  },
  {
    nome: "FISPAL FOOD SERVICE",
    descricao: "Maior Feira de Alimentação Fora do Lar da América Latina",
    local: "São Paulo, SP",
    data: "Junho 2026",
    segmento: "Alimentação e Gastronomia",
    status: "proxima",
    slug: "fispal-food-service-2026",
  },
  {
    nome: "AGRISHOW",
    descricao: "Feira Internacional de Tecnologia Agrícola em Ação",
    local: "Ribeirão Preto, SP",
    data: "Junho 2026",
    segmento: "Agronegócio",
    status: "proxima",
    slug: "agrishow-2026",
  },
  {
    nome: "EXPODIRETO",
    descricao: "Maior Feira de Tecnologia Agropecuária do Sul do Brasil",
    local: "Não-Me-Toque, RS",
    data: "Julho 2026",
    segmento: "Agronegócio",
    status: "proxima",
    slug: "expodireto-2026",
  },
  {
    nome: "FENAC",
    descricao: "Feira Nacional de Negócios do Calçado",
    local: "Novo Hamburgo, RS",
    data: "Julho 2026",
    segmento: "Calçados e Moda",
    status: "proxima",
    slug: "fenac-2026",
  },
  {
    nome: "MERCOPAR",
    descricao: "Feira Internacional de Subcontratação Industrial",
    local: "Caxias do Sul, RS",
    data: "Agosto 2026",
    segmento: "Indústria e Manufatura",
    status: "proxima",
    slug: "mercopar-2026",
  },
  {
    nome: "FEIMEC",
    descricao: "Feira Internacional de Máquinas e Equipamentos",
    local: "São Paulo, SP",
    data: "Agosto 2026",
    segmento: "Máquinas e Equipamentos",
    status: "proxima",
    slug: "feimec-2026",
  },
  {
    nome: "AUTOMEC",
    descricao: "Salão Internacional de Autopeças, Equipamentos e Serviços",
    local: "São Paulo, SP",
    data: "Agosto 2026",
    segmento: "Automotivo",
    status: "proxima",
    slug: "automec-2026",
  },
  {
    nome: "INTERMODAL",
    descricao: "Maior Evento de Logística, Transporte de Cargas e Comércio Exterior da América Latina",
    local: "São Paulo, SP",
    data: "Setembro 2026",
    segmento: "Logística e Transporte",
    status: "proxima",
    slug: "intermodal-2026",
  },
  {
    nome: "EXPOAGAS",
    descricao: "Maior Feira de Supermercados do Sul do Brasil",
    local: "Porto Alegre, RS",
    data: "Outubro 2026",
    segmento: "Supermercados e Varejo",
    status: "proxima",
    slug: "expoagas-2026",
  },
];

export default function Feiras2026() {
  const realizadas = feiras.filter((f) => f.status === "realizada");
  const proximas = feiras.filter((f) => f.status === "proxima");
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Helmet>
        <title>Feiras 2026 — SAMS Locações | Montagem de Stands nas Principais Feiras do Brasil</title>
        <meta
          name="description"
          content="SAMS Locações estará presente nas 11 principais feiras do Brasil em 2026: FEIPLAR, FISPAL, AGRISHOW, EXPODIRETO, FENAC, MERCOPAR, FEIMEC, AUTOMEC, INTERMODAL e EXPOAGAS. Solicite seu orçamento."
        />
        <link rel="canonical" href="https://samslocacoes.com.br/feiras-2026" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Feiras 2026 — SAMS Locações",
          "description": "Calendário de feiras onde a SAMS Locações realiza montagem de stands em 2026",
          "numberOfItems": feiras.length,
          "itemListElement": feiras.map((f, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": f.nome,
            "description": f.descricao,
          })),
        })}</script>
      </Helmet>

      {/* Hero — padding-top compensa a Navbar fixa (h-20 = 80px) */}
      <section className="relative bg-[#0a1628] text-white pt-36 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb + Voltar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <Breadcrumb items={[{ label: "Feiras 2026" }]} />
            <button
              onClick={() => { navigate("/"); window.scrollTo({ top: 0 }); }}
              className="inline-flex items-center gap-2 text-white/50 hover:text-[#c9a84c] text-sm font-medium transition-colors duration-200 group self-start sm:self-auto"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar ao Início
            </button>
          </div>
          <div className="text-center">
          <span className="inline-block bg-[#c9a84c]/20 text-[#c9a84c] text-sm font-semibold tracking-widest uppercase px-4 py-1 rounded-full mb-4">
            Agenda Oficial
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-['Cormorant_Garamond'] mb-4">
            Feiras 2026 — <span className="text-[#c9a84c] italic">SAMS Locações</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Estamos confirmados nas <strong className="text-white">11 principais feiras do Brasil</strong> em 2026.
            Montagem de stands personalizados, modulares e híbridos em todo o território nacional.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button
              onClick={() => { navigate("/orcamento"); window.scrollTo({ top: 0 }); }}
              className="bg-[#c9a84c] hover:bg-[#b8963d] text-[#0a1628] font-bold px-8 py-3 rounded transition-colors"
            >
              Solicitar Orçamento
            </button>
            <a
              href="https://wa.me/5551998827054?text=Olá! Gostaria de solicitar um orçamento para montagem de stand."
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c]/10 font-bold px-8 py-3 rounded transition-colors"
            >
              WhatsApp
            </a>
          </div>
          </div>{/* end text-center */}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#c9a84c] py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 text-center text-[#0a1628]">
          <div>
            <div className="text-3xl font-bold font-['Cormorant_Garamond']">11</div>
            <div className="text-sm font-semibold">Feiras em 2026</div>
          </div>
          <div>
            <div className="text-3xl font-bold font-['Cormorant_Garamond']">7</div>
            <div className="text-sm font-semibold">Estados Atendidos</div>
          </div>
          <div>
            <div className="text-3xl font-bold font-['Cormorant_Garamond']">15+</div>
            <div className="text-sm font-semibold">Anos de Experiência</div>
          </div>
        </div>
      </section>

      {/* Feiras Realizadas */}
      {realizadas.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold font-['Cormorant_Garamond'] text-[#0a1628] mb-8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              Feiras Realizadas
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {realizadas.map((feira) => (
                <div key={feira.slug} className="border border-green-200 bg-green-50 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-[#0a1628]">{feira.nome}</h3>
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded font-semibold">Realizada ✓</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{feira.descricao}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="text-gray-500">📍 {feira.local}</span>
                    <span className="text-gray-500">📅 {feira.data}</span>
                    <span className="bg-[#0a1628]/10 text-[#0a1628] px-2 py-0.5 rounded text-xs">{feira.segmento}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Próximas Feiras */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold font-['Cormorant_Garamond'] text-[#0a1628] mb-2 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#c9a84c] inline-block"></span>
            Próximas Feiras
          </h2>
          <p className="text-gray-500 mb-8 text-sm">
            Sua empresa vai participar de alguma dessas feiras? Entre em contato e solicite um orçamento sem compromisso.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {proximas.map((feira) => (
              <article key={feira.slug} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#c9a84c] transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-[#0a1628]">{feira.nome}</h3>
                  <span className="text-xs bg-[#c9a84c]/20 text-[#c9a84c] px-2 py-1 rounded font-semibold">{feira.data}</span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{feira.descricao}</p>
                <div className="flex flex-wrap gap-3 text-sm mb-4">
                  <span className="text-gray-500">📍 {feira.local}</span>
                  <span className="bg-[#0a1628]/10 text-[#0a1628] px-2 py-0.5 rounded text-xs">{feira.segmento}</span>
                </div>
                <a
                  href={`https://wa.me/5551998827054?text=Olá! Gostaria de solicitar um orçamento para montagem de stand na ${feira.nome} 2026.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#c9a84c] font-semibold hover:underline"
                >
                  Solicitar orçamento para esta feira →
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-[#0a1628] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-['Cormorant_Garamond'] mb-4">
            Sua empresa vai participar de alguma dessas feiras?
          </h2>
          <p className="text-white/70 mb-8">
            A SAMS Locações oferece montagem de stands personalizados, modulares e híbridos com mais de 15 anos de experiência.
            Atendemos em todo o Brasil com equipe especializada e dedicação total ao seu projeto.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => { navigate("/orcamento"); window.scrollTo({ top: 0 }); }}
              className="bg-[#c9a84c] hover:bg-[#b8963d] text-[#0a1628] font-bold px-8 py-3 rounded transition-colors"
            >
              Solicitar Orçamento Gratuito
            </button>
            <a
              href="tel:+5551998827054"
              className="border border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3 rounded transition-colors"
            >
              (51) 99882-7054
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
