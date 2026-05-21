import { NextResponse, type NextRequest } from "next/server";

import { extractTransactionsFromText } from "@/lib/import/ai-extract";
import { markDuplicates } from "@/lib/import/dedupe";
import { loadActiveContext } from "@/lib/household";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Polyfill minimo de DOMMatrix/Path2D/ImageData pra pdfjs-dist no runtime Node.
// pdfjs internamente referencia essas APIs do browser; pra extracao de texto
// (getText) os stubs bastam, nao precisamos render real.
function installPdfjsPolyfills(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      m11 = 1; m12 = 0; m13 = 0; m14 = 0;
      m21 = 0; m22 = 1; m23 = 0; m24 = 0;
      m31 = 0; m32 = 0; m33 = 1; m34 = 0;
      m41 = 0; m42 = 0; m43 = 0; m44 = 1;
      is2D = true;
      isIdentity = true;
      constructor(init?: number[] | string) {
        if (Array.isArray(init) && init.length === 6) {
          this.a = init[0]!;
          this.b = init[1]!;
          this.c = init[2]!;
          this.d = init[3]!;
          this.e = init[4]!;
          this.f = init[5]!;
        }
      }
      multiply() { return this; }
      translate() { return this; }
      scale() { return this; }
      rotate() { return this; }
      invertSelf() { return this; }
      transformPoint(p: { x?: number; y?: number; z?: number; w?: number }) {
        return { x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0, w: p.w ?? 1 };
      }
    };
  }
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {
      addPath() {}
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      closePath() {}
      rect() {}
    };
  }
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(w: number | Uint8ClampedArray, h: number, _settings?: unknown) {
        if (w instanceof Uint8ClampedArray) {
          this.data = w;
          this.width = h;
          this.height = (w.length / 4) / h;
        } else {
          this.width = w;
          this.height = h;
          this.data = new Uint8ClampedArray(w * h * 4);
        }
      }
    };
  }
}

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (!ctx.householdId) return new NextResponse("no household", { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "missing_file" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large", limit: "5MB" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    installPdfjsPolyfills();
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const result = await parser.getText();
      text = result.text ?? "";
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("pdf-parse failed:", msg);
    if (/password|encrypted/i.test(msg)) {
      return NextResponse.json({ error: "pdf_password_protected" }, { status: 422 });
    }
    if (/invalid pdf|InvalidPDFException/i.test(msg)) {
      return NextResponse.json({ error: "pdf_invalid" }, { status: 422 });
    }
    return NextResponse.json({ error: "pdf_parse_failed", detail: msg }, { status: 422 });
  }

  if (!text || text.trim().length < 50) {
    return NextResponse.json({ error: "pdf_empty_or_scanned" }, { status: 422 });
  }

  let rows;
  try {
    const result = await extractTransactionsFromText(text);
    rows = result.rows;
  } catch (err) {
    console.error("ai extract failed", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  rows = await markDuplicates(ctx.householdId, rows);

  return NextResponse.json({ rows });
}
