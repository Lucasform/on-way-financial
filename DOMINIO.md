# Domínio — On Way Financial

> Conhecimento de domínio externalizado para a IA (o "moat" do cap. 6 do playbook).
> O Claude lê isto antes de implementar lógica financeira. **Lucas: vá adicionando
> edge cases reais que aparecerem; cada um vira parte da vantagem do produto.**

## Conceitos-chave

- **Regime de caixa (padrão do app):** a movimentação conta quando o dinheiro
  entra ou sai de fato, não na data do fato gerador. (Competência fica para relatório futuro.)
- **Transferência entre contas próprias NÃO é receita nem despesa.** Mover dinheiro
  da conta corrente para a poupança não pode inflar gastos nem renda. Tratar como
  categoria "transferência" e excluir de totais de receita/despesa.
- **Cartão de crédito:** a *compra* é a despesa (na data e categoria da compra). O
  *pagamento da fatura* é uma transferência (conta → cartão), não recontar como despesa.
- **Compra parcelada:** lançar as parcelas futuras (ou o total com vencimentos), para
  o saldo projetado refletir o compromisso.
- **Estorno / reembolso / cashback:** reduz a despesa original; não vira "receita".
- **Saldo projetado:** considera lançamentos futuros e recorrências (assinaturas, salário).

## Regras de categorização

- Toda transação tem categoria; "não classificado" é fila de revisão, não destino final.
- A IA sugere categoria mas o usuário confirma (human-in-the-loop).
- Recorrências detectadas (mesma descrição/valor) podem virar regra automática.

## Conciliação e idempotência

- Importação de extrato deve **casar** com lançamentos existentes para não duplicar.
- Idempotência por id/hash da transação de origem (evita lançar 2x o mesmo gasto).

## Pessoa física x empresa

- Receita PF x PJ; pró-labore é saída da empresa e entrada da pessoa.
- MEI: limite anual de faturamento e DAS mensal (alerta útil, não cálculo fiscal).
- Não somos software de imposto; relatórios são gerenciais (DRE simplificado, por categoria).

## Formatação

- Moeda BRL, formato pt-BR (R$ 1.234,56). Arredondar em centavos. Guardar em centavos (inteiro) quando possível.

## Edge cases conhecidos (expandir sempre)

- Lançamento em moeda estrangeira (guardar moeda + taxa do dia).
- Juros/multa de atraso entram como despesa separada, não somam ao principal.
- Salário: distinguir bruto x líquido; descontos (INSS, IR) como categorias.
- Despesa compartilhada (dividir entre membros do household).
