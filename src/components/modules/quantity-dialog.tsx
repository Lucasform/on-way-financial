"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  itemName: string;
  unit: string;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

export function QuantityDialog({ itemName, unit, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState("1");
  const num = Number(value.replace(",", "."));
  const valid = Number.isFinite(num) && num > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elev p-5 shadow-2xl">
        <p className="mb-1 text-sm font-semibold">Confirmar quantidade</p>
        <p className="mb-3 truncate text-xs text-text-muted">{itemName} · {unit}</p>
        <Label htmlFor="qty-confirm">Quantidade</Label>
        <Input
          id="qty-confirm"
          type="number"
          step="0.01"
          min="0"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) onConfirm(num);
          }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" disabled={!valid} onClick={() => onConfirm(num)}>Confirmar</Button>
        </div>
      </div>
    </>
  );
}
