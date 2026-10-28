import "server-only";

import webpush from "web-push";

import { getServerEnv } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const env = getServerEnv();
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(
    env.VAPID_SUBJECT ?? env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0 || !ensureConfigured()) return { sent: 0, failed: 0, removed: 0 };
  const admin = createSupabaseAdmin();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12, urgency: "high" },
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(s.id);
      else {
        failed++;
        console.error("push send", status, (err as Error).message);
      }
    }
  }
  if (gone.length > 0) await admin.from("push_subscriptions").delete().in("id", gone);
  return { sent, failed, removed: gone.length };
}
