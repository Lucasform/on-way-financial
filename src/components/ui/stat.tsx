import { Card } from "./card";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <Card>
      <p className="text-sm text-fg-soft">{label}</p>
      <p
        className={cn(
          "num mt-2 text-2xl font-semibold tracking-tight",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </p>
      {delta && <p className="mt-1 text-xs text-muted">{delta}</p>}
    </Card>
  );
}
