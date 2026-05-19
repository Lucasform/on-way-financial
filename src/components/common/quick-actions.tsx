import Link from "next/link";
import { ArrowLeftRight, Banknote, Bell, Boxes, type LucideIcon, Plus } from "lucide-react";

const ACTIONS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/transactions/new?type=expense", label: "Despesa", icon: ArrowLeftRight },
  { href: "/transactions/new?type=income", label: "Receita", icon: Banknote },
  { href: "/modules", label: "Módulos", icon: Boxes },
  { href: "/alerts", label: "Alertas", icon: Bell },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="surface surface-hover group flex flex-col items-center justify-center gap-2 py-4 text-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform group-hover:scale-110">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-text">{label}</span>
        </Link>
      ))}
    </div>
  );
}
