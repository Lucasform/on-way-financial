"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";

type Resp = {
  configured: boolean;
  state?: string;
  qr?: string | null;
  pairingCode?: string | null;
};

export function WhatsAppConnect() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/evolution/connect", { cache: "no-store" });
      setData(await res.json());
    } catch {
      setData({ configured: true, state: "error" });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data)
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão...
      </div>
    );

  if (!data?.configured)
    return <p className="text-sm text-muted">Evolution API não configurada.</p>;

  if (data.state === "open")
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-success">
        <CheckCircle2 className="h-4 w-4" /> WhatsApp conectado. Manda “gastei 50 no mercado”.
      </div>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-soft">
        Abra o WhatsApp no celular → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e escaneie:
      </p>
      {data.qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.qr} alt="QR WhatsApp" className="h-56 w-56 rounded-xl border border-border bg-white p-2" />
      ) : (
        <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-border text-sm text-muted">
          Gerando QR...
        </div>
      )}
      {data.pairingCode && (
        <p className="text-sm">
          Ou use o código: <span className="num font-semibold">{data.pairingCode}</span>
        </p>
      )}
      <button onClick={load} className="inline-flex items-center gap-1.5 text-xs text-fg-soft hover:text-fg">
        <RefreshCw className="h-3.5 w-3.5" /> Atualizar QR
      </button>
    </div>
  );
}
