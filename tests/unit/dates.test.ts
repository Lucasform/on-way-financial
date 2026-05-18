import { describe, expect, it } from "vitest";

import { parseRelativeDatePt } from "@/lib/dates";

describe("parseRelativeDatePt", () => {
  const now = new Date("2026-05-12T12:00:00Z");

  it("hoje", () => expect(parseRelativeDatePt("hoje", now)).toBe("2026-05-12"));
  it("ontem", () => expect(parseRelativeDatePt("ontem", now)).toBe("2026-05-11"));
  it("anteontem", () => expect(parseRelativeDatePt("anteontem", now)).toBe("2026-05-10"));
  it("ISO passa direto", () => expect(parseRelativeDatePt("2026-01-15", now)).toBe("2026-01-15"));
  it("BR converte", () => expect(parseRelativeDatePt("15/01/2026", now)).toBe("2026-01-15"));
  it("inválido", () => expect(parseRelativeDatePt("amanhã que vem", now)).toBeNull());
});
