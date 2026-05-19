"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/utils";

export function OnboardingWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState("Família");
  const [displayName, setDisplayName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  async function createHousehold() {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: householdName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { household_id } = (await res.json()) as { household_id: string };
      setHouseholdId(household_id);
      document.cookie = `current_household_id=${household_id}; path=/; max-age=${60 * 60 * 24 * 365}`;
      setStep(2);
    } catch (err) {
      console.error("createHousehold error:", err);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error(`Falha: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!householdId) return;
    setLoading(true);
    try {
      const phone = whatsapp ? normalizePhone(whatsapp) : null;
      const { error } = await supabase
        .from("household_members")
        .update({ display_name: displayName || null, whatsapp_phone: phone })
        .eq("household_id", householdId)
        .eq("user_id", userId);
      if (error) throw error;
      setStep(3);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(`Falha ao salvar perfil: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    router.push("/overview");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-bg-elev p-6">
      <ol className="mb-6 flex items-center gap-2 text-xs text-text-muted">
        {[1, 2, 3].map((n) => (
          <li key={n} className={`flex items-center gap-2 ${step >= n ? "text-primary" : ""}`}>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border ${step >= n ? "border-primary bg-primary/15 text-primary" : "border-border"}`}
            >
              {n}
            </span>
            {n < 3 && <span className="w-8 border-t border-border" />}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">1. Nome da família</h2>
          <div className="space-y-2">
            <Label htmlFor="hh">Como vai chamar?</Label>
            <Input id="hh" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} />
          </div>
          <Button onClick={createHousehold} disabled={loading || !householdName.trim()}>
            Continuar
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">2. Seu perfil</h2>
          <div className="space-y-2">
            <Label htmlFor="dn">Seu nome (como aparece para a família)</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa">WhatsApp (com DDD)</Label>
            <Input
              id="wa"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <p className="text-xs text-text-muted">
              Necessário se você quiser registrar despesas pelo bot. Pode adicionar depois.
            </p>
          </div>
          <Button onClick={saveProfile} disabled={loading}>
            Continuar
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">3. Tudo pronto 🎉</h2>
          <p className="text-sm text-text-muted">
            Sua família foi criada com categorias e métodos de pagamento padrão. Você pode convidar membros depois na
            aba <strong>Família</strong>.
          </p>
          <Button onClick={finish}>Ir para o painel</Button>
        </div>
      )}
    </div>
  );
}
