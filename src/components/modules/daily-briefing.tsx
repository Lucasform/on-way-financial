"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, ListTodo } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Money } from "@/components/ui/money";
import { fmtDate } from "@/lib/dates";
import type { UpcomingPayment } from "@/components/modules/obra-dashboard";

export interface UpcomingActivity {
  id: string;
  title: string;
  due_date: string;
  assignee: string | null;
}

function whenLabel(due: string, today: string) {
  if (due === today) return { text: "hoje", cls: "font-medium text-warning" };
  if (due < today) return { text: `atrasada ${fmtDate(due, "dd/MM")}`, cls: "font-medium text-danger" };
  return { text: fmtDate(due, "dd/MM"), cls: "text-text-muted" };
}

export function TodayActivitiesCard({ activities, today }: { activities: UpcomingActivity[]; today: string }) {
  const overdue = activities.filter((a) => a.due_date < today).length;
  const dueToday = activities.filter((a) => a.due_date === today).length;
  const alert = overdue > 0 || dueToday > 0;
  return (
    <Link href="/overview/atividades" className="block">
      <Card className={`transition-colors hover:bg-bg-elev-2 ${alert ? "border-warning/60" : "hover:border-primary/50"}`}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm text-text-muted">
            <ListTodo className="h-4 w-4" /> Atividades
          </CardTitle>
          {alert && (
            <span className="text-xs font-medium text-warning">
              {[overdue > 0 && `${overdue} atrasada${overdue > 1 ? "s" : ""}`, dueToday > 0 && `${dueToday} pra hoje`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {activities.slice(0, 4).map((a) => {
            const w = whenLabel(a.due_date, today);
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {a.title}
                  {a.assignee && <span className="text-text-muted"> · {a.assignee}</span>}
                </span>
                <span className={`shrink-0 text-xs ${w.cls}`}>{w.text}</span>
              </div>
            );
          })}
          {activities.length > 4 && <p className="text-xs text-text-muted">e mais {activities.length - 4}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

const SEEN_KEY = "on-obra:daily-briefing-seen";

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeen(day: string) {
  try {
    window.localStorage.setItem(SEEN_KEY, day);
  } catch {}
}

export function DailyBriefingDialog({
  payments,
  activities,
  today,
}: {
  payments: UpcomingPayment[];
  activities: UpcomingActivity[];
  today: string;
}) {
  const duePayments = payments.filter((p) => p.due_date <= today);
  const dueActivities = activities.filter((a) => a.due_date <= today);
  const hasItems = duePayments.length + dueActivities.length > 0;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasItems && readSeen() !== today) setOpen(true);
  }, [hasItems, today]);

  function close() {
    writeSeen(today);
    setOpen(false);
  }

  const total = duePayments.reduce((s, p) => s + p.amount, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hoje na obra</DialogTitle>
          <DialogDescription>{fmtDate(today, "EEEE, dd/MM")}</DialogDescription>
        </DialogHeader>

        {duePayments.length > 0 && (
          <section className="space-y-2">
            <p className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" /> Pagamentos
              </span>
              <Money value={total} size="sm" />
            </p>
            <ul className="space-y-1.5">
              {duePayments.map((p) => {
                const w = whenLabel(p.due_date, today);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      {p.item_name}
                      {p.supplier_name && <span className="text-text-muted"> · {p.supplier_name}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={`text-xs ${w.cls}`}>{w.text === "hoje" ? "hoje" : w.text.replace("atrasada", "venceu")}</span>
                      <Money value={p.amount} size="sm" />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {dueActivities.length > 0 && (
          <section className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <ListTodo className="h-4 w-4" /> Atividades
            </p>
            <ul className="space-y-1.5">
              {dueActivities.map((a) => {
                const w = whenLabel(a.due_date, today);
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      {a.title}
                      {a.assignee && <span className="text-text-muted"> · {a.assignee}</span>}
                    </span>
                    <span className={`shrink-0 text-xs ${w.cls}`}>{w.text}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <PushOptIn compact />

        <DialogFooter className="gap-2 sm:gap-2">
          {duePayments.length > 0 && (
            <Button variant="outline" asChild onClick={close}>
              <Link href="/overview/pagamentos">Ver pagamentos</Link>
            </Button>
          )}
          <Button onClick={close}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export function PushOptIn({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const supported = !!VAPID_PUBLIC_KEY && "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
      let next: PushState;
      if (!supported) next = ios && !standalone ? "ios-install" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await getRegistration();
        if (!reg) next = "unsupported";
        else next = (await reg.pushManager.getSubscription()) ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })().catch(() => !cancelled && setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await getRegistration();
      if (!reg) {
        setState("unsupported");
        return;
      }
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
      const res = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("save_failed");
      setState("on");
      toast.success("Pronto. Todo dia às 8h chega o aviso dos pagamentos e atividades.");
    } catch {
      toast.error("Não consegui ativar as notificações neste aparelho.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported" || state === "on") return null;

  const text =
    state === "ios-install"
      ? "No iPhone, adicione o app à Tela de Início (Compartilhar, Adicionar à Tela de Início) e abra por lá pra receber o aviso das 8h."
      : state === "denied"
        ? "As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador pra receber o aviso das 8h."
        : "Receba um aviso no celular todo dia às 8h com os pagamentos e atividades do dia.";

  return (
    <div className={`flex items-center gap-3 rounded-lg border border-border bg-bg-elev-2 ${compact ? "p-3" : "p-4"}`}>
      <Bell className="h-5 w-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-xs text-text-muted">{text}</p>
      {state === "off" && (
        <Button size="sm" disabled={busy} onClick={enable} className="shrink-0">
          Ativar
        </Button>
      )}
    </div>
  );
}
