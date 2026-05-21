import "server-only";

import { getServerEnv } from "@/lib/env";

interface SendInviteArgs {
  to: string;
  inviterName: string | null;
  householdName: string;
  inviteUrl: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "dono",
  admin: "administrador",
  member: "membro",
  viewer: "visualizador",
};

/**
 * Envia o email de convite via Resend.
 * Retorna ok=true se aceito pela API (HTTP 200/202), ok=false caso contrario.
 */
export async function sendInviteEmail(args: SendInviteArgs): Promise<{ ok: boolean; error?: string }> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) return { ok: false, error: "resend_not_configured" };

  const role = ROLE_LABEL[args.role] ?? args.role;
  const inviter = args.inviterName ? args.inviterName : "Alguém";
  const appName = env.NEXT_PUBLIC_APP_NAME ?? "ON FIN";
  const from = `${appName} <${env.INVITE_FROM_EMAIL}>`;
  const replyTo = env.INVITE_REPLY_TO ?? undefined;

  const subject = `${inviter} te convidou para o ${args.householdName} no ${appName}`;
  const html = buildHtml({ inviter, householdName: args.householdName, role, inviteUrl: args.inviteUrl, appName });
  const text = `${inviter} te convidou para participar do grupo "${args.householdName}" no ${appName} como ${role}.\n\nAcesse: ${args.inviteUrl}\n\nO convite expira em 7 dias.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      return { ok: false, error: `resend_${res.status}: ${err.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch_failed" };
  }
}

function buildHtml(args: {
  inviter: string;
  householdName: string;
  role: string;
  inviteUrl: string;
  appName: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00d1a0,#22d3ee);line-height:48px;font-size:24px">💸</div>
      <h1 style="font-size:18px;margin:16px 0 4px;color:#fff;font-weight:600">${args.appName}</h1>
    </div>
    <div style="background:#171717;border:1px solid #262626;border-radius:12px;padding:32px 24px">
      <h2 style="margin:0 0 16px;font-size:20px;color:#fff">Você foi convidado!</h2>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#d4d4d4">
        <strong style="color:#00d1a0">${args.inviter}</strong> te convidou para participar do grupo
        <strong style="color:#fff">"${args.householdName}"</strong> como <strong>${args.role}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3">
        Com esse acesso você vai poder lançar despesas, acompanhar o orçamento e usar o assistente de IA junto com a equipe.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${args.inviteUrl}" style="display:inline-block;background:#00d1a0;color:#0a0a0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Aceitar convite
        </a>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#737373;text-align:center;line-height:1.5">
        Ou copie e cole este link no navegador:<br>
        <span style="word-break:break-all;color:#a3a3a3">${args.inviteUrl}</span>
      </p>
    </div>
    <p style="text-align:center;margin:24px 0 0;font-size:11px;color:#525252">
      O convite expira em 7 dias. Se você não esperava esse email, pode ignorar.
    </p>
  </div>
</body>
</html>`;
}
