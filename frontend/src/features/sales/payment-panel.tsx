/**
 * Pagamento da venda (spec 004, FR-009 a FR-012): resumo com o total, meio e valor
 * (preenchido com o que falta), a lista de pagamentos, a situação (falta pagar ou
 * troco) e a finalização. As regras de troco são as do carrinho (`cart.ts`), as mesmas
 * da API.
 */
import { BanknoteIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { PriceTag } from "@/features/products/price-tag";
import {
  formatCents,
  formatPrice,
  fromCents,
  parseMoneyInput,
  priceForInput,
} from "@/lib/money";
import { formatUnits } from "@/lib/quantity";
import { cn } from "@/lib/utils";
import {
  type Cart,
  canFinish,
  itemCount,
  paymentError,
  paymentStatus,
  paymentsProblem,
  remainingCents,
  totalCents,
} from "./cart";
import { PAYMENT_LABELS, PAYMENT_METHODS } from "./payment-methods";
import type { Payment, PaymentMethod } from "./types";

type PaymentPanelProps = {
  cart: Cart;
  finishing: boolean;
  error: string | null;
  onAddPayment: (payment: Payment) => void;
  onRemovePayment: (index: number) => void;
  onFinish: () => void;
};

export function PaymentPanel({
  cart,
  finishing,
  error,
  onAddPayment,
  onRemovePayment,
  onFinish,
}: PaymentPanelProps) {
  const total = totalCents(cart);
  const remaining = remainingCents(cart);
  const problem = paymentsProblem(cart);

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Resumo da venda"
        className="relative isolate overflow-hidden rounded-2xl bg-night-glow px-5 py-5 text-night-foreground"
      >
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="type-meta text-night-muted">
              Itens: {formatUnits(itemCount(cart))}
            </p>
            <p className="text-sm font-semibold">Total</p>
          </div>
          <PriceTag price={fromCents(total)} size="label" />
        </div>
      </section>

      <PaymentForm
        cart={cart}
        remaining={remaining}
        onAddPayment={onAddPayment}
      />

      {cart.payments.length > 0 && (
        <ul aria-label="Pagamentos" className="flex flex-col gap-2">
          {cart.payments.map((payment, index) => {
            const label = PAYMENT_LABELS[payment.method];
            const amount = formatPrice(payment.amount);
            return (
              <li
                // A lista só cresce no fim ou perde itens; a posição identifica.
                // biome-ignore lint/suspicious/noArrayIndexKey: pagamentos não têm id próprio.
                key={index}
                className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2"
              >
                <BanknoteIcon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="flex-1 font-medium">{label}</span>
                <span className="font-bold tabular-nums">{amount}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover pagamento ${label} de ${amount}`}
                  onClick={() => onRemovePayment(index)}
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div
        role="status"
        aria-label="Situação do pagamento"
        className={cn(
          "rounded-xl px-4 py-3 text-center font-bold",
          problem
            ? "bg-destructive/10 text-destructive"
            : remaining > 0
              ? "bg-muted text-foreground"
              : "bg-success/10 text-success",
        )}
      >
        {cart.lines.length === 0 ? "Nenhum item na venda" : paymentStatus(cart)}
        {problem && <span className="mt-1 block text-sm">{problem}</span>}
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle className="line-clamp-none">{error}</AlertTitle>
        </Alert>
      )}

      <Button
        type="button"
        variant="highlight"
        className="h-12 text-base"
        disabled={finishing || !canFinish(cart)}
        onClick={onFinish}
      >
        {finishing ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            Finalizando…
          </>
        ) : (
          "Finalizar venda"
        )}
      </Button>
    </div>
  );
}

/** Meio e valor; o valor acompanha o que falta pagar (FR-010). */
function PaymentForm({
  cart,
  remaining,
  onAddPayment,
}: {
  cart: Cart;
  remaining: number;
  onAddPayment: (payment: Payment) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(remaining > 0 ? priceForInput(fromCents(remaining)) : "");
    setError(null);
  }, [remaining]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseMoneyInput(amount);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const payment = { method, amount: parsed.value };
    const refusal = paymentError(cart, payment);
    if (refusal) {
      setError(refusal);
      return;
    }
    setError(null);
    onAddPayment(payment);
  }

  const disabled = cart.lines.length === 0;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <RadioGroup
        aria-label="Meio de pagamento"
        value={method}
        onValueChange={(value) => {
          setMethod(value as PaymentMethod);
          setError(null);
        }}
        className="grid grid-cols-2 gap-2"
      >
        {PAYMENT_METHODS.map((value) => (
          <Label
            key={value}
            htmlFor={`payment-${value}`}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:text-accent-foreground"
          >
            <RadioGroupItem id={`payment-${value}`} value={value} />
            {PAYMENT_LABELS[value]}
          </Label>
        ))}
      </RadioGroup>

      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="payment-amount">Valor</FieldLabel>
        <div className="flex gap-2">
          <InputGroup className="h-11 flex-1 bg-background">
            <InputGroupAddon>R$</InputGroupAddon>
            <InputGroupInput
              id="payment-amount"
              inputMode="decimal"
              autoComplete="off"
              className="text-base font-semibold tabular-nums"
              value={amount}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "payment-amount-error" : undefined}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
            />
          </InputGroup>
          <Button
            type="submit"
            variant="outline"
            className="h-11 rounded-xl px-4 font-semibold"
            disabled={disabled}
          >
            Adicionar pagamento
          </Button>
        </div>
        {error && <FieldError id="payment-amount-error">{error}</FieldError>}
        {remaining > 0 && !error && (
          <p className="type-meta text-muted-foreground">
            Falta {formatCents(remaining)}. Em dinheiro, o valor pode passar e
            gerar troco.
          </p>
        )}
      </Field>
    </form>
  );
}
