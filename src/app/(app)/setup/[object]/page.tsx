import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SetupFieldsClient } from "@/components/setup-fields-client";
import { createClient } from "@/lib/supabase/server";
import { loadActiveContext } from "@/lib/household";
import { OBJECTS, type ObjectKey } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function SetupObjectPage({ params }: { params: { object: string } }) {
  const key = params.object as ObjectKey;
  if (!OBJECTS[key]) notFound();

  const ctx = await loadActiveContext();
  const supabase = createClient();
  const { data: fields } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("household_id", ctx!.householdId!)
    .eq("object_key", key)
    .order("position");

  const o = OBJECTS[key];

  return (
    <div className="space-y-6">
      <Link href="/setup" className="inline-flex items-center gap-1 text-sm text-fg-soft hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Setup
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{o.label}</h1>
        <p className="text-sm text-fg-soft">Campos customizados deste objeto.</p>
      </div>
      <SetupFieldsClient householdId={ctx!.householdId!} objectKey={key} fields={(fields ?? []) as any} />
    </div>
  );
}
