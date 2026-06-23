"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/utils";

type Parsed = {
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string;
  category_hint: string | null;
  occurred_on: string | null;
  project_hint?: string | null;
  confidence: number;
};

type Mod = { id: string; name: string };

export function AILauncher({ householdId, modules = [] }: { householdId: string; modules?: Mod[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [moduleId, setModuleId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    const res = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Não consegui interpretar. Reformule (ex: \"gastei 80 no mercado ontem\").");
      return;
    }
    const data = await res.json();
    setParsed(data.parsed);
    // pré-seleciona a obra se a frase citou o nome de um módulo
    const hint = (data.parsed?.project_hint || "").toLowerCase();
    const match = hint ? modules.find((m) => m.name.toLowerCase().includes(hint) || hint.includes(m.name.toLowerCase())) : null;
    setModuleId(match?.id ?? "");
  }

  async function handleConfirm() {
    if (!parsed) return;
    setLoading(true);
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    let category_id: string | null = null;
    if (parsed.category_hint) {
      const { data } = await supabase
        .from("categories")
        .select("id")
        .eq("household_id", householdId)
        .ilike("name", parsed.category_hint)
        .maybeSingle();
      category_id = data?.id ?? null;
    }
    await supabase.from("transactions").insert({
      household_id: householdId,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      category_id,
      occurred_on: parsed.occurred_on || today,
      module_id: moduleId || null,
      source: "ai",
      ai_confidence: parsed.confidence,
    });
    setLoading(false);
    setParsed(null);
    setText("");
    setModuleId("");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-medium text-brand">
        <Sparkles className="h-4 w-4" />
        Lançar com IA
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
          placeholder="ex: gastei 120 no mercado hoje"
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
        <button
          onClick={handleParse}
          disabled={loading}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading && !parsed ? <Loader2 className="h-4 w-4 animate-spin" /> : "Interpretar"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {parsed && (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface-2 p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span
              className={`font-semibold ${parsed.type === "income" ? "text-success" : "text-danger"}`}
            >
              {parsed.type === "income" ? "+" : "-"}
              {brl(parsed.amount)}
            </span>{" "}
            <span className="text-fg-soft">{parsed.description}</span>
            {parsed.category_hint && (
              <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                {parsed.category_hint}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="grid h-8 w-8 place-items-center rounded-lg bg-success/15 text-success hover:bg-success/25"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setParsed(null)}
              className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-fg-soft hover:bg-danger/15 hover:text-danger"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {modules.length > 0 && (
          <select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">Sem obra/módulo (só no geral)</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                Obra: {m.name}
              </option>
            ))}
          </select>
        )}
        </div>
      )}
    </div>
  );
}
