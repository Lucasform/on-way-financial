"use client";

import {
  Bell,
  CalendarClock,
  Camera,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Home,
  ListTodo,
  type LucideIcon,
  Receipt,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PushOptIn } from "@/components/modules/daily-briefing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TOUR_KEY = "tour_seen_v1";

interface Step {
  icon: LucideIcon;
  title: string;
  intro: string;
  points: string[];
  href?: string;
  cta?: string;
  push?: boolean;
}

function steps(canWrite: boolean): Step[] {
  return [
    {
      icon: HardHat,
      title: "Bem-vindo ao On Obra",
      intro: "Aqui fica a obra inteira num lugar só: quem fornece, quanto custa, o que já foi pago, o que vence e o que falta fazer.",
      points: canWrite
        ? ["Em 1 minuto a gente mostra onde fica cada coisa.", "Dá pra rever este tour quando quiser no botão Como usar, na página inicial."]
        : [
            "Você entrou pra acompanhar: dá pra ver tudo, mas só quem administra a obra edita.",
            "Dá pra rever este tour quando quiser no botão Como usar, na página inicial.",
          ],
    },
    {
      icon: Home,
      title: "Página inicial",
      intro: "O resumo da obra pra bater o olho todo dia.",
      points: [
        "Gasto até o momento, com o previsto a pagar e o total comprometido logo abaixo.",
        "Pagamentos da semana e atividades do dia, com atrasados em vermelho.",
        ...(canWrite ? ["Adicionar despesa: lança um custo em segundos, já com o fornecedor."] : []),
      ],
    },
    {
      icon: Store,
      title: "Fornecedores",
      intro: "Cada fornecedor tem uma ficha com tudo dele.",
      points: [
        "Telefone e atalho pro WhatsApp.",
        "Orçamentos em PDF anexados, quantos precisar.",
        "As cotações e os custos daquele fornecedor juntos na mesma tela.",
      ],
      href: "/overview/fornecedores",
      cta: "Ver fornecedores",
    },
    {
      icon: Receipt,
      title: "Cotações",
      intro: "Registre os preços que recebeu pra comparar antes de fechar.",
      points: [
        "O mesmo item de fornecedores diferentes fica lado a lado, com o melhor preço marcado.",
        "Enquanto está em aberto, dá pra editar o valor se anotou errado.",
        "Ao fechar, toque em Executar e diga se pagou o valor total ou parcial.",
        "A cotação passa por Em aberto, Em execução (pagando) e Aceita (quitada).",
      ],
      href: "/overview/cotacoes",
      cta: "Ver cotações",
    },
    {
      icon: CalendarClock,
      title: "Pagamentos",
      intro: "O plano de pagamento de cada cotação, do jeito que foi negociado.",
      points: [
        "Misture entrada, parcelas fixas, intercaladas (ex.: semestrais) e parcela final.",
        "Cada parcela pode ter valor e data próprios, e o app confere se a soma fecha.",
        "Agendados mostra o que vence; Executados mostra tudo que já saiu, mês a mês.",
      ],
      href: "/overview/pagamentos",
      cta: "Ver pagamentos",
    },
    {
      icon: ListTodo,
      title: "Atividades",
      intro: "O que precisa ser feito na obra e por quem.",
      points: [
        "Cada atividade tem responsável e data.",
        "As do dia e as atrasadas aparecem na página inicial e no aviso da manhã.",
      ],
      href: "/overview/atividades",
      cta: "Ver atividades",
    },
    {
      icon: Wallet,
      title: "Gasto",
      intro: "Tudo que já foi pago, somado por fornecedor.",
      points: [
        "Filtre por este mês, mês passado ou um período.",
        ...(canWrite ? ["Lançou errado? Apague por aqui, sempre com confirmação. Pra corrigir um valor, use a tela do fornecedor."] : []),
      ],
      href: "/overview/gasto",
      cta: "Ver gasto",
    },
    {
      icon: Camera,
      title: "Andamento, Documentos e Galeria",
      intro: "A memória da obra.",
      points: [
        "Andamento: o diário com fotos, mês a mês.",
        "Documentos: plantas, projetos e contratos, organizados em pastas.",
        "Galeria: todas as fotos e vídeos.",
      ],
    },
    {
      icon: Sparkles,
      title: "Assistente",
      intro: "O botão redondo no canto da tela é um assistente que conhece a sua obra.",
      points: [
        "Pergunte coisas como \"quanto já gastei até agora?\" ou \"quanto paguei pra Casa do Construtor?\".",
        ...(canWrite
          ? ["Ou diga \"paguei 500 de cimento na Casa do Construtor\": ele monta o lançamento e só grava depois que você confirmar."]
          : []),
      ],
    },
    {
      icon: Bell,
      title: "Avisos do dia",
      intro: "O app avisa o que vence pra nada passar.",
      points: [
        "Ao abrir o app, um resumo do dia com pagamentos e atividades.",
        "Todo dia às 8h, notificação no celular pra quem ativar e e-mail pra quem administra a obra.",
        "Na tela Família dá pra convidar quem mais acompanha a obra.",
      ],
      push: true,
    },
  ];
}

function readLocal(): boolean {
  try {
    return window.localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLocal() {
  try {
    window.localStorage.setItem(TOUR_KEY, "1");
  } catch {}
}

export function AppTour({
  canWrite,
  open,
  onOpenChange,
}: {
  canWrite: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [i, setI] = useState(0);
  const list = steps(canWrite);
  const step = list[i]!;
  const last = i === list.length - 1;
  const Icon = step.icon;

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  function finish() {
    writeLocal();
    onOpenChange(false);
    const supabase = createSupabaseBrowser();
    supabase.auth
      .updateUser({ data: { [TOUR_KEY]: new Date().toISOString() } })
      .catch(() => undefined);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto">
        <div className="flex flex-col items-center pt-2 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg">
            <Icon className="h-7 w-7" />
          </span>
          <DialogTitle className="text-lg">{step.title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm">{step.intro}</DialogDescription>
        </div>

        <ul className="space-y-2 text-sm">
          {step.points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        {step.push && <PushOptIn compact />}

        {step.href && step.cta && (
          <Link href={step.href} onClick={finish} className="text-center text-xs text-primary hover:underline">
            {step.cta} agora
          </Link>
        )}

        <div className="flex justify-center gap-1.5 pt-1" aria-hidden>
          {list.map((s, idx) => (
            <button
              key={s.title}
              type="button"
              tabIndex={-1}
              onClick={() => setI(idx)}
              className={cn("h-1.5 rounded-full transition-all", idx === i ? "w-5 bg-primary" : "w-1.5 bg-border hover:bg-text-muted")}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          {i === 0 ? (
            <Button variant="ghost" size="sm" onClick={finish}>
              Pular
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setI(i - 1)}>
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
          )}
          <span className="text-[11px] text-text-muted">
            {i + 1} de {list.length}
          </span>
          {last ? (
            <Button size="sm" onClick={finish}>
              Começar
            </Button>
          ) : (
            <Button size="sm" onClick={() => setI(i + 1)}>
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Abre o tour sozinho na primeira vez de cada usuário (marcado na conta, vale em qualquer aparelho). */
export function useFirstVisitTour(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (readLocal()) return;
    let cancelled = false;
    createSupabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        const seen = data.session?.user.user_metadata?.[TOUR_KEY];
        if (cancelled) return;
        if (seen) writeLocal();
        else if (data.session) setOpen(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return [open, setOpen];
}
