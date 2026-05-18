import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";

interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string | null | undefined;
  tone?: "default" | "success" | "danger" | "muted";
  size?: "sm" | "md" | "lg" | "xl";
}

const toneClass: Record<NonNullable<MoneyProps["tone"]>, string> = {
  default: "text-text",
  success: "text-success",
  danger: "text-danger",
  muted: "text-text-muted",
};
const sizeClass: Record<NonNullable<MoneyProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

export function Money({ value, tone = "default", size = "md", className, ...rest }: MoneyProps) {
  return (
    <span className={cn("font-mono tabular-nums", toneClass[tone], sizeClass[size], className)} {...rest}>
      {formatBRL(value)}
    </span>
  );
}
