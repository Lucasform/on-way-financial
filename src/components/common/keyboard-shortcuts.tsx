"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const ROUTES: Record<string, string> = {
  h: "/overview",
  t: "/transactions",
  e: "/recurring",
  i: "/import",
  r: "/reports",
  m: "/modules",
  c: "/categories",
  a: "/alerts",
  f: "/family",
  s: "/settings",
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pending = useRef<"g" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearPending() {
      pending.current = null;
      if (timer.current) clearTimeout(timer.current);
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      const k = e.key.toLowerCase();

      if (pending.current === "g") {
        const route = ROUTES[k];
        clearPending();
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        return;
      }

      if (k === "g") {
        pending.current = "g";
        timer.current = setTimeout(clearPending, 1200);
        return;
      }

      if (k === "n") {
        e.preventDefault();
        router.push("/transactions/new");
        return;
      }

      if (k === "/") {
        const q = document.getElementById("q") as HTMLInputElement | null;
        if (q) {
          e.preventDefault();
          q.focus();
          q.select();
        }
        return;
      }

      if (k === "?") {
        e.preventDefault();
        toast.message("Atalhos", {
          description:
            "n: nova transação · /: buscar · g+h: visão · g+t: transações · g+i: importar · g+r: relatórios · g+m: módulos · g+c: categorias · g+a: alertas · g+f: grupo · g+s: configurações",
          duration: 6000,
        });
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  return null;
}
