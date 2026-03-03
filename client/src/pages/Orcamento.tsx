import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User, Building2, Phone, Mail, MapPin, Calendar, Ruler,
  CheckCircle2, ChevronRight, ChevronLeft, Send, Loader2,
  Volume2, Leaf, Tv, Monitor, Layers, Wrench, Star, ArrowLeft
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663116701243/YqfJkXFtpDqUvVsMHfnp8h/sams-logo_9fc7a984.jpg";

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const orcamentoSchema = z.object({
  // Etapa 1 - Dados Pessoais
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  empresa: z.string().min(1, "Nome da empresa é obrigatório"),
  cargo: z.string().optional().default(""),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  email: z.string().email("E-mail inválido"),

  // Etapa 2 - Evento
  tipoEvento: z.string().min(1, "Selecione o tipo de evento"),
  nomeEvento: z.string().optional().default(""),
  dataEvento: z.string().optional().default(""),
  localEvento: z.string().optional().default(""),
  cidadeEvento: z.string().min(1, "Cidade é obrigatória"),
  estadoEvento: z.string().min(1, "Estado é obrigatório"),

  // Etapa 3 - Stand
  tipoStand: z.string().min(1, "Selecione o tipo de stand"),
  metragem: z.string().min(1, "Metragem é obrigatória"),
  altura: z.string().optional().default(""),
  formato: z.string().optional().default(""),

  // Etapa 4 - Serviços Adicionais
  servicosAdicionais: z.array(z.string()).optional().default([]),

  // Etapa 5 - Detalhes
  descricaoMarca: z.string().optional().default(""),
  referenciasVisuais: z.string().optional().default(""),
  orcamentoPrevisto: z.string().optional().default(""),
  observacoes: z.string().optional().default(""),
});

type OrcamentoForm = z.infer<typeof orcamentoSchema>;

// ─── Constantes ───────────────────────────────────────────────────────────────
const tiposEvento = [
  "Feira de Negócios", "Exposição", "Congresso / Conferência",
  "Evento Corporativo", "Lançamento de Produto", "Convenção",
  "Festival", "Outro"
];

const tiposStand = [
  { value: "personalizado", label: "Stand Personalizado", desc: "Projeto exclusivo para sua marca" },
  { value: "modular", label: "Stand Modular", desc: "Flexível e reutilizável" },
  { value: "hibrido", label: "Stand Híbrido", desc: "Combinação de personalizado e modular" },
  { value: "cenografia", label: "Cenografia Especial", desc: "Para eventos e ativações" },
];

const faixasMetragem = [
  "Até 9 m²", "10 – 20 m²", "21 – 36 m²", "37 – 50 m²",
  "51 – 100 m²", "Acima de 100 m²"
];

const faixasOrcamento = [
  "Até R$ 10.000", "R$ 10.000 – R$ 25.000", "R$ 25.000 – R$ 50.000",
  "R$ 50.000 – R$ 100.000", "Acima de R$ 100.000", "A definir"
];

const servicosExtras = [
  { id: "sonorizacao", icon: Volume2, label: "Sonorização", desc: "Equipamentos de áudio profissional" },
  { id: "paisagismo", icon: Leaf, label: "Paisagismo", desc: "Plantas e ambientação verde" },
  { id: "tvs", icon: Tv, label: "Locação de TVs", desc: "Monitores e displays" },
  { id: "led", icon: Monitor, label: "Painéis de LED", desc: "Painéis e totens LED" },
  { id: "iluminacao", icon: Star, label: "Iluminação Especial", desc: "Projeto de iluminação cênica" },
  { id: "mobiliario", icon: Layers, label: "Mobiliário", desc: "Móveis e decoração" },
  { id: "instalacao", icon: Wrench, label: "Montagem Completa", desc: "Equipe de montagem dedicada" },
];

