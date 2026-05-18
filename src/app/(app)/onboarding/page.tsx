import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/auth/onboarding-wizard";
import { loadActiveContext } from "@/lib/household";

export default async function OnboardingPage() {
  const ctx = await loadActiveContext();
  if (!ctx) redirect("/login");
  if (ctx.households.length > 0) redirect("/overview");
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Bora começar 👋</h1>
      <p className="mt-2 text-sm text-text-muted">
        Vamos configurar sua família em 3 passos. Você pode mudar tudo depois.
      </p>
      <div className="mt-8">
        <OnboardingWizard userId={ctx.userId} />
      </div>
    </main>
  );
}
