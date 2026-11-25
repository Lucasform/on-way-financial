"use client";

import {
  ChevronDown,
  ChevronUp,
  Copy,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

export interface SiteData {
  address: string;
  condo: string;
  quadra: string;
  lote: string;
  district: string;
  city: string;
  cep: string;
  maps_url: string;
  contact: string;
  notes: string;
}

export interface PersonData {
  name: string;
  cpf: string;
  rg: string;
  phone: string;
  email: string;
  extra: string;
}

const EMPTY_SITE: SiteData = {
  address: "",
  condo: "",
  quadra: "",
  lote: "",
  district: "",
  city: "",
  cep: "",
  maps_url: "",
  contact: "",
  notes: "",
};
const EMPTY_PERSON: PersonData = { name: "", cpf: "", rg: "", phone: "", email: "", extra: "" };

const SITE_FIELDS: { key: keyof SiteData; label: string; placeholder: string; wide?: boolean }[] = [
  { key: "address", label: "Endereço", placeholder: "Rua e número", wide: true },
  { key: "condo", label: "Condomínio / loteamento", placeholder: "Nome do condomínio" },
  { key: "district", label: "Bairro", placeholder: "Bairro" },
  { key: "quadra", label: "Quadra", placeholder: "Ex: I5" },
  { key: "lote", label: "Lote", placeholder: "Ex: 03" },
  { key: "city", label: "Cidade / UF", placeholder: "Ex: Votorantim/SP" },
  { key: "cep", label: "CEP", placeholder: "00000-000" },
  {
    key: "maps_url",
    label: "Link da localização (Google Maps)",
    placeholder: "Cole o link do mapa",
    wide: true,
  },
  {
    key: "contact",
    label: "Contato na obra (entregas)",
    placeholder: "Nome e telefone",
    wide: true,
  },
];

const PERSON_FIELDS: { key: keyof PersonData; label: string; placeholder: string }[] = [
  { key: "name", label: "Nome completo", placeholder: "Nome completo" },
  { key: "cpf", label: "CPF", placeholder: "000.000.000-00" },
  { key: "rg", label: "RG", placeholder: "RG" },
  { key: "phone", label: "Telefone", placeholder: "(15) 90000-0000" },
  { key: "email", label: "E-mail", placeholder: "email@exemplo.com" },
];

function readSite(config: Json): SiteData {
  const c = (
    config && typeof config === "object" && !Array.isArray(config) ? config : {}
  ) as Record<string, unknown>;
  const s = (c.site && typeof c.site === "object" ? c.site : {}) as Record<string, unknown>;
  const out = { ...EMPTY_SITE };
  for (const k of Object.keys(EMPTY_SITE) as (keyof SiteData)[])
    if (typeof s[k] === "string") out[k] = s[k] as string;
  return out;
}

function readPeople(config: Json): PersonData[] {
  const c = (
    config && typeof config === "object" && !Array.isArray(config) ? config : {}
  ) as Record<string, unknown>;
  const list = Array.isArray(c.people) ? c.people : [];
  return list.map((p) => {
    const r = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const out = { ...EMPTY_PERSON };
    for (const k of Object.keys(EMPTY_PERSON) as (keyof PersonData)[])
      if (typeof r[k] === "string") out[k] = r[k] as string;
    return out;
  });
}

function mapsLink(s: SiteData): string {
  if (s.maps_url.trim()) return s.maps_url.trim();
  const q = [s.address, s.condo, s.district, s.city, s.cep]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

function siteText(s: SiteData): string {
  const lote = [
    s.quadra.trim() && `Quadra ${s.quadra.trim()}`,
    s.lote.trim() && `Lote ${s.lote.trim()}`,
  ]
    .filter(Boolean)
    .join(", ");
  const city = [s.city.trim(), s.cep.trim() && `CEP ${s.cep.trim()}`].filter(Boolean).join(", ");
  const link = mapsLink(s);
  return [
    "*Dados da obra*",
    s.address.trim() && `Endereço: ${s.address.trim()}`,
    s.condo.trim() && `Condomínio: ${s.condo.trim()}`,
    lote,
    s.district.trim() && `Bairro: ${s.district.trim()}`,
    city,
    link && `Localização: ${link}`,
    s.contact.trim() && `Contato na obra: ${s.contact.trim()}`,
    s.notes.trim() && `Observações: ${s.notes.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function personText(p: PersonData): string {
  return [
    p.name.trim() && `Nome: ${p.name.trim()}`,
    p.cpf.trim() && `CPF: ${p.cpf.trim()}`,
    p.rg.trim() && `RG: ${p.rg.trim()}`,
    p.phone.trim() && `Telefone: ${p.phone.trim()}`,
    p.email.trim() && `E-mail: ${p.email.trim()}`,
    p.extra.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

async function copy(text: string, what: string) {
  if (!text.trim()) {
    toast.error("Nada pra copiar ainda. Preencha os dados.");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copiados.`);
  } catch {
    toast.error("Não consegui copiar.");
  }
}

const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export function ObraSiteCard({
  moduleId,
  config,
  canWrite,
}: {
  moduleId: string;
  config: Json;
  canWrite: boolean;
}) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [site, setSite] = useState<SiteData>(() => readSite(config));
  const [people, setPeople] = useState<PersonData[]>(() => readPeople(config));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftSite, setDraftSite] = useState<SiteData>(site);
  const [draftPeople, setDraftPeople] = useState<PersonData[]>(people);
  const [saving, setSaving] = useState(false);

  const text = siteText(site);
  const summary = [
    site.address,
    site.condo,
    [site.quadra && `Q ${site.quadra}`, site.lote && `L ${site.lote}`].filter(Boolean).join(" "),
    site.city,
  ]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(" · ");
  const link = mapsLink(site);
  const empty = !summary && people.length === 0;

  function startEdit() {
    setDraftSite(site);
    setDraftPeople(people.length > 0 ? people : [{ ...EMPTY_PERSON }]);
    setEditing(true);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const { data: current, error: readErr } = await supabase
        .from("modules")
        .select("config")
        .eq("id", moduleId)
        .single();
      if (readErr) throw readErr;
      const base = (
        current?.config && typeof current.config === "object" && !Array.isArray(current.config)
          ? current.config
          : {}
      ) as Record<string, Json>;
      const cleanPeople = draftPeople.filter((p) => Object.values(p).some((v) => v.trim()));
      const next = { ...base, site: { ...draftSite }, people: cleanPeople } as unknown as Json;
      const { error } = await supabase.from("modules").update({ config: next }).eq("id", moduleId);
      if (error) throw error;
      setSite(draftSite);
      setPeople(cleanPeople);
      setEditing(false);
      toast.success("Dados salvos.");
      router.refresh();
    } catch {
      toast.error("Não consegui salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Dados da obra</span>
            <span className="block truncate text-xs text-text-muted">
              {empty
                ? "Endereço, quadra, lote e dados pessoais pra mandar aos fornecedores"
                : summary || "Dados pessoais"}
            </span>
          </span>
          {open ? (
            <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-text-muted" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-text-muted" />
          )}
        </button>
        {!empty && !editing && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs"
              onClick={() => copy(text, "Dados da obra")}
            >
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
            <a
              href={whatsappShare(text)}
              target="_blank"
              rel="noreferrer"
              className="bg-success/15 hover:bg-success/25 inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-success"
              aria-label="Enviar dados da obra no WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </div>
        )}
        {empty && canWrite && !editing && (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={startEdit}>
            <Plus className="h-3.5 w-3.5" /> Preencher
          </Button>
        )}
      </div>

      {open && !editing && !empty && (
        <div className="space-y-4 border-t border-border px-4 py-3 text-sm">
          <div className="space-y-1">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm [overflow-wrap:anywhere]">
              {text.replace("*Dados da obra*\n", "")}
            </pre>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" /> Abrir no mapa
              </a>
            )}
          </div>

          {people.map((p, i) => {
            const t = personText(p);
            return (
              <div key={i} className="space-y-1.5 rounded-lg border border-border p-3">
                <p className="flex items-center gap-1.5 font-medium">
                  <UserRound className="h-4 w-4 text-text-muted" /> {p.name || "Pessoa"}
                </p>
                <pre className="whitespace-pre-wrap break-words font-sans text-xs text-text-muted">
                  {t}
                </pre>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => copy(t, "Dados")}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar dados
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() =>
                      copy(`${text}\n\n*Dados do cliente*\n${t}`, "Dados da obra e do cliente")
                    }
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar com a obra
                  </Button>
                  <a
                    href={whatsappShare(`${text}\n\n*Dados do cliente*\n${t}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-success/15 hover:bg-success/25 inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-success"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </div>
              </div>
            );
          })}

          {canWrite && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5" /> Editar dados
            </Button>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-4 border-t border-border px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {SITE_FIELDS.map((f) => (
              <div key={f.key} className={`space-y-1 ${f.wide ? "sm:col-span-2" : ""}`}>
                <Label htmlFor={`site-${f.key}`}>{f.label}</Label>
                <Input
                  id={`site-${f.key}`}
                  value={draftSite[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setDraftSite({ ...draftSite, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="site-notes">Observações (portaria, horário de entrega, acesso)</Label>
              <Textarea
                id="site-notes"
                rows={2}
                value={draftSite.notes}
                onChange={(e) => setDraftSite({ ...draftSite, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Dados pessoais</p>
            {draftPeople.map((p, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {PERSON_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label htmlFor={`p${i}-${f.key}`}>{f.label}</Label>
                      <Input
                        id={`p${i}-${f.key}`}
                        value={p[f.key]}
                        placeholder={f.placeholder}
                        onChange={(e) =>
                          setDraftPeople(
                            draftPeople.map((x, j) =>
                              j === i ? { ...x, [f.key]: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label htmlFor={`p${i}-extra`}>Outros (estado civil, profissão...)</Label>
                    <Input
                      id={`p${i}-extra`}
                      value={p.extra}
                      onChange={(e) =>
                        setDraftPeople(
                          draftPeople.map((x, j) =>
                            j === i ? { ...x, extra: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftPeople(draftPeople.filter((_, j) => j !== i))}
                  className="inline-flex items-center gap-1 text-xs text-danger hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Tirar esta pessoa
                </button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setDraftPeople([...draftPeople, { ...EMPTY_PERSON }])}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar pessoa
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={saving} onClick={save}>
              Salvar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
