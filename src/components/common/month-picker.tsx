"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  /** YYYY-MM-01 do mês atualmente selecionado */
  value: string;
  paramKey?: string;
  className?: string;
}

export function MonthPicker({ value, paramKey = "month", className }: MonthPickerProps) {
  const router = useRouter();
  const params = useSearchParams();
  const current = parseISO(value);
  const today = new Date();
  const isThisMonth = format(current, "yyyy-MM") === format(today, "yyyy-MM");

  function navigate(direction: -1 | 1) {
    const next = addMonths(current, direction);
    const nextStr = format(next, "yyyy-MM-01");
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.set(paramKey, nextStr);
    router.push(`?${sp.toString()}`, { scroll: false });
  }

  function goToday() {
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.delete(paramKey);
    router.push(sp.toString() ? `?${sp.toString()}` : window.location.pathname, { scroll: false });
  }

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-bg-elev p-1", className)}>
      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => navigate(-1)} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[130px] px-2 text-center text-sm font-medium capitalize">
        {format(current, "MMMM yyyy", { locale: ptBR })}
      </span>
      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => navigate(1)} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isThisMonth && (
        <Button size="sm" variant="ghost" className="h-7 rounded-full px-3 text-xs" onClick={goToday}>
          Hoje
        </Button>
      )}
    </div>
  );
}
