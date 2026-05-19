import { ArrowDownRight, ArrowUpRight, type LucideIcon, Minus } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { FadeIn } from "@/components/common/animated";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  delta?: number | null;
  deltaLabel?: string;
  tone?: "default" | "success" | "danger" | "muted";
  sparkline?: { value: number }[];
  sparklineTone?: "primary" | "accent" | "success" | "warning" | "danger";
  inverseDelta?: boolean;
  className?: string;
  /** Atraso da animação inicial em segundos */
  animationDelay?: number;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  tone = "default",
  sparkline,
  sparklineTone = "primary",
  inverseDelta = false,
  className,
  animationDelay = 0,
}: KpiCardProps) {
  const positiveIsGood = !inverseDelta;
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = (delta ?? 0) > 0;
  const isFlat = (delta ?? 0) === 0;
  const isGood = isFlat ? null : isUp === positiveIsGood;

  return (
    <FadeIn
      delay={animationDelay}
      className={cn("surface-elevated relative overflow-hidden p-5 transition-transform hover:-translate-y-0.5", className)}
    >
      <header className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        {Icon ? (
          <span className="rounded-full bg-bg-elev-2 p-1.5 text-text-muted">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </header>
      <div className="mt-3">
        <Money value={value} size="xl" tone={tone} className="num text-[28px] sm:text-3xl" />
      </div>
      {hasDelta && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
              isFlat
                ? "bg-bg-elev-2 text-text-muted"
                : isGood
                  ? "bg-success/15 text-success"
                  : "bg-danger/15 text-danger",
            )}
          >
            {isFlat ? <Minus className="h-3 w-3" /> : isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta!).toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-text-muted">{deltaLabel}</span>}
        </div>
      )}
      {sparkline && sparkline.length > 0 && (
        <div className="-mx-1 mt-3">
          <Sparkline data={sparkline} tone={sparklineTone} height={36} />
        </div>
      )}
    </FadeIn>
  );
}
