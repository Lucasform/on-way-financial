import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";

const KIND_META: Record<string, { emoji: string; label: string; desc: string }> = {
  obra: { emoji: "🧱", label: "Obra", desc: "Reforma com fases, equipe, galeria e despesas" },
  travel: { emoji: "✈️", label: "Viagem", desc: "Itinerário, reservas e gastos por dia" },
  car: { emoji: "🚗", label: "Carro novo", desc: "Compare modelos e simule financiamento" },
  gift: { emoji: "🎁", label: "Presente", desc: "Lista de presentes e ocasiões" },
  education: { emoji: "🎓", label: "Educação", desc: "Cursos, mensalidades e projeção anual" },
  custom: { emoji: "✨", label: "Personalizado", desc: "Crie campos do jeito que precisar" },
};

const ACTIVE = [
  {
    id: "m1",
    kind: "obra",
    name: "Reforma cozinha 2026",
    status: "active",
    budget: 35000,
    used: 19450,
    start_date: "2026-03-01",
    end_date: "2026-08-15",
  },
  {
    id: "m2",
    kind: "travel",
    name: "Lisboa em julho",
    status: "planning",
    budget: 18000,
    used: 6200,
    start_date: "2026-07-10",
    end_date: "2026-07-25",
  },
  {
    id: "m3",
    kind: "car",
    name: "Honda HR-V 2026",
    status: "planning",
    budget: 145000,
    used: 28000,
    start_date: null,
    end_date: null,
  },
];

export default function PreviewModulesPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Módulos</h1>
          <p className="text-sm text-text-muted">Espaços especiais para grandes projetos da família</p>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Ativos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVE.map((m) => {
            const meta = KIND_META[m.kind] ?? KIND_META.custom!;
            const pct = m.budget > 0 ? Math.min(100, (m.used / m.budget) * 100) : 0;
            return (
              <article key={m.id} className="surface-elevated surface-hover overflow-hidden p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold">
                    {meta.emoji} {m.name}
                  </h3>
                  <Badge variant={m.status === "active" ? "success" : "secondary"}>{m.status}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-text-muted">Usado</span>
                    <Money value={m.used} size="sm" />
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-text-muted">Orçamento</span>
                    <Money value={m.budget} size="sm" tone="muted" />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg-elev-2">
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted">{pct.toFixed(0)}% do orçamento utilizado</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Ativar novo módulo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(KIND_META).map(([k, meta]) => (
            <article key={k} className="surface surface-hover p-5">
              <p className="text-3xl">{meta.emoji}</p>
              <p className="mt-2 font-semibold">{meta.label}</p>
              <p className="mt-1 text-sm text-text-muted">{meta.desc}</p>
              <Link
                href="/login"
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                Criar →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
