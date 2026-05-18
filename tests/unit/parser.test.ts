import { describe, expect, it } from "vitest";

import { parseCommand } from "@/lib/ai/parser";

describe("parseCommand", () => {
  it("comando /despesa simples", () => {
    const r = parseCommand("/despesa 50 mercado #Mercado @pix");
    if (!r || !("intent" in r)) throw new Error("expected intent");
    expect(r.intent).toBe("expense");
    expect(r.amount).toBe(50);
    expect(r.description).toBe("mercado");
    expect(r.category_hint).toBe("Mercado");
    expect(r.payment_hint).toBe("pix");
  });

  it("comando /receita", () => {
    const r = parseCommand("/receita 5000 salário #Salário");
    if (!r || !("intent" in r)) throw new Error();
    expect(r.intent).toBe("income");
    expect(r.amount).toBe(5000);
  });

  it("comando /obra vincula a módulo", () => {
    const r = parseCommand("/obra 230 cimento");
    if (!r || !("intent" in r)) throw new Error();
    expect(r.module_hint).toBe("obra");
    expect(r.amount).toBe(230);
  });

  it("comando /ajuda retorna objeto não-intent", () => {
    const r = parseCommand("/ajuda");
    if (!r || !("command" in r)) throw new Error();
    expect(r.command).toBe("ajuda");
  });

  it("retorna null se não começa com /", () => {
    expect(parseCommand("gastei 50 no mercado")).toBeNull();
  });
});
