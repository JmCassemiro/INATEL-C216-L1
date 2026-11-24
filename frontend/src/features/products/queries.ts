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
import { PRODUCTS_KEY, STOCK_KEY } from "@/lib/query-keys";
import {
  createProduct,
  listProducts,
  removeProduct,
  updateProduct,
} from "./api";
import type { ProductInput } from "./types";

export const PAGE_SIZE = 10;

export { PRODUCTS_KEY };

/**
 * Depois de mudar o catálogo, recarrega as listas e também o estoque: o mínimo, a
 * remoção e o cadastro mudam a reposição e os indicadores (spec 011, D13).
 */
function invalidateCatalog(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
    queryClient.invalidateQueries({ queryKey: STOCK_KEY }),
  ]);
}

export function useProductsPage(search: string, page: number) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, { search, page }],
    queryFn: () => listProducts({ search, page, size: PAGE_SIZE }),
    // Ao trocar de página, a lista anterior fica na tela até a nova chegar.
    placeholderData: keepPreviousData,
  });
}

/**
 * Total do catálogo, sem busca: é a mesma consulta da primeira página da lista, então
 * o menu e os indicadores reaproveitam o cache em vez de pedir de novo.
 */
export function useCatalogFirstPage() {
  return useProductsPage("", 1);
}

/** Cadastro (FR-007): sem repetição automática; a lista é recarregada no sucesso (FR-017). */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => invalidateCatalog(queryClient),
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
    onSettled: () => invalidateCatalog(queryClient),
  });
}

/** Remoção (FR-016): recarrega a lista no fim, com sucesso ou com 404. */
export function useRemoveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeProduct,
    onSettled: () => invalidateCatalog(queryClient),
  });
}
