/**
 * Dados do servidor com TanStack Query (research D6). Cada busca e página é uma
 * chave de cache própria, então a tela só mostra a resposta da visão atual, mesmo
 * que uma resposta antiga chegue depois.
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createProduct,
  listProducts,
  removeProduct,
  updateProduct,
} from "./api";
import type { ProductInput } from "./types";

export const PAGE_SIZE = 10;

/** Prefixo de todas as consultas de produtos (invalidado depois de cada mudança). */
export const PRODUCTS_KEY = ["products"] as const;

export function useProductsPage(search: string, page: number) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, { search, page }],
    queryFn: () => listProducts({ search, page, size: PAGE_SIZE }),
    // Ao trocar de página, a lista anterior fica na tela até a nova chegar.
    placeholderData: keepPreviousData,
  });
}

/** Cadastro (FR-007): sem repetição automática; a lista é recarregada no sucesso (FR-017). */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

/**
 * Edição (FR-008) com PUT do cadastro completo (research D9). A lista é recarregada
 * no fim, com sucesso ou não: se o produto sumiu (404), ela já sai sem ele (FR-016).
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      updateProduct(id, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

/** Remoção (FR-016): recarrega a lista no fim, com sucesso ou com 404. */
export function useRemoveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeProduct,
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}
