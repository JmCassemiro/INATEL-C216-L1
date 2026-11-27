/**
 * Diálogo "Ajustar estoque" (spec 011, US3): direção explícita (retirar ou adicionar),
 * quantidade sempre positiva, motivo obrigatório e a prévia "Saldo: atual → fica"
 * (FR-020). O lojista nunca digita sinal de menos (research D14). A prévia usa o saldo
 * exibido; se ele mudou em outra aba, a recusa do servidor aparece no campo.
 */
import {
  MinusIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import type { Product } from "@/features/products/types";
import { ApiError } from "@/lib/api-client";
import { formatQuantity } from "@/lib/quantity";
import { useReturnFocus } from "@/lib/use-return-focus";
import { MovementDialogHeader } from "./movement-dialog-header";
import { useAdjustStock } from "./queries";
import type { StockMovement } from "./types";
import {
  type AdjustmentDirection,
  type AdjustmentFormErrors,
  type AdjustmentFormValues,
  adjustmentDelta,
  validateAdjustmentForm,
} from "./validation";

type StockAdjustmentDialogProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjusted: (product: Product, movement: StockMovement) => void;
  /** O produto não existe mais (removido em outra aba). */
  onNotFound: () => void;
};

const DIRECTIONS: {
  value: AdjustmentDirection;
  label: string;
  icon: typeof MinusIcon;
}[] = [
  { value: "remove", label: "Retirar", icon: MinusIcon },
  { value: "add", label: "Adicionar", icon: PlusIcon },
];

const SAVE_ERRORS = {
  network: "Não foi possível salvar: sem conexão com o servidor.",
  unexpected: "Não foi possível salvar o ajuste. Tente de novo.",
};

export function StockAdjustmentDialog({
  product,
  open,
  onOpenChange,
  onAdjusted,
  onNotFound,
}: StockAdjustmentDialogProps) {
  const focus = useReturnFocus();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...focus} className="sm:max-w-md">
        <MovementDialogHeader
          icon={SlidersHorizontalIcon}
          title="Ajustar estoque"
          product={product}
        />
        {/* Montado só com o diálogo aberto: cada abertura começa com o formulário limpo. */}
        {product && (
          <AdjustmentForm
            product={product}
            onAdjusted={onAdjusted}
            onNotFound={onNotFound}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AdjustmentForm({
  product,
  onAdjusted,
  onNotFound,
}: {
  product: Product;
  onAdjusted: (product: Product, movement: StockMovement) => void;
  onNotFound: () => void;
}) {
  const [values, setValues] = useState<AdjustmentFormValues>({
    direction: "remove",
    quantity: "",
    reason: "",
  });
  const [errors, setErrors] = useState<AdjustmentFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const saving = useRef(false);
  const adjust = useAdjustStock();

  const delta = adjustmentDelta(values);
  const balance = product.stock_quantity;

  function change<K extends keyof AdjustmentFormValues>(
    field: K,
    value: AdjustmentFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    const errorField = field === "direction" ? "quantity" : field;
    setErrors((current) => ({ ...current, [errorField]: undefined }));
  }

  function showServerError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setGeneralError(SAVE_ERRORS.unexpected);
    } else if (error.kind === "not-found") {
      onNotFound();
    } else if (error.kind === "conflict") {
      setErrors({ quantity: error.message });
    } else if (error.kind === "validation") {
      const { quantity, reason } = error.fieldErrors;
      if (quantity || reason) setErrors({ quantity, reason });
      else setGeneralError(SAVE_ERRORS.unexpected);
    } else {
      setGeneralError(
        SAVE_ERRORS[error.kind === "network" ? "network" : "unexpected"],
      );
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    setGeneralError(null);
    const result = validateAdjustmentForm(values, balance);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    saving.current = true;
    adjust.mutate(
      { productId: product.id, input: result.input },
      {
        onSuccess: (movement) => onAdjusted(product, movement),
        onError: showServerError,
        onSettled: () => {
          saving.current = false;
        },
      },
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <FieldGroup>
        <RadioGroup
          aria-label="Tipo de ajuste"
          value={values.direction}
          onValueChange={(value) =>
            change("direction", value as AdjustmentDirection)
          }
          className="grid grid-cols-2 gap-2"
        >
          {DIRECTIONS.map(({ value, label, icon: Icon }) => (
            <Label
              key={value}
              htmlFor={`adjust-${value}`}
              className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 font-semibold transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:text-accent-foreground"
            >
              <RadioGroupItem id={`adjust-${value}`} value={value} />
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Label>
          ))}
        </RadioGroup>

        <Field data-invalid={errors.quantity ? true : undefined}>
          <FieldLabel htmlFor="adjust-quantity">Quantidade</FieldLabel>
          <Input
            id="adjust-quantity"
            inputMode="numeric"
            autoComplete="off"
            className="tabular-nums"
            value={values.quantity}
            aria-invalid={errors.quantity ? true : undefined}
            aria-describedby={
              errors.quantity ? "adjust-quantity-error" : undefined
            }
            onChange={(event) => change("quantity", event.target.value)}
          />
          {errors.quantity && (
            <FieldError id="adjust-quantity-error">
              {errors.quantity}
            </FieldError>
          )}
          <p
            role="status"
            className="type-meta min-h-[1.4em] font-semibold tabular-nums text-muted-foreground"
          >
            {delta !== null &&
              `Saldo: ${formatQuantity(balance)} → ${formatQuantity(balance + delta)}`}
          </p>
        </Field>

        <Field data-invalid={errors.reason ? true : undefined}>
          <FieldLabel htmlFor="adjust-reason">Motivo</FieldLabel>
          <Input
            id="adjust-reason"
            autoComplete="off"
            value={values.reason}
            aria-invalid={errors.reason ? true : undefined}
            aria-describedby={
              errors.reason
                ? "adjust-reason-description adjust-reason-error"
                : "adjust-reason-description"
            }
            onChange={(event) => change("reason", event.target.value)}
          />
          <FieldDescription id="adjust-reason-description">
            Ex.: avaria, vencimento, contagem de inventário.
          </FieldDescription>
          {errors.reason && (
            <FieldError id="adjust-reason-error">{errors.reason}</FieldError>
          )}
        </Field>
      </FieldGroup>

      {generalError && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>{generalError}</AlertTitle>
          <AlertDescription>Os dados continuam no formulário.</AlertDescription>
        </Alert>
      )}

      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full px-5"
          >
            Cancelar
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={adjust.isPending}
          className="h-10 rounded-full px-5 font-semibold shadow-glow-brand"
        >
          {adjust.isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Salvando…
            </>
          ) : (
            "Salvar ajuste"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
