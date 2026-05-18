"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Boxes,
  CreditCard,
  Folders,
  Home,
  LayoutGrid,
  Plus,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

import { HouseholdSwitcher } from "@/components/common/household-switcher";
import { UserMenu } from "@/components/common/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActiveContext } from "@/lib/household";

const NAV = [
  { href: "/overview", label: "Visão geral", icon: Home },
  { href: "/transactions", label: "Transações", icon: Wallet },
  { href: "/modules", label: "Módulos", icon: Boxes },
  { href: "/categories", label: "Categorias", icon: Folders },
  { href: "/payment-methods", label: "Métodos", icon: CreditCard },
  { href: "/alerts", label: "Alertas", icon: Bell },
  { href: "/family", label: "Família", icon: Users },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function AppShell({
  ctx,
  children,
}: {
  ctx: ActiveContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  return (
    <div className="min-h-dvh bg-bg">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-bg-elev md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4 text-primary">
          <LayoutGrid className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-wide">ON WAY FINANCIAL</span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-bg-elev-2 text-text" : "text-text-muted hover:bg-bg-elev-2 hover:text-text",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <Button className="w-full" onClick={() => router.push("/transactions/new")}>
            <Plus className="h-4 w-4" /> Nova transação
          </Button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-bg/80 px-4 backdrop-blur md:pl-64">
        <HouseholdSwitcher ctx={ctx} />
        <UserMenu />
      </header>

      <main className="px-4 pb-24 pt-6 md:pl-64">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* FAB mobile */}
      <Button
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-xl md:hidden"
        onClick={() => router.push("/transactions/new")}
        aria-label="Nova transação"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-bg-elev md:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-[10px]",
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
