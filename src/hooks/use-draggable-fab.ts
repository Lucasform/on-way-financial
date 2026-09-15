"use client";

import { useEffect, useRef } from "react";

interface Offset {
  x: number;
  y: number;
}

/**
 * Deixa um FAB arrastável, com a posição persistida por id em localStorage.
 * O deslocamento é aplicado como transform direto no DOM (via ref) durante o arraste, sem
 * chamar setState a cada pixel — isso evita re-renderizar a árvore inteira (era a causa do
 * travamento ao mover o botão). React só entra em cena pra ler a posição salva no mount.
 */
export function useDraggableFab<T extends HTMLElement = HTMLElement>(id: string) {
  const ref = useRef<T | null>(null);
  const posRef = useRef<Offset>({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`fab-pos:${id}`);
      if (saved) {
        const pos = JSON.parse(saved) as Offset;
        posRef.current = pos;
        if (ref.current) ref.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }
    } catch {
      // ignore
    }
  }, [id]);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    movedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: posRef.current.x, origY: posRef.current.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    const pos = { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy };
    posRef.current = pos;
    if (ref.current) ref.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  }

  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      localStorage.setItem(`fab-pos:${id}`, JSON.stringify(posRef.current));
    } catch {
      // ignore
    }
  }

  return {
    ref,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    /** Chame no onClick: se acabou de arrastar, ignora o clique. */
    consumeDrag: () => {
      const dragged = movedRef.current;
      movedRef.current = false;
      return dragged;
    },
  };
}
