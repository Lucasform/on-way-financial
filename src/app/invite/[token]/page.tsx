import { InviteAccept } from "@/components/invite-accept";

export const dynamic = "force-dynamic";

export default function InvitePage({ params }: { params: { token: string } }) {
  return <InviteAccept token={params.token} />;
}
