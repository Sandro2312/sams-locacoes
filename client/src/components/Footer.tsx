import { Phone, Mail, MapPin, Instagram, ArrowUp } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/sams-logo_9fc7a984.jpg";

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre", href: "#sobre" },
  { label: "Serviços", href: "#servicos" },
  { label: "Portfólio", href: "#portfolio" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "Contato", href: "#contato" },
];

const servicos = [
  "Stands Personalizados",
  "Stands Modulares",
  "Stands Híbridos",
  "Cenografia para Eventos",
  "Locação de Stands",
  "Suporte Completo",
];

export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const handleNavClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-[oklch(0.12_0.07_240)] text-white">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[oklch(0.75_0.14_75)] to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[oklch(0.75_0.14_75)/50]">
                <img src={LOGO_URL} alt="SAMS Locações" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-heading font-bold text-lg text-white leading-tight">SAMS</p>
                <p className="font-heading text-xs tracking-[0.2em] uppercase text-[oklch(0.75_0.14_75)]">Locações</p>
              </div>
            </div>
            <p className="text-white/60 text-sm font-sans leading-relaxed mb-5">
              Especialistas em montagem de stands e cenografia para feiras e eventos corporativos. 
              Mais de 15 anos transformando espaços em experiências memoráveis.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/samslocacoesoficial"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-sm bg-white/10 hover:bg-[oklch(0.75_0.14_75)] flex items-center justify-center transition-colors duration-300 group"
                aria-label="Instagram"
              >
                <Instagram size={16} className="text-white/70 group-hover:text-[oklch(0.12_0.02_240)]" />
              </a>
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-sm bg-white/10 hover:bg-[#25D366] flex items-center justify-center transition-colors duration-300 group"
                aria-label="WhatsApp"
              >
                <svg className="w-4 h-4 text-white/70 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-heading font-bold text-sm tracking-[0.15em] uppercase text-[oklch(0.75_0.14_75)] mb-5">
              Navegação
            </h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                    className="text-white/60 hover:text-[oklch(0.85_0.10_78)] text-sm font-sans transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span className="w-0 h-px bg-[oklch(0.75_0.14_75)] group-hover:w-3 transition-all duration-300" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading font-bold text-sm tracking-[0.15em] uppercase text-[oklch(0.75_0.14_75)] mb-5">
              Serviços
            </h4>
            <ul className="space-y-2.5">
              {servicos.map((s) => (
                <li key={s}>
                  <a
                    href="#servicos"
                    onClick={(e) => { e.preventDefault(); handleNavClick("#servicos"); }}
                    className="text-white/60 hover:text-[oklch(0.85_0.10_78)] text-sm font-sans transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span className="w-0 h-px bg-[oklch(0.75_0.14_75)] group-hover:w-3 transition-all duration-300" />
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-bold text-sm tracking-[0.15em] uppercase text-[oklch(0.75_0.14_75)] mb-5">
              Contato
            </h4>
            <div className="space-y-4">
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 group"
              >
                <Phone size={15} className="text-[oklch(0.75_0.14_75)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/40 text-xs font-heading uppercase tracking-wide">WhatsApp</p>
                  <p className="text-white/70 group-hover:text-[oklch(0.85_0.10_78)] text-sm font-sans transition-colors">(11) 99999-9999</p>
                </div>
              </a>

              <a
                href="mailto:contato@samslocacoes.com.br"
                className="flex items-start gap-3 group"
              >
                <Mail size={15} className="text-[oklch(0.75_0.14_75)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/40 text-xs font-heading uppercase tracking-wide">E-mail</p>
                  <p className="text-white/70 group-hover:text-[oklch(0.85_0.10_78)] text-sm font-sans transition-colors">contato@samslocacoes.com.br</p>
                </div>
              </a>

              <div className="flex items-start gap-3">
                <MapPin size={15} className="text-[oklch(0.75_0.14_75)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/40 text-xs font-heading uppercase tracking-wide">Localização</p>
                  <p className="text-white/70 text-sm font-sans">São Paulo, SP</p>
                  <p className="text-white/40 text-xs font-sans">Atendimento em todo o Brasil</p>
                </div>
              </div>

              <a
                href="https://instagram.com/samslocacoesoficial"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 group"
              >
                <Instagram size={15} className="text-[oklch(0.75_0.14_75)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/40 text-xs font-heading uppercase tracking-wide">Instagram</p>
                  <p className="text-white/70 group-hover:text-[oklch(0.85_0.10_78)] text-sm font-sans transition-colors">@samslocacoesoficial</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-xs font-sans text-center sm:text-left">
            © {new Date().getFullYear()} SAMS Locações. Todos os direitos reservados.
          </p>
          <p className="text-white/30 text-xs font-sans">
            Especialistas em Stands & Cenografia para Eventos
          </p>
          <button
            onClick={scrollToTop}
            className="w-8 h-8 rounded-sm bg-white/10 hover:bg-[oklch(0.75_0.14_75)] flex items-center justify-center transition-colors duration-300 group"
            aria-label="Voltar ao topo"
          >
            <ArrowUp size={14} className="text-white/60 group-hover:text-[oklch(0.12_0.02_240)]" />
          </button>
        </div>
      </div>
    </footer>
  );
}
