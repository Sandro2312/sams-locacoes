import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database and notification
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null), // no DB in tests
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const validOrcamento = {
  nome: "João Silva",
  empresa: "Empresa ABC",
  cargo: "Gerente de Marketing",
  whatsapp: "51999887766",
  email: "joao@empresa.com",
  tipoEvento: "Feira de Negócios",
  nomeEvento: "Expo Sul 2025",
  dataEvento: "2025-06-15",
  localEvento: "Fiergs",
  cidadeEvento: "Porto Alegre",
  estadoEvento: "RS",
  tipoStand: "personalizado",
  metragem: "21 – 36 m²",
  altura: "4m",
  formato: "ilha",
  servicosAdicionais: ["sonorizacao", "led"],
  descricaoMarca: "Marca moderna, cores azul e branco",
  referenciasVisuais: "https://exemplo.com/ref",
  orcamentoPrevisto: "R$ 25.000 – R$ 50.000",
  observacoes: "Precisamos de sala de reunião no stand",
};

describe("orcamento.enviar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve aceitar um orçamento completo e retornar sucesso", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orcamento.enviar(validOrcamento);
    expect(result).toEqual({ success: true });
  });

  it("deve aceitar orçamento com campos opcionais vazios", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const minimal = {
      nome: "Maria Santos",
      empresa: "Empresa XYZ",
      whatsapp: "11988776655",
      email: "maria@xyz.com",
      tipoEvento: "Congresso / Conferência",
      cidadeEvento: "São Paulo",
      estadoEvento: "SP",
      tipoStand: "modular",
      metragem: "Até 9 m²",
    };
    const result = await caller.orcamento.enviar(minimal);
    expect(result).toEqual({ success: true });
  });

  it("deve rejeitar orçamento sem nome", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.orcamento.enviar({ ...validOrcamento, nome: "" })
    ).rejects.toThrow();
  });

  it("deve rejeitar orçamento sem empresa", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.orcamento.enviar({ ...validOrcamento, empresa: "" })
    ).rejects.toThrow();
  });

  it("deve rejeitar orçamento com e-mail inválido", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.orcamento.enviar({ ...validOrcamento, email: "email-invalido" })
    ).rejects.toThrow();
  });

  it("deve rejeitar orçamento sem metragem", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.orcamento.enviar({ ...validOrcamento, metragem: "" })
    ).rejects.toThrow();
  });
});

describe("orcamento.listar", () => {
  it("deve retornar array vazio quando não há banco de dados", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orcamento.listar();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
