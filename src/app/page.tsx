import Link from "next/link";
import { ArrowRight, MessageCircleHeart, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 text-xs text-text-muted">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> finanças familiares com IA e WhatsApp
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-[44px]">
          Seu copiloto financeiro <span className="text-primary">no bolso</span>
        </h1>
        <p className="mt-4 max-w-xl text-balance text-text-muted">
          Registre despesas pelo WhatsApp, acompanhe a obra, planeje a viagem e mantenha a família alinhada — tudo em
          um app premium, gratuito e privado.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/login">
            Entrar com email <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Criar conta gratuita</Link>
        </Button>
      </div>

      <section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <Feature
          icon={<MessageCircleHeart className="h-5 w-5 text-primary" />}
          title="WhatsApp nativo"
          description="Mande “gastei 50 no mercado ontem pix” e pronto."
        />
        <Feature
          icon={<Sparkles className="h-5 w-5 text-accent" />}
          title="Módulos especiais"
          description="Obra, viagem, carro novo, presentes, educação."
        />
        <Feature
          icon={<ShieldCheck className="h-5 w-5 text-success" />}
          title="Privado e seguro"
          description="Seus dados em Postgres com RLS por família."
        />
      </section>
    </main>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elev p-5">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{description}</p>
    </div>
  );
}
