/**
 * Prefixos das chaves do TanStack Query compartilhados pelas seções (spec 011,
 * research D13). Ficam fora das features para que Produtos e Estoque invalidem o
 * cache uma da outra sem import circular.
 */

/** Toda consulta de `GET /products`, inclusive a posição da seção Estoque. */
export const PRODUCTS_KEY = ["products"] as const;

/** Resumo e histórico do estoque. */
export const STOCK_KEY = ["stock"] as const;

/** Histórico e resumo das vendas (spec 004, research D17). */
export const SALES_KEY = ["sales"] as const;
