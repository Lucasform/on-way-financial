import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { ASSISTANT_SYSTEM, buildFinancialContext } from "@/lib/ai/context";
import { getServerEnv } from "@/lib/env";
import { loadActiveContext } from "@/lib/household";

export const runtime = "nodejs";
export const maxDuration = 30;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: getServerEnv().ANTHROPIC_API_KEY });
  return _client;
}

export async function POST(req: NextRequest) {
  const ctx = await loadActiveContext();
  if (!ctx) return new NextResponse("unauthorized", { status: 401 });
  if (!ctx.householdId) return NextResponse.json({ error: "no_household" }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const env = getServerEnv();
  const financialContext = await buildFinancialContext({ householdId: ctx.householdId });
  const system = `${ASSISTANT_SYSTEM}\n\n--- FINANCIAL CONTEXT ---\n${financialContext}`;

  try {
    const res = await client().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 800,
      system,
      messages: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const first = res.content[0];
    const text = first && first.type === "text" ? first.text : "";
    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("ai chat", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
