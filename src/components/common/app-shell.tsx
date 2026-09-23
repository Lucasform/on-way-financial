"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  Folders,
  Home,
  Plus,
  Users,
  Wallet,
} from "lucide-react";

import { HouseholdSwitcher } from "@/components/common/household-switcher";
import { KeyboardShortcuts } from "@/components/common/keyboard-shortcuts";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UserMenu } from "@/components/common/user-menu";
import { Button } from "@/components/ui/button";
import { OBRA_SECTIONS } from "@/components/modules/obra-dashboard";
import { useDraggableFab } from "@/hooks/use-draggable-fab";
import { cn } from "@/lib/utils";
import type { ActiveContext } from "@/lib/household";

const NAV = [
  { href: "/overview", label: "Minha obra", icon: Home },
  { href: "/transactions", label: "Despesas", icon: Wallet },
  { href: "/family", label: "Família", icon: Users },
  { href: "/categories", label: "Categorias", icon: Folders },
  { href: "/payment-methods", label: "Métodos", icon: CreditCard },
];

const MOBILE_NAV = [
  { href: "/overview", label: "Obra", icon: Home },
  { href: "/transactions", label: "Despesas", icon: Wallet },
  { href: "/family", label: "Família", icon: Users },
  { href: "/categories", label: "Categorias", icon: Folders },
  { href: "/payment-methods", label: "Métodos", icon: CreditCard },
];

export function AppShell({ ctx, children }: { ctx: ActiveContext; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const fab = useDraggableFab<HTMLButtonElement>("quick-add");

  return (
    <div className="min-h-dvh bg-bg">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-bg-elev md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-text">ON FIN</p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Obra</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <div key={item.href}>
                <Link
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
                {item.href === "/overview" && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                    {OBRA_SECTIONS.map((sec) => {
                      const secActive = pathname === sec.href || pathname.startsWith(sec.href + "/");
                      const SecIcon = sec.icon;
                      return (
                        <Link
                          key={sec.href}
                          href={sec.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                            secActive
                              ? "bg-bg-elev-2 text-text"
                              : "text-text-muted hover:bg-bg-elev-2 hover:text-text",
                          )}
                        >
                          <SecIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{sec.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
      <KeyboardShortcuts />

      <main className="px-4 pb-28 pt-5 sm:px-6 sm:pt-6 md:pl-[18rem] md:pr-8 lg:pl-[19rem]">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* FAB mobile (arrastável) */}
      <Button
        ref={fab.ref}
        className="fixed bottom-20 right-4 z-30 h-14 w-14 touch-none rounded-full shadow-2xl will-change-transform md:hidden"
        onClick={() => {
          if (fab.consumeDrag()) return;
          router.push("/transactions/new");
        }}
        aria-label="Nova transação (arraste pra mover)"
        style={{ boxShadow: "0 10px 30px -10px rgba(0,209,160,0.6)" }}
        {...fab.handlers}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Bottom nav mobile */}
      <nav
        className="glass fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border md:hidden"
      >
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
      </nav>
    </div>
  );
}
