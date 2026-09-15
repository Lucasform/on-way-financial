import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ObraSectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <Link
        href="/overview"
        aria-label="Voltar pra obra"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-elev text-text-muted transition-colors hover:bg-bg-elev-2 hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-xl font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
