import { useState, useEffect } from "react";
import { Menu, X, Phone } from "lucide-react";
import { useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/sams-logo_9fc7a984.jpg";

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre", href: "#sobre" },
  { label: "Serviços", href: "#servicos" },
  { label: "Portfólio", href: "#portfolio" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "Feiras 2026", href: "/feiras-2026" },
  { label: "Blog", href: "/blog" },
  { label: "Contato", href: "#contato" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location, navigate] = useLocation();

  // Verifica se está na página inicial
  const isHome = location === "/" || location === "";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);

    // Link de rota interna (ex: /blog, /feiras-2026)
    if (href.startsWith("/")) {
      navigate(href);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Link âncora: se estiver na Home, faz scroll suave
    if (isHome) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      // Se estiver em outra página, navega para Home com hash
      navigate("/");
      // Aguarda a Home renderizar e então rola até a seção
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 400);
    }
  };

  const goToOrcamento = () => {
    setIsOpen(false);
    navigate("/orcamento");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Navbar é sólida: nas subpáginas sempre, na Home só após scroll
  const isSolid = !isHome || scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isSolid
          ? "bg-[#0a1628] backdrop-blur-md shadow-xl border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button
            onClick={() => handleNavClick("#inicio")}
            className="flex items-center gap-3 group"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#c9a84c] shadow-lg group-hover:border-[oklch(0.85_0.10_78)] transition-all duration-300">
              <img
                src={LOGO_URL}
                alt="SAMS Locações"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-heading font-bold text-lg leading-tight tracking-wide">
                SAMS
              </p>
              <p className="text-[#c9a84c] font-heading text-xs tracking-[0.2em] uppercase">
                Locações
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                (link.href === "/blog" && location.startsWith("/blog")) ||
                (link.href === "/feiras-2026" && location === "/feiras-2026");
              return (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className={`px-4 py-2 font-heading text-sm font-medium tracking-wide transition-all duration-200 relative group ${
                    isActive
                      ? "text-[#c9a84c]"
                      : "text-white/80 hover:text-[#c9a84c]"
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#c9a84c] transition-all duration-300 rounded-full ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={goToOrcamento}
              className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8963d] text-[#0a1628] font-heading font-semibold text-sm px-5 py-2.5 rounded-sm tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Phone size={15} />
              Solicitar Orçamento
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-white hover:text-[#c9a84c] transition-colors"
            aria-label="Menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden transition-all duration-300 overflow-hidden ${
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#0a1628] border-t border-white/10 px-4 py-4 space-y-1">
          {navLinks.map((link) => {
            const isActive =
              (link.href === "/blog" && location.startsWith("/blog")) ||
              (link.href === "/feiras-2026" && location === "/feiras-2026");
            return (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`block w-full text-left px-4 py-3 hover:bg-white/5 font-heading text-sm font-medium tracking-wide rounded-sm transition-all duration-200 ${
                  isActive ? "text-[#c9a84c]" : "text-white/80 hover:text-[#c9a84c]"
                }`}
              >
                {link.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={goToOrcamento}
              className="flex items-center justify-center gap-2 w-full bg-[#c9a84c] hover:bg-[#b8963d] text-[#0a1628] font-heading font-semibold text-sm px-5 py-3 rounded-sm tracking-wide transition-all duration-300"
            >
              <Phone size={15} />
              Solicitar Orçamento
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
