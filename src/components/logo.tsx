import { cn } from "@/lib/utils";

// Gráfico de linha subindo com seta para cima.
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("grid place-items-center rounded-xl bg-brand text-white shadow-glow", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {/* eixos / escala */}
        <path d="M3 3v18h18" opacity={0.55} />
        {/* linha subindo */}
        <path d="M6.5 15.5l3.5-4 3 2.2 4.5-6" />
        {/* seta pra cima no fim */}
        <path d="M14 7.7h3.5V11" />
      </svg>
    </span>
  );
}

// Marca completa: gráfico em cima, "ON" embaixo.
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("flex flex-col items-center gap-1", className)}>
      <LogoMark size={size} />
      <span className="text-xs font-extrabold tracking-[0.28em] text-fg">ON</span>
    </span>
  );
}
