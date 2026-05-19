import { NextResponse, type NextRequest } from "next/server";

import { extractTransactionsFromText } from "@/lib/import/ai-extract";
import { markDuplicates } from "@/lib/import/dedupe";
import { loadActiveContext } from "@/lib/household";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
