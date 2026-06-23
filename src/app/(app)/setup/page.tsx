import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { OBJECTS, OBJECT_KEYS } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const { data: fields } = await supabase
    .from("custom_fields")
    .select("object_key")
    .eq("household_id", ctx!.householdId!);

  const count = new Map<string, number>();
  (fields ?? []).forEach((f) => count.set(f.object_key, (count.get(f.object_key) ?? 0) + 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup</h1>
        <p className="text-sm text-fg-soft">
          Personalize seus objetos: adicione campos, tipos e listas (estilo Salesforce).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OBJECT_KEYS.map((k) => {
          const o = OBJECTS[k];
          const Icon = o.icon;
          return (
            <Link key={k} href={`/setup/${k}`} className="block transition hover:-translate-y-0.5">
              <Card>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{o.label}</p>
                    <p className="text-xs text-muted">{count.get(k) ?? 0} campo(s) customizado(s)</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
