"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  name: string;
}

interface FiltersProps {
  categories: Option[];
  methods: Option[];
}

export function TransactionFilters({ categories, methods }: FiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function update(form: FormData) {
    const next = new URLSearchParams();
    for (const [k, v] of form.entries()) {
      if (typeof v === "string" && v.trim()) next.set(k, v.toString());
    }
    start(() => {
      router.push(`/transactions${next.toString() ? `?${next}` : ""}`);
    });
  }

  return (
    <form action={update} className="grid gap-3 sm:grid-cols-2 md:grid-cols-6">
      <div className="md:col-span-2">
        <Label htmlFor="q">Buscar</Label>
        <Input id="q" name="q" defaultValue={params?.get("q") ?? ""} placeholder="descrição, nota, categoria ou valor..." />
      </div>
      <div>
        <Label htmlFor="from">De</Label>
        <Input id="from" name="from" type="date" defaultValue={params?.get("from") ?? ""} />
      </div>
      <div>
        <Label htmlFor="to">Até</Label>
        <Input id="to" name="to" type="date" defaultValue={params?.get("to") ?? ""} />
      </div>
      <div>
        <Label htmlFor="category">Categoria</Label>
        <select
          id="category"
          name="category"
          defaultValue={params?.get("category") ?? ""}
          className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="payment">Método</Label>
        <select
          id="payment"
          name="payment"
          defaultValue={params?.get("payment") ?? ""}
          className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
        >
          <option value="">Todos</option>
          {methods.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="md:col-span-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push("/transactions")}>Limpar</Button>
        <Button type="submit" disabled={pending}>Filtrar</Button>
      </div>
    </form>
  );
}
