"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowRightLeft, LayoutGrid, BarChart3, Menu, X } from "lucide-react";
import { AppNav, QuickAddButton } from "@/components/app-nav";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/transactions", label: "Lançar", icon: ArrowRightLeft },
  { href: "/modules", label: "Módulos", icon: LayoutGrid },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
];

export function BottomNav({ householdName, email }: { householdName: string | null; email: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition",
                active ? "text-brand" : "text-fg-soft",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-fg-soft"
        >
          <Menu className="h-5 w-5" />
          Mais
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LogoMark size={32} />
                <span className="text-base font-bold tracking-[0.18em]">ON</span>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-fg-soft hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <QuickAddButton />
            </div>
            <AppNav />
            <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3 text-xs text-fg-soft">
              <p className="font-medium text-fg">{householdName}</p>
              <p className="truncate">{email}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
