import { redirect } from "next/navigation";

import { createSupabaseServer } from "@/lib/supabase/server";
import { InviteAccept } from "@/components/auth/invite-accept";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`);
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-semibold">Aceitar convite</h1>
      <p className="mt-2 text-sm text-text-muted">Você foi convidado para fazer parte de uma família.</p>
      <div className="mt-8">
        <InviteAccept token={params.token} />
      </div>
    </main>
  );
}
