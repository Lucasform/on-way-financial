"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Boxes,
  CreditCard,
  FileUp,
  Folders,
  Home,
  LineChart,
  MoreHorizontal,
  Plus,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { HouseholdSwitcher } from "@/components/common/household-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UserMenu } from "@/components/common/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActiveContext } from "@/lib/household";

const NAV = [
  { href: "/overview", label: "Visão geral", icon: Home },
  { href: "/transactions", label: "Transações", icon: Wallet },
  { href: "/import", label: "Importar extrato", icon: FileUp },
  { href: "/reports", label: "Relatórios", icon: LineChart },
  { href: "/modules", label: "Módulos", icon: Boxes },
  { href: "/categories", label: "Categorias", icon: Folders },
  { href: "/payment-methods", label: "Métodos", icon: CreditCard },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/family", label: "Grupo", icon: Users },
  { href: "/settings", label: "Configurações", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/overview", label: "Início", icon: Home },
  { href: "/transactions", label: "Extrato", icon: Wallet },
  { href: "/reports", label: "Relatórios", icon: LineChart },
  { href: "/modules", label: "Módulos", icon: Boxes },
];

const MORE_NAV = [
  { href: "/import", label: "Importar extrato", icon: FileUp },
  { href: "/categories", label: "Categorias", icon: Folders },
  { href: "/payment-methods", label: "Métodos", icon: CreditCard },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/family", label: "Grupo", icon: Users },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function AppShell({ ctx, children }: { ctx: ActiveContext; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-bg">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-bg-elev md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
          <div className="leading-tight">
            <p className="text-xs font-semibold tracking-wide text-text">ON WAY</p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Financial</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-bg-elev-2 text-text"
                    : "text-text-muted hover:bg-bg-elev-2 hover:text-text",
                )}
              >
                {active && (
                  <span aria-hidden className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button className="w-full" onClick={() => router.push("/transactions/new")}>
            <Plus className="h-4 w-4" /> Nova transação
          </Button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border px-4 md:pl-72">
        <HouseholdSwitcher ctx={ctx} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main className="px-4 pb-28 pt-6 md:pl-72 md:pr-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* FAB mobile */}
      <Button
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-2xl md:hidden"
        onClick={() => router.push("/transactions/new")}
        aria-label="Nova transação"
        style={{ boxShadow: "0 10px 30px -10px rgba(0,209,160,0.6)" }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Bottom nav mobile */}
      <nav className="glass fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border md:hidden">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-text-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
            MORE_NAV.some((i) => pathname.startsWith(i.href)) ? "text-primary" : "text-text-muted",
          )}
          aria-label="Mais opções"
        >
          <MoreHorizontal className="h-5 w-5" />
          Mais
        </button>
      </nav>

      {/* More menu (mobile) */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-bg-elev p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Mais opções</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar"
                className="rounded-md p-1 text-text-muted hover:bg-bg-elev-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-bg-elev-2 text-text hover:bg-bg-elev-3",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
