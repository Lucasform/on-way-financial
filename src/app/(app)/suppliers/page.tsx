import { SuppliersClient } from "@/components/suppliers-client";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const ctx = await loadActiveContext();
  const supabase = createClient();
  const hid = ctx!.householdId!;

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .eq("household_id", hid)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
        <p className="text-sm text-fg-soft">Sua agenda de fornecedores para cotações.</p>
      </div>
      <SuppliersClient householdId={hid} suppliers={suppliers ?? []} />
    </div>
  );
}
