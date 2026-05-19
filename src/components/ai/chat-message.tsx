"use client";

import React from "react";

import { cn } from "@/lib/utils";

/**
 * Renderiza markdown leve (parágrafos, listas, bold, italic, code) sem dependência externa.
 * Suporta também destacar valores em R$ com cor.
 */

const BOLD = /\*\*([^*]+)\*\*/g;
const ITALIC = /(?<!\w)_([^_]+)_(?!\w)/g;
const CODE = /`([^`]+)`/g;
const MONEY = /(R\$\s*[\d.]+(?:,\d{2})?)/g;

function renderInline(text: string): React.ReactNode {
  // Cria array de partes, aplicando regex em cascata
  type Part = string | { type: "bold" | "italic" | "code" | "money"; content: string };
  let parts: Part[] = [text];

  function applyRegex(
    regex: RegExp,
    type: "bold" | "italic" | "code" | "money",
  ) {
    const next: Part[] = [];
    for (const part of parts) {
      if (typeof part !== "string") {
        next.push(part);
        continue;
      }
      let last = 0;
      const matches = [...part.matchAll(regex)];
      for (const match of matches) {
        const start = match.index ?? 0;
        if (start > last) next.push(part.slice(last, start));
        next.push({ type, content: match[1] ?? match[0] });
        last = start + match[0].length;
      }
      if (last < part.length) next.push(part.slice(last));
    }
    parts = next;
  }

  applyRegex(BOLD, "bold");
  applyRegex(ITALIC, "italic");
  applyRegex(CODE, "code");
  applyRegex(MONEY, "money");

  return parts.map((p, i) => {
    if (typeof p === "string") return <React.Fragment key={i}>{p}</React.Fragment>;
    if (p.type === "bold") return <strong key={i} className="font-semibold text-text">{p.content}</strong>;
    if (p.type === "italic") return <em key={i} className="italic">{p.content}</em>;
    if (p.type === "code") return (
      <code key={i} className="rounded bg-bg-elev px-1 py-0.5 font-mono text-[0.9em]">{p.content}</code>
    );
    if (p.type === "money") return (
      <span key={i} className="num font-semibold text-primary">{p.content}</span>
    );
    return null;
  });
}

interface Block {
  type: "p" | "ul" | "ol" | "h";
  lines: string[];
}

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      current = null;
      continue;
    }
    const isUl = /^\s*[-*]\s+/.test(line);
    const isOl = /^\s*\d+\.\s+/.test(line);
    const isH = /^#{1,6}\s+/.test(line);
    const stripped = line.replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+\.\s+/, "").replace(/^#{1,6}\s+/, "");

    const wantedType: Block["type"] = isH ? "h" : isUl ? "ul" : isOl ? "ol" : "p";

    if (current && current.type === wantedType && wantedType !== "h") {
      current.lines.push(stripped);
    } else {
      current = { type: wantedType, lines: [stripped] };
      blocks.push(current);
    }
  }
  return blocks;
}

export function ChatMessageContent({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "h") {
          return (
            <p key={i} className="text-sm font-semibold text-text">
              {renderInline(b.lines[0]!)}
            </p>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1 marker:text-primary">
              {b.lines.map((l, j) => (
                <li key={j}>{renderInline(l)}</li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} className="ml-4 list-decimal space-y-1 marker:text-primary marker:font-semibold">
              {b.lines.map((l, j) => (
                <li key={j}>{renderInline(l)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className={cn(i === 0 ? "" : "mt-1")}>
            {b.lines.map((l, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
