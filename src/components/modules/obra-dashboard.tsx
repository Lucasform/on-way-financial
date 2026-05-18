"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Camera, Hammer, MessageSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Empty } from "@/components/ui/empty";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { fmtRelative } from "@/lib/dates";
import { normalizePhone } from "@/lib/utils";
import { percent } from "@/lib/money";

interface Module {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
}
interface Phase {
  id: string;
  name: string;
  planned_budget: number | null;
  status: "todo" | "doing" | "done" | "blocked";
  position: number;
  planned_start: string | null;
  planned_end: string | null;
}
interface Worker {
  id: string;
  name: string;
  role: string | null;
  whatsapp_phone: string | null;
  daily_rate: number | null;
}
interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  taken_at: string;
  phase_id: string | null;
}
interface Tx {
  id: string;
  amount: number | string;
  description: string | null;
  occurred_at: string;
  categories: { name: string; color: string | null } | null;
}

interface Props {
  module: Module;
  phases: Phase[];
  workers: Worker[];
  gallery: GalleryItem[];
  transactions: Tx[];
  householdId: string;
  userId: string;
  canWrite: boolean;
}

const KANBAN = ["todo", "doing", "done", "blocked"] as const;

export function ObraDashboard({ module, phases, workers, gallery, transactions, householdId, canWrite }: Props) {
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const pct = module.budget ? percent(total, Number(module.budget)) : 0;
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/modules" className="text-xs text-text-muted hover:text-text">← Módulos</Link>
          <h1 className="mt-1 text-2xl font-semibold">🧱 {module.name}</h1>
          <p className="text-sm text-text-muted">
            {module.start_date && <>Início {module.start_date}</>}{" "}
            {module.end_date && <>· Previsão {module.end_date}</>}
          </p>
        </div>
        <Badge variant={module.status === "active" ? "success" : "secondary"}>{module.status}</Badge>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Realizado</CardTitle></CardHeader>
          <CardContent className="pt-0"><Money value={total} size="xl" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">Orçamento</CardTitle></CardHeader>
          <CardContent className="pt-0"><Money value={module.budget} size="xl" tone="muted" /></CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-text-muted">% Orçamento usado</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            <p className="font-mono text-2xl">{pct.toFixed(1)}%</p>
            <div className="h-2 overflow-hidden rounded-full bg-bg-elev-2">
              <div
                className={`h-full ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-primary"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="phases">
        <TabsList>
          <TabsTrigger value="phases">Fases</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="gallery">Galeria</TabsTrigger>
          <TabsTrigger value="workers">Equipe</TabsTrigger>
        </TabsList>
        <TabsContent value="phases">
          <PhasesKanban moduleId={module.id} phases={phases} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="expenses">
          {transactions.length === 0 ? (
            <Empty icon={Hammer} title="Sem despesas" description="Adicione pela área de transações." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {transactions.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{t.description ?? t.categories?.name ?? "—"}</p>
                        <p className="text-xs text-text-muted">{fmtRelative(t.occurred_at)} · {t.categories?.name ?? "—"}</p>
                      </div>
                      <Money value={Number(t.amount)} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="gallery">
          <Gallery moduleId={module.id} householdId={householdId} initial={gallery} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="workers">
          <WorkersPanel moduleId={module.id} initial={workers} canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PhasesKanban({ moduleId, phases: initialPhases, canWrite }: { moduleId: string; phases: Phase[]; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const [phases, setPhases] = useState(initialPhases);
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState("");

  async function move(id: string, status: Phase["status"]) {
    if (!canWrite) return;
    start(async () => {
      await supabase.from("obra_phases").update({ status }).eq("id", id);
      setPhases((s) => s.map((p) => (p.id === id ? { ...p, status } : p)));
    });
  }

  function add() {
    if (!canWrite || !newName.trim()) return;
    start(async () => {
      const { data } = await supabase
        .from("obra_phases")
        .insert({ module_id: moduleId, name: newName.trim(), position: phases.length * 10 + 10 })
        .select("*")
        .single();
      if (data) setPhases((s) => [...s, data as Phase]);
      setNewName("");
    });
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova fase..." />
          <Button onClick={add} disabled={pending}><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {KANBAN.map((col) => (
          <div key={col} className="rounded-lg border border-border bg-bg-elev p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-text-muted">
              {col === "todo" ? "A fazer" : col === "doing" ? "Em andamento" : col === "done" ? "Concluídas" : "Bloqueadas"}
            </div>
            <ul className="space-y-2">
              {phases.filter((p) => p.status === col).map((p) => (
                <li key={p.id} className="rounded-md bg-bg-elev-2 p-2 text-sm">
                  <p className="font-medium">{p.name}</p>
                  {p.planned_budget && <p className="text-xs text-text-muted"><Money value={p.planned_budget} size="sm" tone="muted" /></p>}
                  {canWrite && (
                    <div className="mt-2 flex gap-1">
                      {KANBAN.filter((c) => c !== col).map((c) => (
                        <Button key={c} variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => move(p.id, c)}>
                          → {c}
                        </Button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Gallery({ moduleId, householdId, initial, canWrite }: { moduleId: string; householdId: string; initial: GalleryItem[]; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || !canWrite) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const path = `${householdId}/${moduleId}/${crypto.randomUUID()}-${f.name}`;
        const { error } = await supabase.storage.from("obra-gallery").upload(path, f, { cacheControl: "3600" });
        if (error) { toast.error("Falha no upload."); continue; }
        const { data: pub } = supabase.storage.from("obra-gallery").getPublicUrl(path);
        const url = pub.publicUrl;
        const { data: row } = await supabase
          .from("obra_gallery")
          .insert({ module_id: moduleId, image_url: url, caption: null })
          .select("*")
          .single();
        if (row) setItems((s) => [row as GalleryItem, ...s]);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div>
          <Label htmlFor="gphoto" className="sr-only">Adicionar foto</Label>
          <Input id="gphoto" type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => upload(e.target.files)} />
        </div>
      )}
      {items.length === 0 ? (
        <Empty icon={Camera} title="Galeria da obra vazia" description="Bora registrar essa transformação 📸" />
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {items.map((i) => (
            <a key={i.id} href={i.image_url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-md border border-border">
              <img src={i.image_url} alt={i.caption ?? "Foto"} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkersPanel({ moduleId, initial, canWrite }: { moduleId: string; initial: Worker[]; canWrite: boolean }) {
  const supabase = createSupabaseBrowser();
  const [workers, setWorkers] = useState(initial);
  const [draft, setDraft] = useState<Partial<Worker>>({ name: "", role: "", whatsapp_phone: "" });
  const [composer, setComposer] = useState<{ workerId: string; body: string } | null>(null);
  const [pending, start] = useTransition();

  function addWorker() {
    if (!canWrite || !draft.name) return;
    start(async () => {
      const { data } = await supabase
        .from("obra_workers")
        .insert({
          module_id: moduleId,
          name: draft.name!,
          role: draft.role ?? null,
          whatsapp_phone: draft.whatsapp_phone ? normalizePhone(draft.whatsapp_phone) : null,
          daily_rate: draft.daily_rate ?? null,
        })
        .select("*")
        .single();
      if (data) setWorkers((s) => [...s, data as Worker]);
      setDraft({ name: "", role: "", whatsapp_phone: "" });
    });
  }

  async function sendMessage(workerId: string, body: string) {
    const w = workers.find((x) => x.id === workerId);
    if (!w?.whatsapp_phone) return;
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: w.whatsapp_phone, body, module_id: moduleId, worker_id: workerId }),
    });
    if (!res.ok) {
      toast.error("Falha ao enviar.");
      return;
    }
    toast.success("Mensagem enviada.");
    setComposer(null);
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Nome" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input placeholder="Função (pedreiro, eletricista...)" value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
            <Input placeholder="WhatsApp" value={draft.whatsapp_phone ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp_phone: e.target.value })} />
            <Button onClick={addWorker} disabled={pending || !draft.name}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>
        </Card>
      )}
      <ul className="space-y-2">
        {workers.map((w) => (
          <li key={w.id}>
            <Card className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="font-semibold">{w.name}</p>
                <p className="text-xs text-text-muted">{w.role ?? "—"} · {w.whatsapp_phone ?? "Sem WhatsApp"}</p>
              </div>
              {w.whatsapp_phone && (
                <Button variant="outline" size="sm" onClick={() => setComposer({ workerId: w.id, body: "" })}>
                  <MessageSquare className="h-4 w-4" /> Mensagem
                </Button>
              )}
            </Card>
            {composer?.workerId === w.id && (
              <Card className="mt-2 p-4">
                <Textarea value={composer.body} onChange={(e) => setComposer({ ...composer, body: e.target.value })} placeholder="Olá! Pode passar amanhã às 9h?" />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setComposer(null)}>Cancelar</Button>
                  <Button size="sm" disabled={!composer.body.trim()} onClick={() => sendMessage(w.id, composer.body)}>
                    <Send className="h-4 w-4" /> Enviar
                  </Button>
                </div>
              </Card>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
