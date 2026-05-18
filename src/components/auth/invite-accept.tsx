"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function accept() {
    start(async () => {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "accept", token }),
      });
      if (!res.ok) {
        toast.error("Convite inválido ou expirado.");
        return;
      }
      const { household_id } = (await res.json()) as { household_id: string };
      document.cookie = `current_household_id=${household_id}; path=/; max-age=${60 * 60 * 24 * 365}`;
      router.push("/overview");
      router.refresh();
    });
  }

  return (
    <Button onClick={accept} disabled={pending} className="w-full">
      {pending ? "Aceitando..." : "Aceitar convite"}
    </Button>
  );
}
