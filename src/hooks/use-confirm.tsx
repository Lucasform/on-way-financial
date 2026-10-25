"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConfirmState {
  message: string;
  danger?: boolean;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, opts?: { danger?: boolean }) => {
    setState({ message, danger: opts?.danger });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function answer(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  }

  const ConfirmDialog = (
    <Dialog open={state !== null} onOpenChange={(open) => !open && answer(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar</DialogTitle>
          <DialogDescription>{state?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => answer(false)}>
            Cancelar
          </Button>
          <Button variant={state?.danger ? "destructive" : "default"} onClick={() => answer(true)}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
