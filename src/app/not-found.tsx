import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg p-4 text-center">
      <div>
        <p className="text-5xl font-bold text-brand">404</p>
        <p className="mt-2 text-fg-soft">Página não encontrada.</p>
        <Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
