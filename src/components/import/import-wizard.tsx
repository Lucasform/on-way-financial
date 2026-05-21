"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ImportDropzone } from "@/components/import/import-dropzone";
import { ImportPreviewTable } from "@/components/import/import-preview-table";
import { Money } from "@/components/ui/money";
import { parseCsv } from "@/lib/import/csv";
import { parseXlsx } from "@/lib/import/excel";
import { summarize, type ImportRow } from "@/lib/import/types";

type Step = "upload" | "review" | "done";

interface Props {
  canWrite: boolean;
  categories: { id: string; name: string; type: string; color: string | null; icon: string | null }[];
  methods: { id: string; name: string; kind: string }[];
}

export function ImportWizard({ canWrite, categories, methods }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileMeta, setFileMeta] = useState<{ name: string; kind: string } | null>(null);
  const [loading, setLoading] = useState<null | "parse" | "categorize" | "dedupe" | "commit">(null);
  const [inserted, setInserted] = useState<number>(0);

  const summary = useMemo(() => summarize(rows), [rows]);

  async function handleFile(file: File) {
    if (!file) return;
    setLoading("parse");
    setFileMeta({ name: file.name, kind: file.type });
    try {
      const name = file.name.toLowerCase();
      let parsed: ImportRow[] = [];

      if (name.endsWith(".csv") || file.type === "text/csv") {
        const text = await file.text();
        parsed = parseCsv(text);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const buf = await file.arrayBuffer();
        parsed = parseXlsx(buf);
      } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/import/parse-pdf", { method: "POST", body: fd });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
          const map: Record<string, string> = {
            pdf_empty_or_scanned:
              "PDF parece ser escaneado (sem texto). Exporte o extrato como PDF digital ou use CSV/XLSX.",
            pdf_password_protected: "PDF protegido por senha. Remova a senha e tente de novo.",
            pdf_invalid: "Arquivo PDF inválido ou corrompido.",
            pdf_parse_failed: "Falha ao ler o PDF.",
            file_too_large: "Arquivo maior que 5 MB. Reduza o intervalo e tente de novo.",
            ai_failed: "A IA não conseguiu extrair as transações. Tente um arquivo CSV/XLSX.",
          };
          const human = err.error && map[err.error] ? map[err.error] : "Falha ao processar o PDF.";
          throw new Error(err.detail ? `${human} (${err.detail})` : human);
        }
        const data = (await res.json()) as { rows: ImportRow[] };
        parsed = data.rows;
      } else {
        throw new Error("Formato não suportado. Use CSV, XLSX ou PDF.");
      }

      if (parsed.length === 0) {
        toast.warning("Nenhuma transação reconhecida no arquivo.");
        setLoading(null);
        return;
      }

      // Para CSV/XLSX: chamar dedupe + categorize no server
      if (!name.endsWith(".pdf")) {
        setLoading("dedupe");
        const dedupeRes = await fetch("/api/import/dedupe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rows: parsed }),
        });
        if (dedupeRes.ok) {
          const d = (await dedupeRes.json()) as { rows: ImportRow[] };
          parsed = d.rows;
        }
      }

      setRows(parsed);
      setStep("review");
      toast.success(`${parsed.length} transações extraídas. Revise antes de importar.`);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  }

  async function categorizeAll() {
    if (!canWrite) return;
    setLoading("categorize");
    try {
      const res = await fetch("/api/import/categorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Falha na categorização.");
      const data = (await res.json()) as { rows: ImportRow[] };
      setRows(data.rows);
      toast.success("Categorização concluída.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  }

  async function commit() {
    if (!canWrite) return;
    setLoading("commit");
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error("Falha ao importar.");
      const data = (await res.json()) as { inserted: number };
      setInserted(data.inserted);
      setStep("done");
      toast.success(`${data.inserted} transações importadas!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  }

  function reset() {
    setRows([]);
    setFileMeta(null);
    setInserted(0);
    setStep("upload");
  }

  if (step === "upload") {
    return (
      <div className="space-y-4">
        <Stepper step={1} />
        <ImportDropzone onFile={handleFile} disabled={loading !== null} />

        <div className="grid gap-3 sm:grid-cols-3">
          <FormatCard
            icon={<FileSpreadsheet className="h-5 w-5 text-success" />}
            title="Excel / CSV"
            desc="Mais simples e preciso. Cabeçalho com data/descrição/valor."
          />
          <FormatCard
            icon={<FileText className="h-5 w-5 text-danger" />}
            title="PDF de extrato"
            desc="IA lê o texto e extrai as transações. Funciona com extratos digitais."
          />
          <FormatCard
            icon={<Sparkles className="h-5 w-5 text-primary" />}
            title="IA categoriza"
            desc="Depois de extrair, sugere categoria e método pra cada linha."
          />
        </div>

        <details className="surface-elevated overflow-hidden">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium select-none">
            <FileSpreadsheet className="h-4 w-4 text-success" />
            Modelo de planilha aceito (Excel / CSV)
          </summary>
          <div className="space-y-3 border-t border-border px-4 py-4 text-sm">
            <p className="text-text-muted">
              A <strong>linha 1</strong> precisa ser o cabeçalho. Colunas extras (Tipo, Categoria, Saldo, etc) são ignoradas.
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-bg-elev-2 text-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Data</th>
                    <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                    <th className="px-3 py-2 text-right font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  <tr>
                    <td className="px-3 py-2">2026-02-02</td>
                    <td className="px-3 py-2">JULIANA MENDES</td>
                    <td className="px-3 py-2 text-right text-danger">-65,00</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">2026-02-04</td>
                    <td className="px-3 py-2">EVERCOL INDUSTRIA</td>
                    <td className="px-3 py-2 text-right text-success">8007,31</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">02/02/2026</td>
                    <td className="px-3 py-2">DROGAL FARMACEUTICA</td>
                    <td className="px-3 py-2 text-right text-danger">-73,05</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="space-y-1 text-xs text-text-muted">
              <li>
                <strong className="text-text">Data:</strong> <code>2026-02-02</code> ou <code>02/02/2026</code>
              </li>
              <li>
                <strong className="text-text">Valor:</strong> negativo (<code>-65,00</code>) vira despesa, positivo (<code>8007,31</code>) vira receita. Use vírgula como decimal.
              </li>
              <li>
                <strong className="text-text">Cabeçalho aceito:</strong> <code>Data</code>, <code>Descrição</code>, <code>Histórico</code>, <code>Valor</code>, <code>Amount</code>, etc.
              </li>
              <li>
                <strong className="text-text">Sem coluna Valor?</strong> Pode usar duas colunas separadas: <code>Débito</code> e <code>Crédito</code>.
              </li>
            </ul>
          </div>
        </details>

        {loading === "parse" && (
          <div className="surface flex items-center gap-3 p-4 text-sm text-text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Processando arquivo {fileMeta ? `(${fileMeta.name})` : ""}...
          </div>
        )}
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="space-y-4">
        <Stepper step={2} />
        <div className="surface-elevated flex flex-wrap items-center gap-3 p-4">
          <div className="flex-1">
            <p className="text-sm font-medium">{fileMeta?.name ?? "arquivo"}</p>
            <p className="text-xs text-text-muted">
              {summary.total} transações · {summary.selected} selecionadas · {summary.duplicates} duplicatas detectadas
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-text-muted">Entradas</span>
            <Money value={summary.income_total} tone="success" size="sm" className="num" />
            <span className="text-text-muted">·</span>
            <span className="text-text-muted">Saídas</span>
            <Money value={summary.expense_total} tone="danger" size="sm" className="num" />
          </div>
          <Button variant="outline" onClick={categorizeAll} disabled={loading !== null}>
            <Sparkles className="h-4 w-4" /> {loading === "categorize" ? "Categorizando..." : "Categorizar com IA"}
          </Button>
        </div>

        <ImportPreviewTable
          rows={rows}
          onChange={setRows}
          categories={categories}
          methods={methods}
        />

        <div className="flex justify-between gap-3">
          <Button variant="ghost" onClick={reset} disabled={loading !== null}>
            ← Recomeçar
          </Button>
          <Button onClick={commit} disabled={loading !== null || !canWrite || summary.selected === 0}>
            {loading === "commit"
              ? "Importando..."
              : `Importar ${summary.selected} transações →`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Stepper step={3} />
      <div className="surface-elevated p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">{inserted} transações importadas!</h2>
        <p className="mt-2 text-sm text-text-muted">
          Já estão no extrato. Você pode editar ou apagar individualmente.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            Importar outro arquivo
          </Button>
          <Button onClick={() => router.push("/transactions")}>Ver transações</Button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = ["Selecionar arquivo", "Revisar e categorizar", "Importar"];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {items.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border font-medium ${
                done
                  ? "border-success bg-success/15 text-success"
                  : active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-text-muted"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span className={active ? "text-text" : "text-text-muted"}>{label}</span>
            {n < items.length && <span className="w-6 border-t border-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function FormatCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="surface p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-text-muted">{desc}</p>
    </div>
  );
}
