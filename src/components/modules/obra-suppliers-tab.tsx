"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, MessageCircle, Phone, Plus, Star, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { waLink } from "@/lib/utils";

export interface Supplier {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  phone2: string | null;
  cnpj: string | null;
  address: string | null;
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

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
          phone2: draft.phone2 ?? null,
          cnpj: draft.cnpj ?? null,
          address: draft.address ?? null,
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
      setMoreOpen(false);
      setShowAdd(false);
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
      {canWrite && !showAdd && (
        <Button variant="outline" onClick={() => setShowAdd(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Novo fornecedor
        </Button>
      )}

      {canWrite && showAdd && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Novo fornecedor</p>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
          </div>
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

          <button
            type="button"
            onClick={() => setMoreOpen((s) => !s)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
          >
            {moreOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Mais detalhes (2º telefone, CNPJ, endereço)
          </button>

          {moreOpen && (
            <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="sphone2">2º telefone</Label>
                <Input
                  id="sphone2"
                  value={draft.phone2 ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone2: e.target.value })}
                  placeholder="(11) 98888-8888"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="scnpj">CNPJ</Label>
                <Input
                  id="scnpj"
                  value={draft.cnpj ?? ""}
                  onChange={(e) => setDraft({ ...draft, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="saddr">Endereço</Label>
                <Input
                  id="saddr"
                  value={draft.address ?? ""}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
            </div>
          )}
        </Card>
      )}

      {suppliers.length === 0 ? (
        <Empty icon={Store} title="Sem fornecedores" description="Cadastre lojas e prestadores pra comparar preço e histórico." />
      ) : (
        <ul className="space-y-2">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Card className="p-0">
                <Link href={`/overview/fornecedores/${s.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-bg-elev-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <p className="truncate text-xs text-text-muted">
                      {s.category ?? "—"}
                      {s.phone && <> · {s.phone}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
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
                  {s.phone && (
                    <a
                      href={waLink(s.phone)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Abrir WhatsApp"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success hover:bg-success/25"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        remove(s.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  )}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PhoneLink({ phone, label }: { phone: string; label?: string }) {
  return (
    <a
      href={waLink(phone)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-primary hover:underline"
    >
      <Phone className="h-3.5 w-3.5" /> {label ?? phone}
    </a>
  );
}
