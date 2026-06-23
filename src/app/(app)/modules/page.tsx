import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { ModuleCreate } from "@/components/modules/module-create";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { brl, pct } from "@/lib/utils";
import { KINDS, STATUS_LABEL, type ModuleKind } from "@/lib/modules";

export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const { data: modules } = await supabase
    .from("modules")
    .select("id, kind, name, status, budget")
    .eq("household_id", hid)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const list = modules ?? [];

  // realizado por módulo = soma das despesas vinculadas
  const { data: exp } = await supabase
    .from("transactions")
    .select("module_id, amount, type")
    .eq("household_id", hid)
    .not("module_id", "is", null);
  const spent = new Map<string, number>();
  (exp ?? []).forEach((t) => {
    if (t.type !== "expense" || !t.module_id) return;
    spent.set(t.module_id, (spent.get(t.module_id) ?? 0) + Number(t.amount));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Módulos</h1>
          <p className="text-sm text-fg-soft">Obra, viagem, carro, educação, presentes e mais.</p>
        </div>
        <ModuleCreate householdId={hid} />
      </div>

      {list.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-muted">
            Nenhum módulo ainda. Crie um para planejar e acompanhar (orçado × realizado).
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => {
            const C = KINDS[m.kind as ModuleKind] ?? KINDS.custom;
            const Icon = C.icon;
            const used = spent.get(m.id) ?? 0;
            const p = Number(m.budget) > 0 ? (used / Number(m.budget)) * 100 : 0;
            return (
              <Link key={m.id} href={`/modules/${m.id}`} className="block transition hover:-translate-y-0.5">
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: C.accent }}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <CardTitle>{m.name}</CardTitle>
                    </div>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-fg-soft">
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </div>
                  <p className="num mt-3 text-lg font-semibold">{brl(used)}</p>
                  <p className="text-xs text-muted">de {brl(Number(m.budget))} · {C.label}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${p > 100 ? "bg-danger" : "bg-brand"}`} style={{ width: `${Math.min(p, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{pct(p)} do orçamento</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
