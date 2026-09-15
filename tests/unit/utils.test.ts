import { describe, expect, it } from "vitest";

import { extractJson, normalizePhone, safeJsonParse, sanitizeFilename, slugify } from "@/lib/utils";

describe("slugify", () => {
  it("remove acentos e vira kebab-case", () => {
    expect(slugify("Cartão de Crédito")).toBe("cartao-de-credito");
  });

  it("colapsa símbolos e apara hífens das pontas", () => {
    expect(slugify("  Obra / Reforma 2026!  ")).toBe("obra-reforma-2026");
  });
});

describe("safeJsonParse", () => {
  it("faz parse de JSON válido", () => {
    expect(safeJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("retorna null para JSON inválido em vez de lançar", () => {
    expect(safeJsonParse("{quebrado")).toBeNull();
  });
});

describe("extractJson", () => {
  it("extrai bloco cercado por ```json", () => {
    const text = 'resposta:\n```json\n{"ok":true}\n```\nfim';
    expect(extractJson(text)).toBe('{"ok":true}');
  });

  it("extrai do primeiro { ao último } quando não há cerca", () => {
    expect(extractJson('prefixo {"a":{"b":2}} sufixo')).toBe('{"a":{"b":2}}');
  });
});

describe("normalizePhone", () => {
  it("celular BR com DDD ganha +55", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("+5511987654321");
  });

  it("número já com 55 só ganha o +", () => {
    expect(normalizePhone("5511987654321")).toBe("+5511987654321");
  });
});

describe("sanitizeFilename", () => {
  it("remove acentos e caracteres perigosos mantendo a extensão", () => {
    expect(sanitizeFilename("extrato março//2026.PDF")).toBe("extrato-marco-2026.pdf");
  });

  it("nome vazio vira fallback", () => {
    expect(sanitizeFilename("!!!")).toBe("arquivo");
  });
});
