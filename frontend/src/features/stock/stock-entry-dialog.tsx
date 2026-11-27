/**
 * Diálogo "Registrar entrada" (spec 011, US1): quantidade e observação opcional.
 * Valida antes de enviar (FR-021), mostra a recusa do servidor no campo, preserva o
 * que foi digitado e não envia em dobro (FR-022).
 */
import { PackagePlusIcon, TriangleAlertIcon } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import type { Product } from "@/features/products/types";
import { ApiError } from "@/lib/api-client";
import { useReturnFocus } from "@/lib/use-return-focus";
import { MovementDialogHeader } from "./movement-dialog-header";
import { useRegisterEntry } from "./queries";
import type { StockMovement } from "./types";
import {
  type EntryFormErrors,
  type EntryFormValues,
  validateEntryForm,
} from "./validation";

type StockEntryDialogProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: (product: Product, movement: StockMovement) => void;
  /** O produto não existe mais (removido em outra aba). */
  onNotFound: () => void;
};

const SAVE_ERRORS = {
  network: "Não foi possível registrar: sem conexão com o servidor.",
  unexpected: "Não foi possível registrar. Tente de novo.",
};

export function StockEntryDialog({
  product,
  open,
  onOpenChange,
  onRegistered,
  onNotFound,
}: StockEntryDialogProps) {
  const focus = useReturnFocus();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...focus} className="sm:max-w-md">
        <MovementDialogHeader
          icon={PackagePlusIcon}
          title="Registrar entrada"
          product={product}
        />
        {/* Montado só com o diálogo aberto: cada abertura começa com o formulário limpo. */}
        {product && (
          <EntryForm
            product={product}
            onRegistered={onRegistered}
            onNotFound={onNotFound}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({
  product,
  onRegistered,
  onNotFound,
}: {
  product: Product;
  onRegistered: (product: Product, movement: StockMovement) => void;
  onNotFound: () => void;
}) {
  const [values, setValues] = useState<EntryFormValues>({
    quantity: "",
    note: "",
  });
  const [errors, setErrors] = useState<EntryFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const saving = useRef(false);
  const register = useRegisterEntry();

  function change(field: keyof EntryFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function showServerError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setGeneralError(SAVE_ERRORS.unexpected);
    } else if (error.kind === "not-found") {
      onNotFound();
    } else if (error.kind === "conflict") {
      setErrors({ quantity: error.message });
    } else if (error.kind === "validation") {
      const { quantity, note } = error.fieldErrors;
      if (quantity || note) setErrors({ quantity, note });
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
    const result = validateEntryForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    saving.current = true;
    register.mutate(
      { productId: product.id, input: result.input },
      {
        onSuccess: (movement) => onRegistered(product, movement),
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
        <Field data-invalid={errors.quantity ? true : undefined}>
          <FieldLabel htmlFor="entry-quantity">Quantidade</FieldLabel>
          <Input
            id="entry-quantity"
            inputMode="numeric"
            autoComplete="off"
            className="tabular-nums"
            value={values.quantity}
            aria-invalid={errors.quantity ? true : undefined}
            aria-describedby={
              errors.quantity ? "entry-quantity-error" : undefined
            }
            onChange={(event) => change("quantity", event.target.value)}
          />
          {errors.quantity && (
            <FieldError id="entry-quantity-error">{errors.quantity}</FieldError>
          )}
        </Field>
        <Field data-invalid={errors.note ? true : undefined}>
          <FieldLabel htmlFor="entry-note">Observação (opcional)</FieldLabel>
          <Input
            id="entry-note"
            autoComplete="off"
            value={values.note}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={
              errors.note
                ? "entry-note-description entry-note-error"
                : "entry-note-description"
            }
            onChange={(event) => change("note", event.target.value)}
          />
          <FieldDescription id="entry-note-description">
            Ex.: número da nota do fornecedor.
          </FieldDescription>
          {errors.note && (
            <FieldError id="entry-note-error">{errors.note}</FieldError>
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
          disabled={register.isPending}
          className="h-10 rounded-full px-5 font-semibold shadow-glow-brand"
        >
          {register.isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Registrando…
            </>
          ) : (
            "Registrar entrada"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
