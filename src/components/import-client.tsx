"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileUp, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

type Row = { date: string; amount: number; description: string; external_id: string | null; include: boolean };

export function ImportClient({ householdId, accounts }: { householdId: string; accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [account, setAccount] = useState("");
  const [done, setDone] = useState<number | null>(null);

  async function onFile(file: File) {
    setLoading(true);
    setDone(null);
    const content = await file.text();
    const res = await fetch("/api/import/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, content }),
    });
    setLoading(false);
    if (!res.ok) {
      alert("Não consegui ler esse arquivo. Use extrato OFX ou CSV.");
      return;
    }
    const data = await res.json();
    setRows((data.items as any[]).map((r) => ({ ...r, include: true })));
  }

  async function doImport() {
    const sel = rows.filter((r) => r.include);
    if (!sel.length) return;
    setImporting(true);
    const payload = sel.map((r) => ({
      household_id: householdId,
      account_id: account || null,
      type: r.amount < 0 ? "expense" : "income",
      amount: Math.abs(r.amount),
      description: r.description,
      occurred_on: r.date,
      source: "import",
      external_id: r.external_id,
    }));
    // dedup por external_id quando houver
    const withId = payload.filter((p) => p.external_id);
    const noId = payload.filter((p) => !p.external_id);
    if (withId.length) await supabase.from("transactions").upsert(withId, { onConflict: "household_id,external_id", ignoreDuplicates: true });
    if (noId.length) await supabase.from("transactions").insert(noId);
    setImporting(false);
    setDone(sel.length);
    setRows([]);
    router.refresh();
  }

  const total = rows.filter((r) => r.include).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <Card>
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-center transition hover:border-brand hover:bg-brand-soft/30">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-sm font-medium">Arraste ou escolha o extrato</p>
            <p className="text-xs text-muted">Formatos OFX ou CSV (data, descrição, valor)</p>
          </div>
          <input type="file" accept=".ofx,.csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </Card>

      {done !== null && (
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <Check className="h-4 w-4" /> {done} lançamentos importados.
          </div>
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <p className="text-sm font-medium">{rows.length} encontrados · selecionado {brl(Math.abs(total))}</p>
            <div className="flex items-center gap-2">
              <Select value={account} onChange={(e) => setAccount(e.target.value)} className="w-40">
                <option value="">Sem conta</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
              <Button onClick={doImport} loading={importing}>
                <Upload className="h-4 w-4" /> Importar
              </Button>
            </div>
          </div>
          <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                  className="h-4 w-4 accent-[hsl(var(--brand))]"
                />
                <span className="w-20 shrink-0 text-xs text-muted">{new Date(r.date).toLocaleDateString("pt-BR")}</span>
                <span className="flex-1 truncate">{r.description}</span>
                <span className={`num font-medium ${r.amount < 0 ? "text-danger" : "text-success"}`}>{brl(r.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
