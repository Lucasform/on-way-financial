"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  PiggyBank,
  Repeat,
  Target,
  LayoutGrid,
  Truck,
  BarChart3,
  Upload,
  Users,
  SlidersHorizontal,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/transactions", label: "Lançamentos", icon: ArrowRightLeft },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/budgets", label: "Orçamentos", icon: PiggyBank },
  { href: "/recurring", label: "Recorrências", icon: Repeat },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/modules", label: "Módulos", icon: LayoutGrid },
  { href: "/suppliers", label: "Fornecedores", icon: Truck },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/import", label: "Importar", icon: Upload },
  { href: "/family", label: "Família", icon: Users },
  { href: "/setup", label: "Setup", icon: SlidersHorizontal },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-soft text-brand"
                : "text-fg-soft hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function QuickAddButton() {
  return (
    <Link
      href="/transactions?new=ai"
      className="flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
    >
      <Sparkles className="h-[18px] w-[18px]" />
      Lançar com IA
    </Link>
  );
}
