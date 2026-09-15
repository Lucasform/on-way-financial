"use client";

import { useEffect, useRef, useState } from "react";

interface Offset {
  x: number;
  y: number;
}

/**
 * Deixa um FAB arrastável, com a posição persistida por id em localStorage.
 * O deslocamento é aplicado como transform sobre a posição CSS padrão (bottom/right),
 * então funciona em cima de qualquer botão fixo sem recalcular coordenadas absolutas.
 */
export function useDraggableFab(id: string) {
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`fab-pos:${id}`);
      if (saved) setOffset(JSON.parse(saved) as Offset);
    } catch {
      // ignore
    }
  }, [id]);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    movedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  }

  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    setOffset((o) => {
      try {
        localStorage.setItem(`fab-pos:${id}`, JSON.stringify(o));
      } catch {
        // ignore
      }
      return o;
    });
  }

  return {
    style: { transform: `translate(${offset.x}px, ${offset.y}px)` },
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
