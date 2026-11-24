/**
 * Nova venda (spec 004, US1 e US2): leitura do produto, carrinho, pagamento,
 * finalização e comprovante. O carrinho é um redutor guardado no navegador
 * (research D13); a finalização é idempotente pelo id da venda (D6), então uma nova
 * tentativa depois de uma falha nunca registra a venda duas vezes.
 */
import { ScanBarcodeIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Product } from "@/features/products/types";
import { ApiError } from "@/lib/api-client";
import { BarcodeReader } from "./barcode-reader";
import { addCheck, itemCount, toSaleInput } from "./cart";
import { CartTable } from "./cart-table";
import { PaymentPanel } from "./payment-panel";
import { useRegisterSale } from "./queries";
import { SaleReceiptDialog } from "./sale-receipt-dialog";
import type { Sale, SaleProblem } from "./types";
import { newSaleId, useCart } from "./use-cart";

const UNEXPECTED = "Não foi possível finalizar a venda. Tente de novo.";

/** Mensagem da falha e, na recusa (409), os problemas de cada item (D16). */
function failureOf(error: unknown): {
  message: string;
  problems: SaleProblem[];
} {
  if (!(error instanceof ApiError))
    return { message: UNEXPECTED, problems: [] };
  if (error.kind === "conflict") {
    const problems = (error.body as { problems?: SaleProblem[] } | null)
      ?.problems;
    return { message: error.message, problems: problems ?? [] };
  }
  if (error.kind === "validation") {
    const message =
      error.fieldErrors.payments ?? error.fieldErrors.items ?? UNEXPECTED;
    return { message, problems: [] };
  }
  return {
    message: error.kind === "network" ? error.message : UNEXPECTED,
    problems: [],
  };
}

export function NewSalePage() {
  const [cart, dispatch] = useCart();
  // A leitura usa o carrinho mais recente, mesmo com bipes seguidos.
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const codeRef = useRef<HTMLInputElement>(null);
  const register = useRegisterSale();
  const finishing = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  function addProduct(product: Product): string | null {
    const refusal = addCheck(cartRef.current, product);
    if (!refusal) dispatch({ type: "add", product });
    return refusal;
  }

  function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setError(null);
    register.mutate(toSaleInput(cart), {
      onSuccess: (sale) => {
        dispatch({ type: "reset", saleId: newSaleId() });
        setReceipt(sale);
      },
      onError: (failure) => {
        const { message, problems } = failureOf(failure);
        if (problems.length > 0) dispatch({ type: "applyProblems", problems });
        setError(message);
      },
      onSettled: () => {
        finishing.current = false;
      },
    });
  }

  function startNewSale() {
    setReceipt(null);
    setError(null);
    codeRef.current?.focus();
  }

  function discard() {
    dispatch({ type: "reset", saleId: newSaleId() });
    setError(null);
    setDiscardOpen(false);
    codeRef.current?.focus();
  }

  const empty = cart.lines.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <title>Nova venda | NexoPDV</title>
      <section className="relative isolate overflow-hidden rounded-3xl bg-night-glow px-6 py-6 text-night-foreground shadow-lg sm:px-8">
        <div className="bg-grid-faint absolute inset-0 -z-10 opacity-60" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-2 text-sm font-medium text-night-muted">
              <ShoppingCartIcon className="size-4" aria-hidden="true" />
              Frente de caixa
            </p>
            <h1 className="type-page-title">Nova venda</h1>
            <p className="max-w-xl text-night-muted">
              Leia os produtos, receba em um ou mais meios e finalize. O estoque
              baixa na hora.
            </p>
          </div>
          {!empty && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-night-foreground hover:bg-white/10 hover:text-night-foreground"
              onClick={() => setDiscardOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Descartar venda
            </Button>
          )}
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-label="Leitura do produto"
            className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border sm:p-6"
          >
            <BarcodeReader inputRef={codeRef} onProduct={addProduct} />
          </section>

          <section
            aria-label="Carrinho"
            className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
          >
            <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
              <h2 className="font-bold">Itens</h2>
              <span className="type-meta text-muted-foreground">
                {itemCount(cart)} un.
              </span>
            </header>
            {empty ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-muted-foreground">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent text-primary">
                  <ScanBarcodeIcon className="size-6" aria-hidden="true" />
                </span>
                <p>
                  Nenhum item ainda. Leia o código de barras do primeiro
                  produto.
                </p>
              </div>
            ) : (
              <CartTable
                lines={cart.lines}
                onQuantity={(productId, quantity) =>
                  dispatch({ type: "setQuantity", productId, quantity })
                }
                onRemove={(productId) =>
                  dispatch({ type: "remove", productId })
                }
              />
            )}
          </section>
        </div>

        <aside
          aria-label="Pagamento"
          className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border sm:p-6 lg:sticky lg:top-24"
        >
          <PaymentPanel
            cart={cart}
            finishing={register.isPending}
            error={error}
            onAddPayment={(payment) => {
              setError(null);
              dispatch({ type: "addPayment", payment });
            }}
            onRemovePayment={(index) =>
              dispatch({ type: "removePayment", index })
            }
            onFinish={finish}
          />
        </aside>
      </div>

      <SaleReceiptDialog sale={receipt} onClose={startNewSale} />

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent className="rounded-2xl p-6 shadow-lg data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Descartar a venda?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os itens e os pagamentos desta venda saem do caixa. Nada é
              registrado e o estoque não muda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-6 -mb-6 rounded-b-2xl px-6">
            <AlertDialogCancel className="h-10 rounded-full px-5">
              Continuar vendendo
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-10 rounded-full px-5 font-semibold"
              onClick={discard}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
