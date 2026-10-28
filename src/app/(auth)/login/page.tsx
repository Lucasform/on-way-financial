import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 text-lg font-semibold text-primary">
        ← On Obra
      </Link>
      <h1 className="text-2xl font-semibold">Entrar na sua conta</h1>
      <p className="mt-2 text-sm text-text-muted">
        Crie uma conta com email e senha, ou peça um link direto no email.
      </p>
      {(searchParams.error === "link" || searchParams.error === "auth") && (
        <p className="mt-6 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          Esse link expirou ou já foi usado. Peça outro abaixo.
        </p>
      )}
      <div className="mt-8">
        <LoginForm next={searchParams.next ?? "/overview"} />
      </div>
    </main>
  );
}
