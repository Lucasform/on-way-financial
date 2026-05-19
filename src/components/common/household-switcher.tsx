"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Home } from "lucide-react";

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

const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  viewer: "Convidado",
};

export function HouseholdSwitcher({ ctx }: { ctx: ActiveContext }) {
  const router = useRouter();
  const current = ctx.households.find((h) => h.id === ctx.householdId);
  const hasMultiple = ctx.households.length > 1;

  function pick(id: string) {
    document.cookie = `current_household_id=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  // Se só tem 1 grupo, vira link pra Início
  if (!hasMultiple) {
    return (
      <Button asChild variant="ghost" size="sm" className="gap-2 px-2">
        <Link href="/overview">
          <Home className="h-4 w-4 text-primary" />
          <span className="max-w-[180px] truncate text-sm font-medium">
            {current?.name ?? "Início"}
          </span>
        </Link>
      </Button>
    );
  }

  // Múltiplos grupos: dropdown só pra trocar
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <Home className="h-4 w-4 text-primary" />
          <span className="max-w-[180px] truncate text-sm font-medium">
            {current?.name ?? "Meu grupo"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Trocar de grupo</DropdownMenuLabel>
        {ctx.households.map((h) => (
          <DropdownMenuItem key={h.id} onSelect={() => pick(h.id)}>
            <span className="truncate">{h.name}</span>
            <span className="ml-auto text-xs text-text-muted">{ROLE_LABELS[h.role] ?? h.role}</span>
            {h.id === ctx.householdId ? <Check className="ml-2 h-3.5 w-3.5 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/overview")}>
          <Home className="mr-2 h-3.5 w-3.5" /> Ir para Início
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
