import { useState, useEffect } from "react";
import { X, MessageCircle, ChevronRight } from "lucide-react";

const WHATSAPP_NUMBER = "5551998827054";
const POPUP_DELAY_MS = 30000; // 30 segundos
const STORAGE_KEY = "sams_lead_popup_dismissed";

export default function LeadPopup() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Não mostrar se já foi dispensado nesta sessão
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      sessionStorage.setItem(STORAGE_KEY, "true");
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const message = encodeURIComponent(
      `Olá! Me chamo *${name}* e gostaria de solicitar um orçamento para montagem de stand. Meu telefone é *${phone}*.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
    setSubmitted(true);
    setTimeout(() => {
      handleClose();
    }, 2500);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return value;
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`fixed z-[101] bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md w-full transition-all duration-300 ${
          closing
            ? "opacity-0 translate-y-8 sm:translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        <div className="bg-[#0a0f1e] border border-[#c9a84c]/30 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
          {/* Header com gradiente dourado */}
          <div className="relative bg-gradient-to-r from-[#0a0f1e] via-[#1a2340] to-[#0a0f1e] px-6 pt-6 pb-4 border-b border-[#c9a84c]/20">
            {/* Linha dourada decorativa */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center">
                <MessageCircle size={20} className="text-[#c9a84c]" />
              </div>
              <div>
                <p className="text-[#c9a84c] text-xs font-semibold uppercase tracking-widest">
                  Orçamento Gratuito
                </p>
                <h2 className="text-white text-lg font-bold leading-tight">
                  Monte seu stand dos sonhos
                </h2>
              </div>
            </div>
            <p className="text-white/50 text-sm mt-2">
              Fale agora com nossos especialistas e receba uma proposta personalizada em minutos.
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {submitted ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg">Redirecionando para o WhatsApp...</p>
                <p className="text-white/50 text-sm mt-1">Aguarde um instante!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-1 uppercase tracking-wide">
                    Seu nome
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c9a84c]/60 focus:bg-white/8 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-1 uppercase tracking-wide">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(51) 99999-9999"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c9a84c]/60 focus:bg-white/8 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mt-1"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Solicitar Orçamento Grátis
                  <ChevronRight size={16} />
                </button>

                <p className="text-center text-white/30 text-xs">
                  Sem compromisso · Resposta em até 2 horas
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
