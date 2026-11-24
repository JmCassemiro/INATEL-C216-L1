/**
 * A venda em andamento guardada neste navegador (spec 004, FR-028, research D13):
 * sobrevive a trocar de seção e a recarregar a página, com o mesmo id (o reenvio
 * depois de uma falha não duplica a venda). Leitura e escrita protegidas: sem acesso
 * ao armazenamento (janela privada, bloqueio), a venda só não é guardada.
 */
import { useEffect, useReducer } from "react";
import { type Cart, type CartAction, cartReducer, emptyCart } from "./cart";

const STORAGE_KEY = "nexopdv:sale-in-progress";

export function newSaleId(): string {
  return crypto.randomUUID();
}

function load(): Cart {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const cart = JSON.parse(stored) as Partial<Cart>;
      if (
        typeof cart.saleId === "string" &&
        Array.isArray(cart.lines) &&
        Array.isArray(cart.payments)
      ) {
        return {
          saleId: cart.saleId,
          lines: cart.lines,
          payments: cart.payments,
        };
      }
    }
  } catch {
    // Armazenamento indisponível ou conteúdo inválido: começa uma venda nova.
  }
  return emptyCart(newSaleId());
}

export function useCart(): [Cart, (action: CartAction) => void] {
  const [cart, dispatch] = useReducer(cartReducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Sem armazenamento: a venda continua só nesta tela.
    }
  }, [cart]);

  return [cart, dispatch];
}
