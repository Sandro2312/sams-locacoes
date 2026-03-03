import { useState, useEffect } from "react";
import { Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/sams-logo_9fc7a984.jpg";

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre", href: "#sobre" },
  { label: "Serviços", href: "#servicos" },
  { label: "Portfólio", href: "#portfolio" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "Contato", href: "#contato" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[oklch(0.18_0.07_240)/97] backdrop-blur-md shadow-xl border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            href="#inicio"
            onClick={(e) => { e.preventDefault(); handleNavClick("#inicio"); }}
            className="flex items-center gap-3 group"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[oklch(0.75_0.14_75)] shadow-lg group-hover:border-[oklch(0.85_0.10_78)] transition-all duration-300">
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
              <p className="text-[oklch(0.75_0.14_75)] font-heading text-xs tracking-[0.2em] uppercase">
                Locações
              </p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                className="px-4 py-2 text-white/80 hover:text-[oklch(0.75_0.14_75)] font-heading text-sm font-medium tracking-wide transition-all duration-200 relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[oklch(0.75_0.14_75)] group-hover:w-full transition-all duration-300 rounded-full" />
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="https://wa.me/5551998827054?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20para%20montagem%20de%20stand."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[oklch(0.75_0.14_75)] hover:bg-[oklch(0.82_0.12_78)] text-[oklch(0.12_0.02_240)] font-heading font-semibold text-sm px-5 py-2.5 rounded-sm tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Phone size={15} />
              Solicitar Orçamento
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-white hover:text-[oklch(0.75_0.14_75)] transition-colors"
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
        <div className="bg-[oklch(0.16_0.08_240)] border-t border-white/10 px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
              className="block px-4 py-3 text-white/80 hover:text-[oklch(0.75_0.14_75)] hover:bg-white/5 font-heading text-sm font-medium tracking-wide rounded-sm transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-white/10">
            <a
              href="https://wa.me/5551998827054?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20para%20montagem%20de%20stand."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[oklch(0.75_0.14_75)] hover:bg-[oklch(0.82_0.12_78)] text-[oklch(0.12_0.02_240)] font-heading font-semibold text-sm px-5 py-3 rounded-sm tracking-wide transition-all duration-300"
            >
              <Phone size={15} />
              Solicitar Orçamento
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
