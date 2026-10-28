export function safeNextPath(next: string | null | undefined, fallback = "/overview"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
