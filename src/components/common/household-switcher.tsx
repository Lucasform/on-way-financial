"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Home } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  viewer: "Convidado",
};

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ActiveContext } from "@/lib/household";

export function HouseholdSwitcher({ ctx }: { ctx: ActiveContext }) {
  const router = useRouter();
  const current = ctx.households.find((h) => h.id === ctx.householdId);

  function pick(id: string) {
    document.cookie = `current_household_id=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <Home className="h-4 w-4 text-primary" />
          <span className="max-w-[180px] truncate text-sm font-medium">{current?.name ?? "Meu grupo"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Seus grupos</DropdownMenuLabel>
        {ctx.households.map((h) => (
          <DropdownMenuItem key={h.id} onSelect={() => pick(h.id)}>
            <span className="truncate">{h.name}</span>
            <span className="ml-auto text-xs text-text-muted">{ROLE_LABELS[h.role] ?? h.role}</span>
            {h.id === ctx.householdId ? <Check className="ml-2 h-3.5 w-3.5 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/onboarding")}>+ Novo grupo financeiro</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
