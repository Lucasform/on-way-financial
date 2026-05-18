import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 text-lg font-semibold text-primary">
        ← ON WAY FINANCIAL
      </Link>
      <h1 className="text-2xl font-semibold">Entrar na sua conta</h1>
      <p className="mt-2 text-sm text-text-muted">
        Use seu email para receber um link mágico. Sem senha, sem complicação.
      </p>
      <div className="mt-8">
        <LoginForm next={searchParams.next ?? "/overview"} />
      </div>
    </main>
  );
}
