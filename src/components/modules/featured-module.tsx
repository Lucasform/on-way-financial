"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Boxes, ChevronDown, Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

const MODULE_META: Record<string, { emoji: string; href: (id: string) => string; label: string }> = {
  obra: { emoji: "🧱", label: "Obra", href: (id) => `/modules/obra/${id}` },
  travel: { emoji: "✈️", label: "Viagem", href: (id) => `/modules/travel/${id}` },
  car: { emoji: "🚗", label: "Carro", href: (id) => `/modules/car/${id}` },
  gift: { emoji: "🎁", label: "Presente", href: (id) => `/modules/gift/${id}` },
  education: { emoji: "🎓", label: "Educação", href: (id) => `/modules/education/${id}` },
  custom: { emoji: "✨", label: "Personalizado", href: (id) => `/modules/custom/${id}` },
};

export interface FeaturedModuleData {
  id: string;
  kind: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  used: number;
}

const PIN_KEY = "onway-featured-module";

export function FeaturedModule({ modules }: { modules: FeaturedModuleData[] }) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(PIN_KEY);
      if (saved && modules.some((m) => m.id === saved)) {
        setPinnedId(saved);
        return;
      }
    } catch {
      // ignora
    }
    setPinnedId(modules[0]?.id ?? null);
  }, [modules]);

  function pin(id: string) {
    setPinnedId(id);
    try {
      localStorage.setItem(PIN_KEY, id);
    } catch {
      // ignora
    }
    setPicking(false);
  }

  if (modules.length === 0) return null;

  const featured = modules.find((m) => m.id === pinnedId) ?? modules[0]!;
  const meta = MODULE_META[featured.kind] ?? MODULE_META.custom!;
  const pct = featured.budget && Number(featured.budget) > 0
    ? Math.min(100, (featured.used / Number(featured.budget)) * 100)
    : 0;

  const barColor = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-primary";

  return (
    <section className="relative">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Módulo em destaque</h2>
        </div>
        <div className="flex items-center gap-1">
          {modules.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setPicking((v) => !v)}>
              Trocar <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", picking && "rotate-180")} />
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/modules">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Dropdown de seleção */}
      {picking && modules.length > 1 && (
        <div className="surface-elevated absolute right-0 top-10 z-20 w-72 overflow-hidden rounded-lg border border-border shadow-2xl">
          <p className="border-b border-border bg-bg-elev-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Escolha o módulo em destaque
          </p>
          <ul className="max-h-72 overflow-y-auto">
            {modules.map((m) => {
              const mMeta = MODULE_META[m.kind] ?? MODULE_META.custom!;
              const isPinned = m.id === featured.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => pin(m.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-elev-2",
                      isPinned && "bg-primary/5 text-primary",
                    )}
                  >
                    <span>{mMeta.emoji}</span>
                    <span className="flex-1 truncate">{m.name}</span>
                    {isPinned && <Star className="h-3.5 w-3.5 fill-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Card do módulo destacado */}
      <Link
        href={meta.href(featured.id)}
        className="surface-elevated group block overflow-hidden p-5 transition-colors hover:bg-bg-elev-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-text-muted">{meta.label}</p>
            <h3 className="mt-0.5 flex items-center gap-2 text-lg font-semibold">
              <span className="text-2xl">{meta.emoji}</span>
              <span className="truncate">{featured.name}</span>
            </h3>
            {(featured.start_date || featured.end_date) && (
              <p className="mt-1 text-xs text-text-muted">
                {featured.start_date && <>Início {featured.start_date}</>}
                {featured.start_date && featured.end_date && <> · </>}
                {featured.end_date && <>previsão {featured.end_date}</>}
              </p>
            )}
          </div>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Usado</p>
            <Money value={featured.used} className="mt-1 block text-lg font-semibold" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Orçamento</p>
            <Money
              value={featured.budget}
              tone="muted"
              className="mt-1 block text-lg font-semibold"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">% usado</p>
            <p className="num mt-1 text-lg font-semibold">
              {featured.budget && Number(featured.budget) > 0 ? `${pct.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>

        {featured.budget && Number(featured.budget) > 0 && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-elev-2">
            <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
          </div>
        )}
      </Link>

      {/* Atalho criar novo */}
      {modules.length <= 2 && (
        <Link
          href="/modules"
          className="surface mt-3 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-sm text-text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" /> Criar outro módulo
        </Link>
      )}
    </section>
  );
}
