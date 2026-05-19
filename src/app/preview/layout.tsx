import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-warning/30 bg-warning/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs text-warning">
          <span className="inline-flex items-center gap-2 font-medium">
            <Eye className="h-3.5 w-3.5" /> Modo preview · dados fictícios
          </span>
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <Link href="/">
              <ArrowLeft className="h-3 w-3" /> Voltar
            </Link>
          </Button>
        </div>
      </div>

      {/* Preview nav */}
      <nav className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3 text-sm">
          <PreviewLink href="/preview">Visão geral</PreviewLink>
          <PreviewLink href="/preview/transactions">Transações</PreviewLink>
          <PreviewLink href="/preview/reports">Relatórios</PreviewLink>
          <PreviewLink href="/preview/modules">Módulos</PreviewLink>
          <span className="flex-1" />
          <ThemeToggle />
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Entrar de verdade</Link>
          </Button>
        </div>
      </nav>

      <main className="px-4 pb-24 pt-6 md:px-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Preview-only assistant hint */}
      <div className="fixed bottom-4 right-4 z-30 max-w-[260px] rounded-2xl border border-border bg-bg-elev/95 p-3 text-xs text-text-muted shadow-2xl backdrop-blur sm:bottom-6 sm:right-6">
        <p className="mb-1 inline-flex items-center gap-1 font-semibold text-text">
          <span className="text-base">🤖</span> Assistente IA
        </p>
        <p>
          No app real você tem um chat IA que sabe seus números — &quot;quanto gastei?&quot;, &quot;posso
          investir?&quot;, &quot;onde economizar?&quot;.
        </p>
      </div>
    </div>
  );
}

function PreviewLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-elev-2 hover:text-text"
    >
      {children}
    </Link>
  );
}
