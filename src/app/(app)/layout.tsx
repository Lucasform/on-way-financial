import { redirect } from "next/navigation";

import { AssistantFab } from "@/components/ai/assistant-fab";
import { AppShell } from "@/components/common/app-shell";
import { loadActiveContext } from "@/lib/household";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await loadActiveContext();
  if (!ctx) redirect("/login");
  if (ctx.households.length === 0) redirect("/onboarding");
  return (
    <AppShell ctx={ctx}>
      {children}
      <AssistantFab />
    </AppShell>
  );
}
