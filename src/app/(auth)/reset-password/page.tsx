import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 text-lg font-semibold text-primary">
        ← ON FIN
      </Link>
      <h1 className="text-2xl font-semibold">Definir nova senha</h1>
      <p className="mt-2 text-sm text-text-muted">
        Escolha uma senha com pelo menos 8 caracteres.
      </p>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
