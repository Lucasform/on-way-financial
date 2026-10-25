import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FolderOpen,
  Images,
  LineChart,
  Lock,
  MessageSquare,
  Receipt,
  Store,
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
        <Link href="/" className="flex items-center gap-2" aria-label="On Obra">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" width={32} height={32} className="rounded-md" />
          <span className="text-sm font-semibold tracking-wide">On Obra</span>
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
          Sua obra sob controle, <span className="text-primary">sem planilha</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-text-muted sm:text-lg">
          Cadastre fornecedores, registre cotações e marque o que já foi executado.
          Acompanhe o gasto total e por fornecedor, documentos, fotos e o diário da obra,
          tudo num só lugar.
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
            <span>conversa com o assistente</span>
          </div>
          <ul className="space-y-3 text-sm">
            <ChatLine you>gastei 150 em cimento hoje</ChatLine>
            <ChatLine>
              ✅ <strong>Custo de R$ 150,00 registrado</strong>
              <br />
              Cimento
              <br />
              📅 Data: hoje
            </ChatLine>
            <ChatLine you>quanto já gastei na obra?</ChatLine>
            <ChatLine>
              📊 <strong>Gasto total até agora</strong>: R$ 18.420,00
              <br />
              Esse mês: R$ 2.150,00
            </ChatLine>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">Como funciona</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-text-muted">
          Três passos pra parar de adivinhar quanto a obra já custou.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Step number={1} title="Cadastre fornecedores">
            Quem vende material, presta serviço ou faz a mão de obra da sua reforma.
          </Step>
          <Step number={2} title="Registre a cotação, marque o que já foi feito">
            Direto na tela do fornecedor, ou pedindo pro assistente de IA no chat.
          </Step>
          <Step number={3} title="Acompanhe o gasto">
            Total até agora, por fornecedor, com filtro por período. Só o que importa.
          </Step>
        </div>
      </section>

      {/* Real app sections */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">
          Tudo que uma obra precisa, num só lugar
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-text-muted">
          Sem módulo genérico de categoria. Cada tela existe porque resolve uma coisa real da obra.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            icon={<Store className="h-5 w-5" />}
            title="Fornecedores"
            desc="Cadastro de quem você compra ou contrata, com telefone, CNPJ e nota."
          />
          <ModuleCard
            icon={<Receipt className="h-5 w-5" />}
            title="Cotações"
            desc="Compare preços entre fornecedores, aceite o melhor e ele já vira custo."
          />
          <ModuleCard
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="Checklist"
            desc="Lista do que falta fazer, organizada por etapa, marcando como feito."
          />
          <ModuleCard
            icon={<Camera className="h-5 w-5" />}
            title="Andamento"
            desc="Álbum cronológico da obra, mês a mês, com fotos e registros."
          />
          <ModuleCard
            icon={<FolderOpen className="h-5 w-5" />}
            title="Documentos"
            desc="Contratos, notas e projetos guardados por pasta."
          />
          <ModuleCard
            icon={<Images className="h-5 w-5" />}
            title="Galeria"
            desc="Fotos e vídeos da obra, organizados do jeito que você quiser."
          />
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">
          Feito só pra controlar custo de obra
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<Wallet className="h-5 w-5 text-primary" />}
            title="Só o que é custo"
            desc="Sem categoria de vida pessoal, sem receita. Só o dinheiro que sai na obra, previsto ou já gasto."
          />
          <Feature
            icon={<LineChart className="h-5 w-5 text-accent" />}
            title="Gasto por fornecedor"
            desc="Soma automática de quanto já foi pago a cada fornecedor, com filtro por período."
          />
          <Feature
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
            title="Lance custo pelo chat"
            desc="Fale normal com a IA: 'gastei 150 em cimento' já entra como custo, sem formulário."
          />
          <Feature
            icon={<CheckCircle2 className="h-5 w-5 text-success" />}
            title="Cotação virou custo"
            desc="Aceite o melhor preço e ele já entra como gasto, sem lançar de novo."
          />
          <Feature
            icon={<Users className="h-5 w-5 text-accent" />}
            title="Família compartilhada"
            desc="Convide quem mora com você. Cada um com seu acesso: dono, admin ou só visualizador."
          />
          <Feature
            icon={<Lock className="h-5 w-5 text-warning" />}
            title="Privado por padrão"
            desc="Seus dados isolados por família, protegidos linha por linha no banco."
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
          <span>© {new Date().getFullYear()} On Obra · feito no Brasil</span>
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
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-bg-elev p-5 transition-colors hover:border-primary/40">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-bg-elev-2 text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
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
