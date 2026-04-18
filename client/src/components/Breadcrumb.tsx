import { useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const [, navigate] = useLocation();

  const handleClick = (href?: string) => {
    if (!href) return;
    navigate(href);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-white/50 font-sans mb-6 flex-wrap"
    >
      {/* Ícone Home */}
      <button
        onClick={() => handleClick("/")}
        className="flex items-center gap-1 hover:text-[#c9a84c] transition-colors duration-200"
        aria-label="Início"
      >
        <Home size={13} />
        <span className="hidden sm:inline">Início</span>
      </button>

      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronRight size={13} className="text-white/30 flex-shrink-0" />
          {item.href && index < items.length - 1 ? (
            <button
              onClick={() => handleClick(item.href)}
              className="hover:text-[#c9a84c] transition-colors duration-200 whitespace-nowrap"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-white/80 font-medium truncate max-w-[200px] sm:max-w-xs" title={item.label}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
