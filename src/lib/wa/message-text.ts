type RawMessage = Record<string, unknown> | undefined;

const MEDIA_LABEL: Record<string, string> = {
  imageMessage: "[imagem]",
  videoMessage: "[vídeo]",
  audioMessage: "[áudio]",
  pttMessage: "[áudio]",
  documentMessage: "[documento]",
  documentWithCaptionMessage: "[documento]",
  stickerMessage: "[figurinha]",
  locationMessage: "[localização]",
  contactMessage: "[contato]",
};

/** Texto legível de uma mensagem do WhatsApp; mídia vira um rótulo como "[áudio]". Null para reação/sistema. */
export function messageText(message: RawMessage, messageType?: string): string | null {
  const m = message ?? {};
  if (typeof m.conversation === "string" && m.conversation.trim()) return m.conversation.trim();
  const extended = m.extendedTextMessage as { text?: string } | undefined;
  if (extended?.text?.trim()) return extended.text.trim();

  const type = messageType ?? Object.keys(m).find((k) => k in MEDIA_LABEL);
  if (!type) return null;
  const label = MEDIA_LABEL[type];
  if (!label) return null;
  const media = m[type] as { caption?: string; fileName?: string } | undefined;
  const extra = media?.caption ?? media?.fileName ?? "";
  return extra ? `${label} ${extra}` : label;
}
