import { redirect } from "next/navigation";

import { ObraSectionHeader } from "@/components/modules/obra-section-header";
import { ObraQuotesTab } from "@/components/modules/obra-quotes-tab";
import { getObraModule } from "@/lib/obra";
import { loadActiveContext } from "@/lib/household";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABS = ["aberto", "execucao", "aceita"] as const;

export default async function CotacoesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const ctx = (await loadActiveContext())!;
  const supabase = createSupabaseServer();
  const mod = await getObraModule(ctx.householdId);
  if (!mod) redirect("/overview");

  const [{ data: quotes }, { data: suppliers }, { data: payments }] = await Promise.all([
    supabase.from("price_quotes").select("*").eq("household_id", ctx.householdId).order("quoted_at", { ascending: false }),
    supabase.from("suppliers").select("*").eq("household_id", ctx.householdId).order("name"),
    supabase
      .from("quote_payments")
      .select("id, quote_id, label, amount, due_date, paid_at, item_id")
      .eq("household_id", ctx.householdId),
  ]);

  const tab = TABS.find((t) => t === searchParams.tab) ?? "aberto";

  return (
    <div>
      <ObraSectionHeader title="Cotações" subtitle="Compare preços, execute e acompanhe os pagamentos" />
      <ObraQuotesTab
        householdId={ctx.householdId}
        suppliers={suppliers ?? []}
        initial={quotes ?? []}
        initialPayments={payments ?? []}
        initialTab={tab}
        canWrite={ctx.role !== "viewer"}
      />
    </div>
  );
}
