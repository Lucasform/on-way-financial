"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0a1410", color: "#eafff4", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Ops, o app travou</h2>
            <p style={{ fontSize: 14, opacity: 0.8 }}>Recarregue para continuar.</p>
            <button
              onClick={reset}
              style={{ marginTop: 16, background: "#1f9d57", color: "#fff", border: 0, borderRadius: 12, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
