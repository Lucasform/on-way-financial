import Link from "next/link";

import { ModuleCreateDialog } from "@/components/modules/module-create-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KIND_META: Record<string, { emoji: string; label: string; href: (id: string) => string }> = {
  obra: { emoji: "🧱", label: "Obra", href: (id) => `/modules/obra/${id}` },
  travel: { emoji: "✈️", label: "Viagem", href: (id) => `/modules/travel/${id}` },
  car: { emoji: "🚗", label: "Carro novo", href: (id) => `/modules/car/${id}` },
  gift: { emoji: "🎁", label: "Presente", href: (id) => `/modules/gift/${id}` },
  education: { emoji: "🎓", label: "Educação", href: (id) => `/modules/education/${id}` },
  custom: { emoji: "✨", label: "Personalizado", href: (id) => `/modules/custom/${id}` },
};

export default async function ModulesPage() {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const { data: modules } = await supabase
    .from("modules")
    .select("id, kind, name, status, budget, start_date, end_date, cover_image_url")
    .eq("household_id", ctx.householdId)
    .order("created_at", { ascending: false });

  const moduleIds = (modules ?? []).map((m) => m.id);
  const totalsByModule: Record<string, number> = {};
  if (moduleIds.length > 0) {
    const { data: agg } = await supabase
      .from("transactions")
      .select("module_id, amount")
      .in("module_id", moduleIds)
      .eq("type", "expense");
    for (const row of agg ?? []) {
      if (row.module_id) totalsByModule[row.module_id] = (totalsByModule[row.module_id] ?? 0) + Number(row.amount);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Módulos</h1>
          <p className="text-sm text-text-muted">Espaços especiais para grandes projetos da família.</p>
        </div>
        <ModuleCreateDialog householdId={ctx.householdId} userId={ctx.userId} canWrite={ctx.role !== "viewer"} />
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Ativos</h2>
        {(!modules || modules.length === 0) ? (
          <Empty title="Nenhum módulo ainda" description="Crie um para começar a planejar." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => {
              const meta = KIND_META[m.kind] ?? KIND_META.custom!;
              const used = totalsByModule[m.id] ?? 0;
              const pct = m.budget && m.budget > 0 ? Math.min(100, (used / Number(m.budget)) * 100) : 0;
              return (
                <Link key={m.id} href={meta.href(m.id)}>
                  <Card className="transition-colors hover:bg-bg-elev-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{meta.emoji} {m.name}</CardTitle>
                        <Badge variant={m.status === "active" ? "success" : "secondary"}>{m.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-text-muted">Usado</span>
                        <Money value={used} size="sm" />
                      </div>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-text-muted">Orçamento</span>
                        <Money value={m.budget} size="sm" tone="muted" />
                      </div>
                      {m.budget && (
                        <div className="h-1.5 overflow-hidden rounded-full bg-bg-elev-2">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Ativar novo módulo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(["obra", "travel", "car", "gift", "education", "custom"] as const).map((k) => {
            const meta = KIND_META[k]!;
            return (
              <Card key={k} className="p-4">
                <p className="text-3xl">{meta.emoji}</p>
                <p className="mt-2 font-semibold">{meta.label}</p>
                <p className="mt-1 text-sm text-text-muted">{describeKind(k)}</p>
                <div className="mt-3">
                  <ModuleCreateDialog
                    householdId={ctx.householdId}
                    userId={ctx.userId}
                    canWrite={ctx.role !== "viewer"}
                    defaultKind={k}
                    triggerLabel="Criar"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function describeKind(k: string): string {
  switch (k) {
    case "obra": return "Reforma com fases, equipe, galeria e despesas.";
    case "travel": return "Itinerário, reservas e gastos por dia.";
    case "car": return "Compare modelos e simule financiamento.";
    case "gift": return "Lista de presentes e ocasiões.";
    case "education": return "Cursos, mensalidades e projeção anual.";
    default: return "Crie campos do jeito que precisar.";
  }
}
