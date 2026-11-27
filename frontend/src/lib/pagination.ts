export type PageItem = number | "gap";

/**
 * Números da paginação: sempre a primeira, a última e a atual com as vizinhas.
 * Um buraco de uma página só mostra o número; buracos maiores viram "gap" (…).
 */
export function pageItems(page: number, pages: number): PageItem[] {
  const shown = new Set([1, pages, page - 1, page, page + 1]);
  const numbers = [...shown]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  for (const n of numbers) {
    const previous = items.at(-1);
    if (typeof previous === "number" && n - previous === 2) items.push(n - 1);
    else if (typeof previous === "number" && n - previous > 2)
      items.push("gap");
    items.push(n);
  }
  return items;
}