const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const STEPS = [
  { id: 1, label: "Dados Pessoais", icon: User },
  { id: 2, label: "Evento", icon: Calendar },
  { id: 3, label: "Stand", icon: Ruler },
  { id: 4, label: "Serviços", icon: Layers },
  { id: 5, label: "Detalhes", icon: Star },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Orcamento() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, trigger, getValues, setValue, watch } =
    useForm<OrcamentoForm>({
      resolver: zodResolver(orcamentoSchema) as any,
      defaultValues: {
        servicosAdicionais: [],
      }
    });

  const enviarOrcamento = trpc.orcamento.enviar.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: unknown) => {
      toast.error("Erro ao enviar orçamento. Tente novamente.");
      console.error(err);
    },
  });

  const stepFields: Record<number, (keyof OrcamentoForm)[]> = {
    1: ["nome", "empresa", "whatsapp", "email"],
    2: ["tipoEvento", "cidadeEvento", "estadoEvento"],
    3: ["tipoStand", "metragem"],
    4: [],
    5: [],
  };

  const handleNext = async () => {
    const fields = stepFields[currentStep];
    const valid = await trigger(fields);
    if (valid) setCurrentStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const toggleService = (id: string) => {
    const updated = selectedServices.includes(id)
      ? selectedServices.filter((s) => s !== id)
      : [...selectedServices, id];
    setSelectedServices(updated);
    setValue("servicosAdicionais", updated);
  };

  const onSubmit = (data: OrcamentoForm) => {
    enviarOrcamento.mutate({ ...data, servicosAdicionais: selectedServices });
  };

  // ─── Success Screen ────────────────────────────────────────────────────────
  if (submitted) {
    const values = getValues();
    return (
      <div className="min-h-screen bg-[oklch(0.98_0.003_240)] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full text-center"
        >
          <div className="w-24 h-24 rounded-full bg-[oklch(0.75_0.14_75)/15] border-2 border-[oklch(0.75_0.14_75)] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-[oklch(0.65_0.14_75)]" />
          </div>
          <h2 className="font-display text-3xl font-bold text-[oklch(0.18_0.07_240)] mb-3">
            Orçamento Enviado!
          </h2>
          <p className="text-[oklch(0.45_0.04_240)] font-sans text-lg mb-2">
            Obrigado, <strong>{values.nome}</strong>!
          </p>
          <p className="text-[oklch(0.50_0.04_240)] font-sans mb-8 leading-relaxed">
            Recebemos sua solicitação de orçamento. Nossa equipe entrará em contato em até <strong>24 horas</strong> pelo WhatsApp <strong>{values.whatsapp}</strong> ou e-mail <strong>{values.email}</strong>.
          </p>
          <div className="bg-[oklch(0.75_0.14_75)/10] border border-[oklch(0.75_0.14_75)/30] rounded-lg p-4 mb-8 text-left space-y-2">
            <p className="text-sm font-heading font-semibold text-[oklch(0.35_0.05_240)] uppercase tracking-wide mb-3">Resumo do Pedido</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[oklch(0.55_0.04_240)]">Empresa:</span>
              <span className="font-medium text-[oklch(0.25_0.05_240)]">{values.empresa}</span>
              <span className="text-[oklch(0.55_0.04_240)]">Tipo de Evento:</span>
              <span className="font-medium text-[oklch(0.25_0.05_240)]">{values.tipoEvento}</span>
              <span className="text-[oklch(0.55_0.04_240)]">Tipo de Stand:</span>
              <span className="font-medium text-[oklch(0.25_0.05_240)]">{values.tipoStand}</span>
              <span className="text-[oklch(0.55_0.04_240)]">Metragem:</span>
              <span className="font-medium text-[oklch(0.25_0.05_240)]">{values.metragem}</span>
              <span className="text-[oklch(0.55_0.04_240)]">Local:</span>
              <span className="font-medium text-[oklch(0.25_0.05_240)]">{values.cidadeEvento}/{values.estadoEvento}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/5551998827054?text=Olá!%20Acabei%20de%20enviar%20um%20orçamento%20pelo%20site."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[oklch(0.55_0.18_145)] hover:bg-[oklch(0.50_0.18_145)] text-white font-heading font-semibold px-6 py-3 rounded-sm transition-all duration-300"
            >
              Falar no WhatsApp
            </a>
            <Link href="/">
              <a className="flex items-center justify-center gap-2 border border-[oklch(0.75_0.14_75)] text-[oklch(0.45_0.08_240)] hover:bg-[oklch(0.75_0.14_75)/10] font-heading font-semibold px-6 py-3 rounded-sm transition-all duration-300">
                <ArrowLeft size={16} />
                Voltar ao Site
              </a>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.003_240)]">
      {/* Header */}
      <header className="bg-[oklch(0.18_0.07_240)] border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <a className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-[oklch(0.75_0.14_75)/50]">
                  <img src={LOGO_URL} alt="SAMS Locações" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white font-heading font-bold text-sm leading-tight">SAMS</p>
                  <p className="text-[oklch(0.75_0.14_75)] font-heading text-xs tracking-widest uppercase">Locações</p>
                </div>
              </a>
            </Link>
            <Link href="/">
              <a className="flex items-center gap-2 text-white/60 hover:text-[oklch(0.75_0.14_75)] font-heading text-sm transition-colors">
                <ArrowLeft size={16} />
                Voltar ao site
              </a>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[oklch(0.18_0.07_240)] to-[oklch(0.22_0.06_240)] py-10 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 border border-[oklch(0.75_0.14_75)/40] bg-[oklch(0.75_0.14_75)/10] text-[oklch(0.85_0.10_78)] px-4 py-1.5 rounded-full text-xs font-heading font-semibold tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.75_0.14_75)] animate-pulse" />
            Orçamento Gratuito
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
            Solicite seu <span className="text-[oklch(0.75_0.14_75)]">Orçamento</span>
          </h1>
          <p className="text-white/60 font-sans text-base max-w-xl mx-auto">
            Preencha o formulário abaixo e nossa equipe entrará em contato em até 24 horas com uma proposta personalizada.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-[oklch(0.90_0.01_240)] sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 max-w-5xl py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isDone = step.id < currentStep;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isDone
                        ? "bg-[oklch(0.75_0.14_75)] border-[oklch(0.75_0.14_75)] text-[oklch(0.12_0.02_240)]"
                        : isActive
                        ? "bg-[oklch(0.18_0.07_240)] border-[oklch(0.18_0.07_240)] text-white"
                        : "bg-white border-[oklch(0.85_0.01_240)] text-[oklch(0.65_0.03_240)]"
                    }`}>
                      {isDone ? <CheckCircle2 size={18} /> : <step.icon size={16} />}
                    </div>
                    <span className={`text-xs font-heading font-medium hidden sm:block transition-colors ${
                      isActive ? "text-[oklch(0.18_0.07_240)]" : isDone ? "text-[oklch(0.55_0.10_75)]" : "text-[oklch(0.65_0.03_240)]"
                    }`}>{step.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${
                      step.id < currentStep ? "bg-[oklch(0.75_0.14_75)]" : "bg-[oklch(0.90_0.01_240)]"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 max-w-3xl py-10">
        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* ── ETAPA 1: Dados Pessoais ── */}
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <StepCard title="Seus Dados" subtitle="Informações de contato para enviarmos a proposta">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Nome Completo *" icon={<User size={16} />} error={errors.nome?.message}>
                      <input {...register("nome")} placeholder="Seu nome completo" className={inputClass(!!errors.nome)} />
                    </FormField>
                    <FormField label="Empresa *" icon={<Building2 size={16} />} error={errors.empresa?.message}>
                      <input {...register("empresa")} placeholder="Nome da empresa" className={inputClass(!!errors.empresa)} />
                    </FormField>
                    <FormField label="Cargo / Função" icon={<User size={16} />}>
                      <input {...register("cargo")} placeholder="Ex: Gerente de Marketing" className={inputClass(false)} />
                    </FormField>
                    <FormField label="WhatsApp *" icon={<Phone size={16} />} error={errors.whatsapp?.message}>
                      <input {...register("whatsapp")} placeholder="(51) 99999-9999" className={inputClass(!!errors.whatsapp)} />
                    </FormField>
                    <FormField label="E-mail *" icon={<Mail size={16} />} error={errors.email?.message} className="sm:col-span-2">
                      <input {...register("email")} type="email" placeholder="seu@email.com.br" className={inputClass(!!errors.email)} />
                    </FormField>
                  </div>
                </StepCard>
              </motion.div>
            )}

            {/* ── ETAPA 2: Evento ── */}
            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <StepCard title="Sobre o Evento" subtitle="Nos conte mais sobre o evento que você está planejando">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Tipo de Evento *" icon={<Calendar size={16} />} error={errors.tipoEvento?.message} className="sm:col-span-2">
                      <select {...register("tipoEvento")} className={inputClass(!!errors.tipoEvento)}>
                        <option value="">Selecione o tipo de evento</option>
                        {tiposEvento.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Nome do Evento" icon={<Calendar size={16} />} className="sm:col-span-2">
                      <input {...register("nomeEvento")} placeholder="Ex: Expo Negócios 2025" className={inputClass(false)} />
                    </FormField>
                    <FormField label="Data do Evento" icon={<Calendar size={16} />}>
                      <input {...register("dataEvento")} type="date" className={inputClass(false)} />
                    </FormField>
                    <FormField label="Local / Pavilhão" icon={<MapPin size={16} />}>
                      <input {...register("localEvento")} placeholder="Ex: Expo Center Norte" className={inputClass(false)} />
                    </FormField>
                    <FormField label="Cidade *" icon={<MapPin size={16} />} error={errors.cidadeEvento?.message}>
                      <input {...register("cidadeEvento")} placeholder="Cidade do evento" className={inputClass(!!errors.cidadeEvento)} />
                    </FormField>
                    <FormField label="Estado *" icon={<MapPin size={16} />} error={errors.estadoEvento?.message}>
                      <select {...register("estadoEvento")} className={inputClass(!!errors.estadoEvento)}>
                        <option value="">UF</option>
                        {estados.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </FormField>
                  </div>
                </StepCard>
              </motion.div>
            )}

            {/* ── ETAPA 3: Stand ── */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <StepCard title="Especificações do Stand" subtitle="Detalhes técnicos do stand que você precisa">
                  <div className="space-y-6">
                    {/* Tipo de Stand */}
                    <div>
                      <label className="block text-sm font-heading font-semibold text-[oklch(0.35_0.05_240)] mb-3">
                        Tipo de Stand *
                      </label>
                      {errors.tipoStand && <p className="text-red-500 text-xs mb-2">{errors.tipoStand.message}</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {tiposStand.map((t) => {
                          const val = getValues("tipoStand");
                          return (
                            <label
                              key={t.value}
                              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                val === t.value
                                  ? "border-[oklch(0.75_0.14_75)] bg-[oklch(0.75_0.14_75)/8]"
                                  : "border-[oklch(0.88_0.01_240)] hover:border-[oklch(0.75_0.14_75)/50]"
                              }`}
                            >
                              <input type="radio" {...register("tipoStand")} value={t.value} className="mt-0.5 accent-[oklch(0.65_0.14_75)]" />
                              <div>
                                <p className="font-heading font-semibold text-[oklch(0.25_0.05_240)] text-sm">{t.label}</p>
                                <p className="text-[oklch(0.55_0.03_240)] text-xs mt-0.5">{t.desc}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Metragem */}
                    <div>
                      <label className="block text-sm font-heading font-semibold text-[oklch(0.35_0.05_240)] mb-3">
                        Metragem Aproximada *
                      </label>
                      {errors.metragem && <p className="text-red-500 text-xs mb-2">{errors.metragem.message}</p>}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {faixasMetragem.map((m) => {
                          const val = getValues("metragem");
                          return (
                            <label
                              key={m}
                              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer text-sm font-heading font-medium transition-all duration-200 ${
                                val === m
                                  ? "border-[oklch(0.75_0.14_75)] bg-[oklch(0.75_0.14_75)/10] text-[oklch(0.35_0.08_75)]"
                                  : "border-[oklch(0.88_0.01_240)] text-[oklch(0.45_0.03_240)] hover:border-[oklch(0.75_0.14_75)/50]"
                              }`}
                            >
                              <input type="radio" {...register("metragem")} value={m} className="sr-only" />
                              {m}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Altura e Formato */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FormField label="Altura do Stand" icon={<Ruler size={16} />}>
                        <input {...register("altura")} placeholder="Ex: 3m, 4m, 5m" className={inputClass(false)} />
                      </FormField>
                      <FormField label="Formato / Posição" icon={<Layers size={16} />}>
                        <select {...register("formato")} className={inputClass(false)}>
                          <option value="">Selecione</option>
                          <option value="ilha">Ilha (4 frentes abertas)</option>
                          <option value="peninsula">Península (3 frentes abertas)</option>
                          <option value="linear">Linear (1 frente aberta)</option>
                          <option value="esquina">Esquina (2 frentes abertas)</option>
                          <option value="nao_sei">Não sei ainda</option>
                        </select>
                      </FormField>
                    </div>
                  </div>
                </StepCard>
              </motion.div>
            )}

            {/* ── ETAPA 4: Serviços Adicionais ── */}
            {currentStep === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <StepCard title="Serviços Adicionais" subtitle="Selecione os serviços extras que deseja incluir no orçamento (opcional)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {servicosExtras.map((s) => {
                      const isSelected = selectedServices.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleService(s.id)}
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                            isSelected
                              ? "border-[oklch(0.75_0.14_75)] bg-[oklch(0.75_0.14_75)/10]"
                              : "border-[oklch(0.88_0.01_240)] hover:border-[oklch(0.75_0.14_75)/50] bg-white"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? "bg-[oklch(0.75_0.14_75)] text-[oklch(0.12_0.02_240)]" : "bg-[oklch(0.95_0.01_240)] text-[oklch(0.45_0.05_240)]"
                          }`}>
                            <s.icon size={20} />
                          </div>
                          <div>
                            <p className={`font-heading font-semibold text-sm ${isSelected ? "text-[oklch(0.30_0.08_75)]" : "text-[oklch(0.25_0.05_240)]"}`}>
                              {s.label}
                            </p>
                            <p className="text-[oklch(0.55_0.03_240)] text-xs mt-0.5">{s.desc}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 size={20} className="ml-auto text-[oklch(0.65_0.14_75)] flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="mt-4 p-3 bg-[oklch(0.75_0.14_75)/8] border border-[oklch(0.75_0.14_75)/30] rounded-lg">
                      <p className="text-sm font-heading font-medium text-[oklch(0.40_0.08_75)]">
                        {selectedServices.length} serviço{selectedServices.length > 1 ? "s" : ""} selecionado{selectedServices.length > 1 ? "s" : ""}:{" "}
                        {selectedServices.map(id => servicosExtras.find(s => s.id === id)?.label).join(", ")}
                      </p>
                    </div>
                  )}
                </StepCard>
              </motion.div>
            )}

            {/* ── ETAPA 5: Detalhes Finais ── */}
            {currentStep === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                <StepCard title="Detalhes Finais" subtitle="Informações adicionais para personalizarmos sua proposta">
                  <div className="space-y-5">
                    <FormField label="Orçamento Previsto" icon={<Star size={16} />}>
                      <select {...register("orcamentoPrevisto")} className={inputClass(false)}>
                        <option value="">Selecione uma faixa (opcional)</option>
                        {faixasOrcamento.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Descrição da Marca / Identidade Visual">
                      <textarea
                        {...register("descricaoMarca")}
                        rows={3}
                        placeholder="Descreva as cores, estilo e identidade da sua marca..."
                        className={`${inputClass(false)} resize-none`}
                      />
                    </FormField>
                    <FormField label="Referências Visuais">
                      <textarea
                        {...register("referenciasVisuais")}
                        rows={3}
                        placeholder="Links de imagens, stands que você gostou, estilo desejado..."
                        className={`${inputClass(false)} resize-none`}
                      />
                    </FormField>
                    <FormField label="Observações Adicionais">
                      <textarea
                        {...register("observacoes")}
                        rows={4}
                        placeholder="Qualquer informação adicional que possa nos ajudar a preparar a melhor proposta..."
                        className={`${inputClass(false)} resize-none`}
                      />
                    </FormField>

                    {/* Resumo */}
                    <div className="bg-[oklch(0.18_0.07_240)] rounded-lg p-5 text-white">
                      <p className="font-heading font-semibold text-[oklch(0.75_0.14_75)] text-sm uppercase tracking-wide mb-3">Resumo do Pedido</p>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-white/60">Empresa:</span>
                        <span className="font-medium">{getValues("empresa") || "—"}</span>
                        <span className="text-white/60">Evento:</span>
                        <span className="font-medium">{getValues("tipoEvento") || "—"}</span>
                        <span className="text-white/60">Stand:</span>
                        <span className="font-medium">{getValues("tipoStand") || "—"}</span>
                        <span className="text-white/60">Metragem:</span>
                        <span className="font-medium">{getValues("metragem") || "—"}</span>
                        <span className="text-white/60">Local:</span>
                        <span className="font-medium">{getValues("cidadeEvento") || "—"}/{getValues("estadoEvento") || "—"}</span>
                        {selectedServices.length > 0 && (
                          <>
                            <span className="text-white/60">Serviços extras:</span>
                            <span className="font-medium">{selectedServices.length} selecionado{selectedServices.length > 1 ? "s" : ""}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </StepCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-sm font-heading font-semibold text-sm transition-all duration-200 ${
                currentStep === 1
                  ? "opacity-0 pointer-events-none"
                  : "border border-[oklch(0.80_0.02_240)] text-[oklch(0.40_0.05_240)] hover:border-[oklch(0.65_0.14_75)] hover:text-[oklch(0.40_0.08_75)]"
              }`}
            >
              <ChevronLeft size={18} />
              Voltar
            </button>

            <div className="flex items-center gap-2">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-full transition-all duration-300 ${
                    s.id === currentStep ? "w-6 h-2 bg-[oklch(0.65_0.14_75)]" :
                    s.id < currentStep ? "w-2 h-2 bg-[oklch(0.75_0.14_75)]" :
                    "w-2 h-2 bg-[oklch(0.85_0.01_240)]"
                  }`}
                />
              ))}
            </div>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 bg-[oklch(0.18_0.07_240)] hover:bg-[oklch(0.22_0.07_240)] text-white font-heading font-semibold text-sm px-6 py-3 rounded-sm transition-all duration-200"
              >
                Próximo
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={enviarOrcamento.isPending}
                className="flex items-center gap-2 bg-[oklch(0.75_0.14_75)] hover:bg-[oklch(0.82_0.12_78)] text-[oklch(0.12_0.02_240)] font-heading font-bold text-sm px-8 py-3 rounded-sm transition-all duration-200 shadow-lg disabled:opacity-70"
              >
                {enviarOrcamento.isPending ? (
                  <><Loader2 size={18} className="animate-spin" /> Enviando...</>
                ) : (
                  <><Send size={18} /> Enviar Orçamento</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[oklch(0.90_0.01_240)] shadow-sm p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-[oklch(0.18_0.07_240)]">{title}</h2>
        <p className="text-[oklch(0.55_0.03_240)] font-sans text-sm mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function FormField({
  label, icon, error, children, className = ""
}: {
  label: string; icon?: React.ReactNode; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-heading font-semibold text-[oklch(0.35_0.05_240)] mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.60_0.04_240)] pointer-events-none">
            {icon}
          </div>
        )}
        <div className={icon ? "pl-9" : ""}>{children}</div>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-3 py-2.5 rounded-lg border text-sm font-sans text-[oklch(0.25_0.05_240)] bg-white placeholder:text-[oklch(0.70_0.02_240)] focus:outline-none focus:ring-2 transition-all duration-200 ${
    hasError
      ? "border-red-400 focus:ring-red-200"
      : "border-[oklch(0.85_0.01_240)] focus:border-[oklch(0.65_0.14_75)] focus:ring-[oklch(0.75_0.14_75)/20]"
  }`;
}
