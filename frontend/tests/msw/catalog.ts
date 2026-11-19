/**
 * Catálogo falso, em memória, que se comporta como a API de produtos (contrato da
 * spec 002 com as mudanças da 007): lista do mais novo para o mais antigo, busca sem
 * diferenciar maiúsculas e acentos, código de barras reservado mesmo depois de
 * remover. Os testes semeiam produtos e conferem as requisições recebidas.
 */
import type { Product, ProductInput } from "@/features/products/types";

type StoredProduct = Product & { removed: boolean };

export type RecordedRequest = {
  method: string;
  path: string;
  body: unknown;
};

export type SeedProduct = Partial<Product> & Pick<Product, "name" | "barcode">;

export type CatalogResult =
  | { status: 200 | 201; body: Product }
  | { status: 204 }
  | { status: 404 | 409; body: { detail: string } };

const NOT_FOUND = { detail: "Produto não encontrado" };
const DUPLICATE_BARCODE = { detail: "Código de barras já cadastrado" };

function searchable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function sameBarcode(a: string, b: string): boolean {
  return a.padStart(14, "0") === b.padStart(14, "0");
}

function twoDecimals(price: string): string {
  const [integer = "0", cents = ""] = price.split(".");
  return `${integer}.${cents.padEnd(2, "0").slice(0, 2)}`;
}

class FakeCatalog {
  private products: StoredProduct[] = [];
  private nextId = 1;
  readonly requests: RecordedRequest[] = [];

  reset(): void {
    this.products = [];
    this.nextId = 1;
    this.requests.length = 0;
  }

  /** Cadastra produtos direto no catálogo, na ordem dada (o último é o mais novo). */
  seed(...products: SeedProduct[]): Product[] {
    return products.map((product) =>
      this.store({
        description: null,
        price: "10.00",
        ...product,
      }),
    );
  }

  /** Cadastra `count` produtos "Produto 1"…"Produto n", com códigos válidos. */
  seedMany(count: number): Product[] {
    return this.seed(
      ...Array.from({ length: count }, (_, index) => ({
        name: `Produto ${index + 1}`,
        barcode: gtin13(index + 1),
      })),
    );
  }

  record(request: RecordedRequest): void {
    this.requests.push(request);
  }

  requestsTo(method: string): RecordedRequest[] {
    return this.requests.filter((request) => request.method === method);
  }

  list(params: { page: number; size: number; name: string }) {
    const search = searchable(params.name.trim());
    const matches = this.products
      .filter((product) => !product.removed)
      .filter((product) => searchable(product.name).includes(search))
      .reverse();
    const start = (params.page - 1) * params.size;
    return {
      items: matches.slice(start, start + params.size).map(publicProduct),
      total: matches.length,
      page: params.page,
      size: params.size,
    };
  }

  create(input: ProductInput): CatalogResult {
    if (
      this.products.some((product) =>
        sameBarcode(product.barcode, input.barcode),
      )
    ) {
      return { status: 409, body: DUPLICATE_BARCODE };
    }
    return { status: 201, body: this.store(input) };
  }

  update(id: string, input: ProductInput): CatalogResult {
    const product = this.active(id);
    if (!product) return { status: 404, body: NOT_FOUND };
    const taken = this.products.some(
      (other) => other.id !== id && sameBarcode(other.barcode, input.barcode),
    );
    if (taken) return { status: 409, body: DUPLICATE_BARCODE };
    Object.assign(product, normalized(input));
    return { status: 200, body: publicProduct(product) };
  }

  remove(id: string): CatalogResult {
    const product = this.active(id);
    if (!product) return { status: 404, body: NOT_FOUND };
    product.removed = true;
    return { status: 204 };
  }

  private active(id: string): StoredProduct | undefined {
    return this.products.find(
      (product) => product.id === id && !product.removed,
    );
  }

  private store(input: Omit<Product, "id"> & { id?: string }): Product {
    const product: StoredProduct = {
      ...normalized(input),
      id: input.id ?? `product-${this.nextId++}`,
      removed: false,
    };
    this.products.push(product);
    return publicProduct(product);
  }
}

function normalized(input: ProductInput): ProductInput {
  return { ...input, price: twoDecimals(input.price) };
}

function publicProduct({
  removed: _removed,
  ...product
}: StoredProduct): Product {
  return { ...product };
}

/** GTIN-13 válido com prefixo 789 (Brasil) a partir de um número. */
export function gtin13(number: number): string {
  const body = `789${String(number).padStart(9, "0")}`;
  const sum = [...body].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return `${body}${(10 - (sum % 10)) % 10}`;
}

export const catalog = new FakeCatalog();
