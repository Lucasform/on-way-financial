"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  position: number;
  is_system: boolean;
}

interface Props {
  initial: Category[];
  householdId: string;
  canWrite: boolean;
}

export function CategoryManager({ initial, householdId, canWrite }: Props) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState("#6366F1");
  const [pending, start] = useTransition();

  function add() {
    if (!name.trim() || !canWrite) return;
    start(async () => {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          household_id: householdId,
          name: name.trim(),
          type,
          color,
          position: items.length * 10 + 10,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error("Falha ao criar.");
        return;
      }
      setItems((s) => [...s, data as Category]);
      setName("");
      toast.success("Categoria criada.");
    });
  }

  function remove(id: string) {
    if (!canWrite) return;
    start(async () => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) {
        toast.error("Falha ao remover.");
        return;
      }
      setItems((s) => s.filter((c) => c.id !== id));
    });
  }

  const expenses = items.filter((c) => c.type === "expense");
  const incomes = items.filter((c) => c.type === "income");

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="cn">Nome</Label>
              <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Streaming" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ct">Tipo</Label>
              <select
                id="ct"
                value={type}
                onChange={(e) => setType(e.target.value as "expense" | "income")}
                className="flex h-10 w-full rounded-md border border-border bg-bg-elev px-3 text-sm"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cc">Cor</Label>
              <Input id="cc" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <Button onClick={add} disabled={pending || !name.trim()}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <CategoryList title="Despesas" items={expenses} onRemove={remove} canWrite={canWrite} />
      <CategoryList title="Receitas" items={incomes} onRemove={remove} canWrite={canWrite} />
    </div>
  );
}

function CategoryList({
  title,
  items,
  onRemove,
  canWrite,
}: {
  title: string;
  items: Category[];
  onRemove: (id: string) => void;
  canWrite: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold">{title}</div>
      <ul className="divide-y divide-border">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: c.color ?? "#9CA3AF" }} />
              {c.name}
              {c.is_system && <Badge variant="secondary">padrão</Badge>}
            </div>
            {canWrite && (
              <Button variant="ghost" size="icon" onClick={() => onRemove(c.id)}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
