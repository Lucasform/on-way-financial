import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav, QuickAddButton } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { AssistantFab } from "@/components/ai/assistant-fab";
import { BottomNav } from "@/components/bottom-nav";
import { loadActiveContext } from "@/lib/household";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await loadActiveContext();
  if (!ctx) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-4 border-r border-border bg-surface/60 p-4 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pt-2">
          <LogoMark size={34} />
          <span className="text-base font-bold tracking-[0.18em]">ON</span>
        </Link>
        <QuickAddButton />
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <AppNav />
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-fg-soft">
          <p className="font-medium text-fg">{ctx.householdName}</p>
          <p className="truncate">{ctx.email}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-bg/80 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            <div className="lg:hidden">
              <Link href="/dashboard" className="flex items-center gap-2">
                <LogoMark size={28} />
                <span className="text-sm font-bold tracking-[0.18em]">ON</span>
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 p-5 pb-24 lg:p-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <AssistantFab />
      <BottomNav householdName={ctx.householdName} email={ctx.email} />
    </div>
  );
}
