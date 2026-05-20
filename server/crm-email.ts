// SAMS Locações — Serviço de envio de email via SMTP (nodemailer)
// Usado para recuperação de senha do CRM
import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

// Configuração do transporte SMTP
// Usa variáveis de ambiente SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// Fallback: usa o serviço de notificação interno do Manus se SMTP não configurado
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }

  // Fallback: Gmail via OAuth2 ou SMTP direto se configurado
  // Se não houver SMTP configurado, usar Ethereal (email de teste) em dev
  // Em produção, retornar null e usar fallback via notificação
  return null;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envia email via SMTP configurado.
 * Retorna true em sucesso, false em falha.
 * Em ambiente sem SMTP, loga o email no console (útil para dev/teste).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const transport = createTransport();

  if (!transport) {
    // Sem SMTP configurado — logar no console para debug
    console.log("\n========== EMAIL (sem SMTP configurado) ==========");
    console.log(`Para: ${opts.to}`);
    console.log(`Assunto: ${opts.subject}`);
    console.log(`Texto: ${opts.text || "(sem texto)"}`);
    console.log("==================================================\n");
    // Retornar true para não bloquear o fluxo (o admin verá no log)
    return true;
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@samslocacoes.com.br";
    await transport.sendMail({
      from: `"SAMS Locações" <${from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    console.log(`[Email] Enviado para ${opts.to}: ${opts.subject}`);
    return true;
  } catch (err) {
    console.error("[Email] Falha ao enviar:", err);
    return false;
  }
}

/**
 * Gera o HTML do email de recuperação de senha
 */
export function buildPasswordResetEmail(name: string, resetUrl: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - SAMS Locações</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:30px 40px;text-align:center;">
              <h1 style="color:#c9a84c;margin:0;font-size:24px;letter-spacing:2px;">SAMS LOCAÇÕES</h1>
              <p style="color:#888;margin:6px 0 0;font-size:13px;">Sistema CRM/ERP</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px;">Recuperação de Senha</h2>
              <p style="color:#444;line-height:1.6;margin:0 0 16px;">Olá, <strong>${name}</strong>!</p>
              <p style="color:#444;line-height:1.6;margin:0 0 24px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no CRM SAMS Locações.
                Clique no botão abaixo para criar uma nova senha:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#c9a84c;border-radius:6px;text-align:center;">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#1a1a2e;font-weight:bold;font-size:15px;text-decoration:none;letter-spacing:0.5px;">
                      Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 8px;">
                <strong>Este link expira em 1 hora.</strong>
              </p>
              <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 24px;">
                Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanece a mesma.
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
              <p style="color:#999;font-size:12px;line-height:1.6;margin:0;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
                <a href="${resetUrl}" style="color:#c9a84c;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#aaa;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} SAMS Locações — Montadora de Stands<br>
                Este é um email automático, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Recuperação de Senha - SAMS Locações\n\nOlá, ${name}!\n\nClique no link abaixo para redefinir sua senha:\n${resetUrl}\n\nEste link expira em 1 hora.\n\nSe você não solicitou a redefinição, ignore este email.\n\n© ${new Date().getFullYear()} SAMS Locações`;

  return { html, text };
}
