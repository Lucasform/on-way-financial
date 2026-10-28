import "server-only";

import { getServerEnv } from "@/lib/env";
import { emailLayout, sendResendEmail } from "@/lib/email/resend";

export type AuthEmailKind = "recovery" | "signup" | "magiclink";

const P = "margin:0 0 12px;font-size:15px;line-height:1.5;color:#d4d4d4";
const MUTED = "margin:0;font-size:14px;line-height:1.5;color:#a3a3a3";

const COPY: Record<AuthEmailKind, { subject: string; title: string; body: string; cta: string; footer: string }> = {
  recovery: {
    subject: "Redefinir sua senha",
    title: "Vamos criar uma senha nova",
    body: `<p style="${P}">Recebemos um pedido pra redefinir a senha da sua conta.</p><p style="${MUTED}">Clique no botão abaixo e escolha a senha nova. O link vale por 1 hora e só funciona uma vez.</p>`,
    cta: "Criar nova senha",
    footer: "Se não foi você que pediu, pode ignorar este e-mail. Sua senha continua a mesma.",
  },
  signup: {
    subject: "Confirme seu e-mail",
    title: "Falta só confirmar seu e-mail",
    body: `<p style="${P}">Sua conta foi criada. Confirme que este e-mail é seu pra começar a organizar a obra.</p><p style="${MUTED}">O link vale por 1 hora.</p>`,
    cta: "Confirmar e entrar",
    footer: "Se você não criou uma conta, pode ignorar este e-mail.",
  },
  magiclink: {
    subject: "Seu link de entrada",
    title: "Seu link pra entrar",
    body: `<p style="${P}">Use o botão abaixo pra entrar sem senha.</p><p style="${MUTED}">O link vale por 1 hora e só funciona uma vez.</p>`,
    cta: "Entrar agora",
    footer: "Se não foi você que pediu, pode ignorar este e-mail.",
  },
};

export async function sendAuthEmail(kind: AuthEmailKind, to: string, url: string) {
  const env = getServerEnv();
  const appName = env.NEXT_PUBLIC_APP_NAME ?? "On Obra";
  const c = COPY[kind];
  return sendResendEmail({
    to,
    subject: `${c.subject} · ${appName}`,
    html: emailLayout({ appName, title: c.title, bodyHtml: c.body, ctaLabel: c.cta, ctaUrl: url, footer: c.footer }),
    text: `${c.title}\n\n${c.cta}: ${url}\n\n${c.footer}`,
  });
}
