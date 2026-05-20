import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP Gmail Configuration", () => {
  it("deve conectar ao servidor SMTP do Gmail com as credenciais configuradas", async () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    expect(host).toBe("smtp.gmail.com");
    expect(user).toBeTruthy();
    expect(pass).toBeTruthy();

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    // Verificar conexão sem enviar email
    await expect(transport.verify()).resolves.toBe(true);
  }, 15000);
});
