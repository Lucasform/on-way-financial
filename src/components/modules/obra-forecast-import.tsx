"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface ParsedItem {
  category: string;
  name: string;
  planned_value: number;
  notes?: string | null;
}

interface Props {
  moduleId: string;
}

export function ObraForecastImport({ moduleId }: Props) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedItem[] | null>(null);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setLoading(true);
    setPreview(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      const csv = XLSX.utils.sheet_to_csv(sheet!);
      if (!csv.trim()) {
        toast.error("Planilha vazia ou ilegível.");
        return;
      }

      const res = await fetch("/api/ai/parse-forecast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: csv }),
      });
      if (!res.ok) {
        toast.error("Falha ao organizar a planilha com IA.");
        return;
      }
      const data = (await res.json()) as { items: ParsedItem[] };
      if (!data.items?.length) {
        toast.warning("A IA não conseguiu identificar linhas de previsão nessa planilha.");
        return;
      }
      setPreview(data.items);
    } catch {
      toast.error("Falha ao ler o arquivo. Confirme que é .xlsx, .xls ou .csv.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!preview?.length) return;
    setLoading(true);
    try {
      const rows = preview.map((it) => ({
        module_id: moduleId,
        category: it.category,
        name: it.name,
        unit: "un",
        quantity: 1,
        unit_price: it.planned_value,
        status: "planned" as const,
        notes: it.notes ?? "Importado da planilha de previsão",
      }));
      const { data, error } = await supabase.from("obra_items").insert(rows).select("id");
      if (error) {
        toast.error("Falha ao salvar itens.");
        return;
      }
      toast.success(`${data?.length ?? rows.length} itens de previsão importados.`);
      setPreview(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Importar planilha de previsão</p>
      </div>
      <p className="mb-3 text-xs text-text-muted">
        Envie a planilha do banco (.xlsx, .xls ou .csv) e a IA organiza em tipo, valor previsto e
        observações — vira item planejado em Materiais/Previsão.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="fsheet" className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 text-xs font-medium hover:bg-bg-elev-2">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Escolher planilha
          </span>
        </Label>
        <Input
          id="fsheet"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={loading}
          onChange={(e) => handleFile(e.target.files)}
        />
      </div>

      {preview && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-text-muted">{preview.length} linha(s) identificada(s):</p>
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                {preview.map((it, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5 text-text-muted">{it.category}</td>
                    <td className="px-2 py-1.5">{it.name}</td>
                    <td className="px-2 py-1.5 text-right num">
                      {it.planned_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmImport} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Importar {preview.length} itens
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
