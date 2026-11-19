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
import { createProduct, listProducts } from "./api";

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
