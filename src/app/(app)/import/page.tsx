import { ImportClient } from "@/components/import-client";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const { data: accs } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("household_id", hid)
    .eq("archived", false)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar extrato</h1>
        <p className="text-sm text-fg-soft">Traga lançamentos de OFX ou CSV do seu banco.</p>
      </div>
      <ImportClient householdId={hid} accounts={accs ?? []} />
    </div>
  );
}
