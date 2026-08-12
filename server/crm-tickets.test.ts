import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const serverSource = fs.readFileSync(path.resolve(process.cwd(), "server/crm-tickets.ts"), "utf8");
const authSource = fs.readFileSync(path.resolve(process.cwd(), "client/public/crm/js/auth.js"), "utf8");
const permissionsSource = fs.readFileSync(path.resolve(process.cwd(), "client/public/crm/js/permissions.js"), "utf8");
const navigationSource = fs.readFileSync(path.resolve(process.cwd(), "client/public/crm/js/navigation.js"), "utf8");
const ticketUiSource = fs.readFileSync(path.resolve(process.cwd(), "client/public/crm/js/crm-tickets.js"), "utf8");
const loginHtml = fs.readFileSync(path.resolve(process.cwd(), "client/public/crm/index.html"), "utf8");

describe("CRM Tickets — segurança e navegação", () => {
  it("restringe a triagem de tickets ao perfil Desenvolvedor", () => {
    expect(serverSource).toContain('const DEVELOPER_ROLES = new Set(["desenvolvedor", "developer"])');
    expect(serverSource).toContain('r.patch("/:id", requireDeveloper');
    expect(serverSource).toContain('if (!isDeveloper(user) && Number(ticket.solicitante_id) !== Number(user.userId))');
    expect(permissionsSource).toContain("'desenvolvedor', 'developer'");
  });

  it("impõe limites e tipos permitidos para anexos", () => {
    expect(serverSource).toContain("storage: multer.memoryStorage()");
    expect(serverSource).toContain("fileSize: 12 * 1024 * 1024, files: 5");
    expect(serverSource).toContain('"application/pdf"');
    expect(serverSource).toContain('"image/png"');
    expect(serverSource).toContain("await storagePut(key, file.buffer");
    expect(serverSource).toContain("function ticketUpload");
    expect(serverSource).toContain('return res.status(400).json({ error: message })');
  });

  it("mantém o módulo de suporte disponível para usuários e navegado pelo fluxo oficial", () => {
    expect(authSource).toContain("String(module || '').toLowerCase() === 'suporte'");
    expect(navigationSource).toContain("suporte: {");
    expect(navigationSource).toContain("module === 'suporte' && page === 'tickets'");
    expect(ticketUiSource).toContain("window.SuporteModule");
    expect(loginHtml).toContain('data-module="suporte"');
    expect(loginHtml).toContain('/crm/js/crm-tickets.js');
  });
});
