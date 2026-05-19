"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Props {
  /** Filtro: tabela=eq.{value} — ex.: "household_id=eq.<uuid>" */
  table: string;
  filter?: string;
  /** Mensagem de toast quando uma transação chega via bot externo */
  toastNew?: boolean;
}

/**
 * Componente client que escuta inserts numa tabela (geralmente `transactions`)
 * e dispara `router.refresh()` quando algo muda — atualizando o servidor sem F5.
 */
export function RealtimeRefresher({ table, filter, toastNew = true }: Props) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`refresh-${table}-${filter ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        (payload) => {
          // throttle: máximo 1 refresh a cada 1500ms
          const now = Date.now();
          if (now - lastRefresh.current < 1500) return;
          lastRefresh.current = now;

          if (toastNew && payload.eventType === "INSERT") {
            const source = (payload.new as { source?: string }).source;
            if (source === "telegram" || source === "whatsapp" || source === "import") {
              toast.success("Nova transação registrada!", { duration: 2500 });
            }
          }
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, table, filter, toastNew]);

  return null;
}
