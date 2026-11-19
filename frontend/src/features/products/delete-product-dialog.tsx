/**
 * Confirmação de remoção (FR-013). A remoção é inativação no back-end: o código de
 * barras continua reservado, e o lojista é avisado disso antes de confirmar.
 */
import { TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";
import { useReturnFocus } from "@/lib/use-return-focus";
import { useRemoveProduct } from "./queries";
import type { Product } from "./types";

type DeleteProductDialogProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: (product: Product) => void;
  /** O produto já tinha sido removido (em outra aba, FR-016). */
  onNotFound: () => void;
};

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
  onRemoved,
  onNotFound,
}: DeleteProductDialogProps) {
  const focus = useReturnFocus();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent {...focus}>
        {product && (
          <ConfirmRemoval
            product={product}
            onRemoved={onRemoved}
            onNotFound={onNotFound}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

const REMOVE_ERRORS = {
  network: "Não foi possível remover: sem conexão com o servidor.",
  unexpected: "Não foi possível remover. Tente de novo.",
};

/** Montado só com o diálogo aberto: cada abertura começa sem erro. */
function ConfirmRemoval({
  product,
  onRemoved,
  onNotFound,
}: {
  product: Product;
  onRemoved: (product: Product) => void;
  onNotFound: () => void;
}) {
  const remove = useRemoveProduct();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    remove.mutate(product.id, {
      onSuccess: () => onRemoved(product),
      onError: (failure) => {
        if (failure instanceof ApiError && failure.kind === "not-found")
          onNotFound();
        else if (failure instanceof ApiError && failure.kind === "network")
          setError(REMOVE_ERRORS.network);
        else setError(REMOVE_ERRORS.unexpected);
      },
    });
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Remover {product.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          O produto sai do catálogo. O código de barras {product.barcode}{" "}
          continua reservado e não poderá ser usado em outro produto.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        {/* Botão comum, não AlertDialogAction: o diálogo só fecha quando a remoção termina. */}
        <Button
          variant="destructive"
          disabled={remove.isPending}
          onClick={confirm}
        >
          {remove.isPending && <Spinner data-icon="inline-start" />}
          Remover produto
        </Button>
      </AlertDialogFooter>
    </>
  );
}
