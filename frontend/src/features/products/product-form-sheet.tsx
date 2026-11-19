/**
 * Painel lateral de cadastro (FR-007) e edição (FR-008). Valida antes de enviar (FR-009), mostra os
 * erros do servidor no campo certo (FR-011), preserva o que foi digitado e não
 * envia em dobro (FR-012).
 */
import { TriangleAlertIcon } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { priceForInput } from "@/lib/money";
import { useReturnFocus } from "@/lib/use-return-focus";
import { useCreateProduct, useUpdateProduct } from "./queries";
import type { Product, ProductField, ProductInput } from "./types";
import {
  type ProductFormErrors,
  type ProductFormValues,
  validateProductForm,
} from "./validation";

type ProductFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Produto em edição; `null` para cadastrar um novo. */
  product: Product | null;
  onSaved: (product: Product) => void;
  /** O produto editado não existe mais (removido em outra aba, FR-016). */
  onNotFound: () => void;
};

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  onSaved,
  onNotFound,
}: ProductFormSheetProps) {
  const focus = useReturnFocus();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        {...focus}
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="type-page-title text-xl">
            {product ? "Editar produto" : "Novo produto"}
          </SheetTitle>
          <SheetDescription>
            Os dados aparecem assim na lista e na etiqueta.
          </SheetDescription>
        </SheetHeader>
        {/* Montado só com o painel aberto: cada abertura começa com o formulário limpo. */}
        <ProductForm
          product={product}
          onSaved={onSaved}
          onNotFound={onNotFound}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

const EMPTY: ProductFormValues = {
  name: "",
  description: "",
  barcode: "",
  price: "",
};
const FIELDS: ProductField[] = ["name", "description", "barcode", "price"];

function valuesOf(product: Product | null): ProductFormValues {
  if (!product) return EMPTY;
  return {
    name: product.name,
    description: product.description ?? "",
    barcode: product.barcode,
    price: priceForInput(product.price),
  };
}

const SAVE_ERRORS = {
  network: "Não foi possível salvar: sem conexão com o servidor.",
  unexpected: "Não foi possível salvar. Tente de novo.",
};

function ProductForm({
  product,
  onSaved,
  onNotFound,
  onCancel,
}: {
  product: Product | null;
  onSaved: (product: Product) => void;
  onNotFound: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ProductFormValues>(() =>
    valuesOf(product),
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const submitted = useRef(false);
  const saving = useRef(false);
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const isSaving = create.isPending || update.isPending;

  function change(field: ProductField, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // Depois do primeiro envio, o erro do campo acompanha a digitação.
    if (submitted.current) {
      const result = validateProductForm(next);
      setErrors((current) => ({
        ...current,
        [field]: result.ok ? undefined : result.errors[field],
      }));
    }
  }

  function showServerError(error: unknown) {
    if (error instanceof ApiError && error.kind === "not-found") {
      onNotFound();
    } else if (error instanceof ApiError && error.kind === "conflict") {
      setErrors({ barcode: error.message });
    } else if (error instanceof ApiError && error.kind === "validation") {
      const fieldErrors = Object.fromEntries(
        FIELDS.filter((field) => error.fieldErrors[field]).map((field) => [
          field,
          error.fieldErrors[field],
        ]),
      );
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else setGeneralError(SAVE_ERRORS.unexpected);
    } else if (error instanceof ApiError && error.kind === "network") {
      setGeneralError(SAVE_ERRORS.network);
    } else {
      setGeneralError(SAVE_ERRORS.unexpected);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    submitted.current = true;
    setGeneralError(null);

    const result = validateProductForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    saving.current = true;
    const callbacks = {
      onSuccess: onSaved,
      onError: showServerError,
      onSettled: () => {
        saving.current = false;
      },
    };
    const input: ProductInput = result.input;
    if (product) update.mutate({ id: product.id, input }, callbacks);
    else create.mutate(input, callbacks);
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <FieldGroup>
          <FormField id="product-name" label="Nome" error={errors.name}>
            <Input
              id="product-name"
              autoComplete="off"
              value={values.name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "product-name-error" : undefined}
              onChange={(event) => change("name", event.target.value)}
            />
          </FormField>

          <FormField
            id="product-description"
            label="Descrição (opcional)"
            error={errors.description}
          >
            <Textarea
              id="product-description"
              rows={3}
              value={values.description}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={
                errors.description ? "product-description-error" : undefined
              }
              onChange={(event) => change("description", event.target.value)}
            />
          </FormField>

          <FormField
            id="product-barcode"
            label="Código de barras"
            error={errors.barcode}
          >
            <Input
              id="product-barcode"
              inputMode="numeric"
              autoComplete="off"
              className="tabular-nums"
              value={values.barcode}
              aria-invalid={errors.barcode ? true : undefined}
              aria-describedby={
                errors.barcode ? "product-barcode-error" : undefined
              }
              onChange={(event) => change("barcode", event.target.value)}
            />
          </FormField>

          <FormField
            id="product-price"
            label="Preço de venda"
            error={errors.price}
          >
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>R$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="product-price"
                inputMode="decimal"
                autoComplete="off"
                className="tabular-nums"
                value={values.price}
                aria-invalid={errors.price ? true : undefined}
                aria-describedby={
                  errors.price ? "product-price-error" : undefined
                }
                onChange={(event) => change("price", event.target.value)}
              />
            </InputGroup>
          </FormField>
        </FieldGroup>

        {generalError && (
          <Alert variant="destructive" className="mt-5">
            <TriangleAlertIcon />
            <AlertTitle>{generalError}</AlertTitle>
            <AlertDescription>
              Os dados continuam no formulário.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Spinner data-icon="inline-start" />}
          {product ? "Salvar alterações" : "Cadastrar produto"}
        </Button>
      </SheetFooter>
    </form>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
