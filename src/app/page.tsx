import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Car,
  GraduationCap,
  Gift,
  Hammer,
  LineChart,
  Lock,
  MessageSquare,
  Plane,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-200px] -z-10 mx-auto h-[600px] max-w-5xl rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,209,160,0.45), rgba(99,102,241,0.25), transparent)",
        }}
      />

      {/* Top nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-wide">ON WAY FINANCIAL</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">
              Começar grátis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-12 pb-20 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 text-xs text-text-muted">
          <Zap className="h-3.5 w-3.5 text-primary" /> grátis · com IA · sem propaganda
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Suas finanças familiares <span className="text-primary">no piloto automático</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
          Lance gastos por mensagem, acompanhe a obra em fases, planeje a viagem do ano e
          mantenha toda a família alinhada. Sem planilha, sem caderninho, sem perder de
          vista pra onde o dinheiro foi.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-text-muted">
          Login por email · sem cartão de crédito · seus dados em servidor brasileiro
        </p>
      </section>

      {/* Quick chat preview */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="rounded-2xl border border-border bg-bg-elev p-4 shadow-2xl sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs text-text-muted">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <span>conversa com o bot</span>
          </div>
          <ul className="space-y-3 text-sm">
            <ChatLine you>gastei 80 no posto ontem credito</ChatLine>
            <ChatLine>
              ✅ <strong>Despesa registrada</strong>
              <br />
              💰 R$ 80,00 · posto
              <br />
              🏷️ Transporte · 💳 Crédito · 📅 ontem
            </ChatLine>
            <ChatLine you>qual o saldo do mês?</ChatLine>
            <ChatLine>
              📊 <strong>Resumo do mês</strong>
              <br />
              Receitas: R$ 8.000,00
              <br />
              Despesas: R$ 3.450,00
              <br />
              Saldo: <strong>R$ 4.550,00</strong>
            </ChatLine>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">Como funciona</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-text-muted">
          Três passos pra parar de adivinhar pra onde o dinheiro vai.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Step number={1} title="Crie sua família">
            Convide quem mora com você. Cada um tem o seu acesso, com papéis: dono, admin ou só
            visualizador.
          </Step>
          <Step number={2} title="Conecte um chat">
            Vincule sua conta ao bot no celular. Mande mensagens normais (&quot;gastei 50 no mercado&quot;)
            e o bot entende e registra.
          </Step>
          <Step number={3} title="Acompanhe pelo app">
            Veja gráficos, alertas, fechamento de fatura e progresso das suas metas em tempo
            real.
          </Step>
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">
          Módulos especiais pra quem planeja grande
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-text-muted">
          Não é só &quot;categoria de despesa&quot;. É um espaço inteiro com fases, metas e linha do tempo.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            icon={<Hammer className="h-5 w-5" />}
            emoji="🧱"
            title="Obra"
            desc="Fases em kanban, equipe, galeria de fotos e projeção de término."
          />
          <ModuleCard
            icon={<Plane className="h-5 w-5" />}
            emoji="✈️"
            title="Viagem"
            desc="Itinerário, reservas, conversor de moeda e gastos por dia."
          />
          <ModuleCard
            icon={<Car className="h-5 w-5" />}
            emoji="🚗"
            title="Carro novo"
            desc="Compare modelos, simule financiamento e veja quanto já poupou."
          />
          <ModuleCard
            icon={<Gift className="h-5 w-5" />}
            emoji="🎁"
            title="Presentes"
            desc="Calendário de aniversários, ideias por pessoa e orçamento."
          />
          <ModuleCard
            icon={<GraduationCap className="h-5 w-5" />}
            emoji="🎓"
            title="Educação"
            desc="Mensalidades, cursos e projeção dos próximos 12 meses."
          />
          <ModuleCard
            icon={<Sparkles className="h-5 w-5" />}
            emoji="✨"
            title="Personalizado"
            desc="Crie campos do jeito que precisar. Sem template, sem limite."
          />
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">
          Tudo que você esperaria de um app de banco, e mais
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<Wallet className="h-5 w-5 text-primary" />}
            title="Despesas e receitas"
            desc="Parcelas viram N transações automáticas. Comprovante anexado em foto."
          />
          <Feature
            icon={<LineChart className="h-5 w-5 text-accent" />}
            title="Gráficos que importam"
            desc="Por categoria, por dia, por método. Comparação com o mês passado embutida."
          />
          <Feature
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
            title="Bot inteligente"
            desc="Linguagem natural com IA. 'Comprei pão 8 reais' vira despesa em Alimentação."
          />
          <Feature
            icon={<Bell className="h-5 w-5 text-warning" />}
            title="Alertas customizados"
            desc="Estourou o orçamento de mercado? Cartão fechando amanhã? Avisamos no chat."
          />
          <Feature
            icon={<Users className="h-5 w-5 text-accent" />}
            title="Família compartilhada"
            desc="Múltiplas famílias por conta. Cada uma com seus membros, contas e papéis."
          />
          <Feature
            icon={<Lock className="h-5 w-5 text-success" />}
            title="Privado por padrão"
            desc="Cada família vê só os próprios dados. Linha por linha, no nível do banco."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-2xl border border-border bg-bg-elev p-8 sm:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">Comece em 30 segundos</h2>
          <p className="mt-3 text-text-muted">
            Sem instalar nada. Funciona no celular, no notebook, no tablet. Login por email.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg">
              <Link href="/login">
                Criar minha conta <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} ON WAY FINANCIAL · feito no Brasil</span>
          <span>Login por email · dados em servidor brasileiro</span>
        </div>
      </footer>
    </main>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elev p-5">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {number}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{children}</p>
    </div>
  );
}

function ModuleCard({
  icon,
  emoji,
  title,
  desc,
}: {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-bg-elev p-5 transition-colors hover:border-primary/40">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-30px] top-[-30px] text-[110px] opacity-5 transition-opacity group-hover:opacity-10"
      >
        {emoji}
      </div>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-bg-elev-2 text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold">
        {emoji} {title}
      </h3>
      <p className="mt-1 text-sm text-text-muted">{desc}</p>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elev p-5">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{desc}</p>
    </div>
  );
}

function ChatLine({ children, you = false }: { children: React.ReactNode; you?: boolean }) {
  return (
    <li className={you ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[80%] rounded-2xl px-4 py-2.5 " +
          (you
            ? "rounded-tr-sm bg-primary/15 text-text"
            : "rounded-tl-sm bg-bg-elev-2 text-text")
        }
      >
        {children}
      </div>
    </li>
  );
}
