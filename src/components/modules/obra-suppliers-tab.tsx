"use client";

import { useState, useTransition } from "react";
import { Phone, Plus, Star, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export interface Supplier {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  notes: string | null;
  rating: number | null;
}

const CATEGORIES = ["material", "mão-de-obra", "equipamento", "serviço", "outro"];

interface Props {
  householdId: string;
  initial: Supplier[];
  canWrite: boolean;
}

export function ObraSuppliersTab({ householdId, initial, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [suppliers, setSuppliers] = useState(initial);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Partial<Supplier>>({ category: "material" });

  function add() {
    if (!canWrite || !draft.name?.trim()) return;
    start(async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          household_id: householdId,
          name: draft.name!.trim(),
          category: draft.category ?? "material",
          phone: draft.phone ?? null,
          notes: draft.notes ?? null,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao adicionar fornecedor.");
        return;
      }
      setSuppliers((s) => [data as Supplier, ...s]);
      setDraft({ category: "material" });
      toast.success("Fornecedor adicionado.");
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) {
        toast.error("Falha ao remover.");
        return;
      }
      setSuppliers((s) => s.filter((x) => x.id !== id));
    });
  }

  function rate(id: string, rating: number) {
    if (!canWrite) return;
    setSuppliers((s) => s.map((x) => (x.id === id ? { ...x, rating } : x)));
    start(async () => {
      await supabase.from("suppliers").update({ rating }).eq("id", id);
    });
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">Novo fornecedor</p>
          <div className="grid gap-2 sm:grid-cols-5">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="sname">Nome</Label>
              <Input
                id="sname"
                value={draft.name ?? ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder='Ex: "Leroy Merlin", "João Pedreiro"'
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scat">Tipo</Label>
              <select
                id="scat"
                value={draft.category ?? "material"}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sphone">Telefone</Label>
              <Input
                id="sphone"
                value={draft.phone ?? ""}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={add} disabled={pending || !draft.name?.trim()} className="w-full">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {suppliers.length === 0 ? (
        <Empty icon={Truck} title="Sem fornecedores" description="Cadastre lojas e prestadores pra comparar preço e histórico." />
      ) : (
        <ul className="space-y-2">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Card className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-text-muted">
                    {s.category ?? "—"}
                    {s.phone && (
                      <>
                        {" "}
                        · <Phone className="inline h-3 w-3" /> {s.phone}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={!canWrite}
                      onClick={() => rate(s.id, n)}
                      aria-label={`Nota ${n}`}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          (s.rating ?? 0) >= n ? "fill-warning text-warning" : "text-text-muted"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {canWrite && (
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
