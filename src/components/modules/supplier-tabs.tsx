import Link from "next/link";

import { cn } from "@/lib/utils";

export function SupplierTabs({ active }: { active: "meus" | "compartilhados" }) {
  const tab = (value: "meus" | "compartilhados", href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active === value ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:bg-bg-elev-2",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tab("meus", "/overview/fornecedores", "Meus fornecedores")}
      {tab("compartilhados", "/overview/fornecedores/compartilhados", "Compartilhados")}
    </div>
  );
}
