import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function Empty({ icon: Icon, title, description, action, className }: EmptyProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-10 text-center", className)}>
      {Icon ? <Icon className="h-10 w-10 text-text-muted" aria-hidden="true" /> : null}
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
