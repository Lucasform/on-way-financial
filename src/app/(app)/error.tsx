"use client";

import { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-soft">
        <p className="text-base font-semibold">Algo deu errado nesta tela</p>
        <p className="mt-1 text-sm text-fg-soft">Tente novamente. Se persistir, recarregue o app.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow"
          >
            <RotateCcw className="h-4 w-4" /> Tentar de novo
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            <Home className="h-4 w-4" /> Início
          </a>
        </div>
      </div>
    </div>
  );
}
