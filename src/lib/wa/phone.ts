// Alguns contatos chegam do WhatsApp sem o número visível, só com um código interno ("@lid").
// Nesses casos a conversa é guardada com a chave "lid:<código>" no lugar do telefone.
const LID_PREFIX = "lid:";

export function isLidKey(phone: string | null | undefined): boolean {
  return (phone ?? "").startsWith(LID_PREFIX);
}

/** Chave da conversa a partir do endereço do WhatsApp: número com DDI, ou "lid:<código>". Null para grupos e canais. */
export function phoneKeyFromJid(jid: string | null | undefined, alt?: string | null): string | null {
  const value = jid ?? "";
  if (value.endsWith("@g.us") || value.endsWith("@broadcast") || value.endsWith("@newsletter")) return null;
  if (value.endsWith("@lid")) {
    const real = (alt ?? "").split("@")[0]!.replace(/\D/g, "");
    if (real.length >= 10) return real;
    const code = value.split("@")[0]!.replace(/\D/g, "");
    return code ? `${LID_PREFIX}${code}` : null;
  }
  const digits = value.split("@")[0]!.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

/** Para onde mandar a mensagem: o número, ou o endereço interno quando o WhatsApp esconde o número. */
export function sendTarget(conversation: { phone: string; wa_jid: string | null }): string {
  if (isLidKey(conversation.phone)) return conversation.wa_jid ?? `${conversation.phone.slice(LID_PREFIX.length)}@lid`;
  return conversation.phone;
}

/** Só dígitos com DDI. DDD + número (10 ou 11 dígitos) ganha o 55 do Brasil. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return digits;
  return null;
}

/** Compara pelo final do número (ignora DDI e o 9 extra que alguns cadastros têm e outros não). */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const pa = splitPhone(a);
  const pb = splitPhone(b);
  if (!pa || !pb) return false;
  return pa.last8 === pb.last8 && (!pa.ddd || !pb.ddd || pa.ddd === pb.ddd);
}

function splitPhone(raw: string | null | undefined) {
  if (isLidKey(raw)) return null;
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length < 8) return null;
  return { last8: d.slice(-8), ddd: d.length >= 10 ? d.slice(0, 2) : null };
}

/** Nome de contato vindo do WhatsApp; quando não há nome, o servidor manda o próprio código numérico. */
export function contactName(name: string | null | undefined): string | null {
  const n = (name ?? "").trim();
  return n && !/^\+?\d+$/.test(n) ? n : null;
}

/** Telefone pra mostrar ou gravar no cadastro; null quando o WhatsApp não revelou o número. */
export function displayPhone(phone: string): string | null {
  return isLidKey(phone) ? null : formatPhone(phone);
}

export function formatPhone(phone: string): string {
  if (isLidKey(phone)) return "Número oculto pelo WhatsApp";
  const d = phone.replace(/\D/g, "");
  const local = d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return `+${d}`;
}
