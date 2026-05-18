import { describe, expect, it } from "vitest";

import { formatBRL, parseBRL, splitInstallments } from "@/lib/money";

describe("money", () => {
  it("formata BRL", () => {
    expect(formatBRL(1234.5)).toMatch(/R\$/);
    expect(formatBRL(null)).toMatch(/R\$/);
  });

  it("parseBRL", () => {
    expect(parseBRL("1.234,56")).toBeCloseTo(1234.56);
    expect(parseBRL("1234,5")).toBeCloseTo(1234.5);
    expect(parseBRL("1234.5")).toBeCloseTo(1234.5);
    expect(parseBRL("R$ 50")).toBeCloseTo(50);
    expect(parseBRL("")).toBeNull();
  });

  it("splitInstallments soma correto", () => {
    const parts = splitInstallments(100.01, 3);
    const sum = parts.reduce((a, b) => a + b, 0);
    expect(parts).toHaveLength(3);
    expect(sum).toBeCloseTo(100.01, 2);
  });

  it("splitInstallments com 1 parcela", () => {
    expect(splitInstallments(50, 1)).toEqual([50]);
  });
});
