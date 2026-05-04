import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database and notification modules
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("contato.enviar", () => {
  it("deve aceitar dados válidos de contato", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contato.enviar({
      nome: "João Silva",
      empresa: "Empresa Teste",
      whatsapp: "(11) 99999-9999",
      email: "joao@teste.com",
      tipoEvento: "Feira Comercial",
      metragem: "Até 20m²",
      mensagem: "Gostaria de um orçamento para meu stand.",
    });

    expect(result).toEqual({ success: true });
  });

  it("deve aceitar contato sem campos opcionais", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contato.enviar({
      nome: "Maria Santos",
      whatsapp: "(21) 88888-8888",
      email: "maria@empresa.com",
    });

    expect(result).toEqual({ success: true });
  });

  it("deve rejeitar email inválido", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contato.enviar({
        nome: "Teste",
        whatsapp: "(11) 99999-9999",
        email: "email-invalido",
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar nome vazio", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contato.enviar({
        nome: "",
        whatsapp: "(11) 99999-9999",
        email: "teste@email.com",
      })
    ).rejects.toThrow();
  });
});

describe("contato.listar", () => {
  it("deve retornar lista vazia quando banco não disponível", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contato.listar();
    expect(Array.isArray(result)).toBe(true);
  });
});
