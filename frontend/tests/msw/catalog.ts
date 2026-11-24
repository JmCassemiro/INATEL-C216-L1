/**
 * Catálogo falso, em memória, que se comporta como a API (contrato da spec 002 com as
 * mudanças das specs 007 e 011): lista do mais novo para o mais antigo (ou por nome,
 * ou pela falta), busca sem diferenciar maiúsculas e acentos, código de barras
 * reservado mesmo depois de remover, saldo que só muda por movimentação e as recusas
 * de saldo do estoque. Os testes semeiam produtos e conferem as requisições recebidas.
 */
import type {
  Product,
  ProductInput,
  ProductSort,
  StockStatus,
} from "@/features/products/types";
import type {
  AdjustmentInput,
  EntryInput,
  MovementKind,
  StockMovement,
} from "@/features/stock/types";

type StoredProduct = Omit<
  Product,
  "shortfall" | "stock_status" | "min_stock" | "stock_quantity"
> & {
  min_stock: number;
  stock_quantity: number;
  removed: boolean;
};

export type RecordedRequest = {
  method: string;
  path: string;
  body: unknown;
};

export type SeedProduct = Partial<
  Pick<Product, "id" | "description" | "price" | "min_stock" | "stock_quantity">
> &
  Pick<Product, "name" | "barcode">;

type ErrorBody = { detail: string };

export type CatalogResult =
  | { status: 200 | 201; body: unknown }
  | { status: 204 }
  | { status: 404 | 409; body: ErrorBody };

const NOT_FOUND = { detail: "Produto não encontrado" };
const DUPLICATE_BARCODE = { detail: "Código de barras já cadastrado" };
const MAX_STOCK = 999_999;
/** Momento fixo das movimentações, para as datas dos testes serem previsíveis. */
export const MOVEMENT_TIME = "2026-11-24T17:35:00Z";

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

function units(quantity: number): string {
  const number = quantity.toLocaleString("pt-BR");
  return quantity === 1 ? `${number} unidade` : `${number} unidades`;
}

function shortfallOf(product: StoredProduct): number {
  return Math.max(product.min_stock - product.stock_quantity, 0);
}

function statusOf(product: StoredProduct): StockStatus {
  if (product.stock_quantity === 0) return "out_of_stock";
  return product.stock_quantity < product.min_stock ? "restock" : "ok";
}

class FakeCatalog {
  private products: StoredProduct[] = [];
  private movements = new Map<string, StockMovement[]>();
  private nextId = 1;
  readonly requests: RecordedRequest[] = [];

  reset(): void {
    this.products = [];
    this.movements.clear();
    this.nextId = 1;
    this.requests.length = 0;
  }

  /** Cadastra produtos direto no catálogo, na ordem dada (o último é o mais novo). */
  seed(...products: SeedProduct[]): Product[] {
    return products.map((product) =>
      this.store({
        description: null,
        price: "10.00",
        min_stock: 0,
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

  list(params: {
    page: number;
    size: number;
    name: string;
    sort?: ProductSort;
    restock?: boolean;
  }) {
    const search = searchable(params.name.trim());
    const matches = this.products
      .filter((product) => !product.removed)
      .filter((product) => searchable(product.name).includes(search))
      .filter(
        (product) =>
          !params.restock || product.stock_quantity < product.min_stock,
      )
      .reverse();
    const byName = (a: StoredProduct, b: StoredProduct) =>
      searchable(a.name).localeCompare(searchable(b.name));
    if (params.sort === "name") matches.sort(byName);
    if (params.sort === "shortfall") {
      matches.sort((a, b) => shortfallOf(b) - shortfallOf(a) || byName(a, b));
    }
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
    // O saldo não muda pelo cadastro (spec 011, FR-002).
    Object.assign(product, normalized(input));
    return { status: 200, body: publicProduct(product) };
  }

  remove(id: string): CatalogResult {
    const product = this.active(id);
    if (!product) return { status: 404, body: NOT_FOUND };
    product.removed = true;
    return { status: 204 };
  }

  enter(id: string, input: EntryInput): CatalogResult {
    return this.move(id, "entry", input.quantity, input.note || null);
  }

  adjust(id: string, input: AdjustmentInput): CatalogResult {
    return this.move(id, "adjustment", input.quantity, input.reason);
  }

  movementsOf(id: string, page: number, size: number): CatalogResult {
    if (!this.active(id)) return { status: 404, body: NOT_FOUND };
    const items = [...(this.movements.get(id) ?? [])].reverse();
    const start = (page - 1) * size;
    return {
      status: 200,
      body: {
        items: items.slice(start, start + size),
        total: items.length,
        page,
        size,
      },
    };
  }

  summary() {
    const active = this.products.filter((product) => !product.removed);
    const cents = active.reduce(
      (total, product) =>
        total +
        product.stock_quantity * Math.round(Number(product.price) * 100),
      0,
    );
    return {
      restock_count: active.filter((p) => p.stock_quantity < p.min_stock)
        .length,
      out_of_stock_count: active.filter((p) => p.stock_quantity === 0).length,
      stock_value: (cents / 100).toFixed(2),
    };
  }

  private move(
    id: string,
    kind: MovementKind,
    quantity: number,
    note: string | null,
  ): CatalogResult {
    const product = this.active(id);
    if (!product) return { status: 404, body: NOT_FOUND };
    const balance = product.stock_quantity + quantity;
    if (balance < 0) {
      return {
        status: 409,
        body: {
          detail: `Saldo insuficiente: há ${units(product.stock_quantity)} em estoque`,
        },
      };
    }
    if (balance > MAX_STOCK) {
      return {
        status: 409,
        body: { detail: "O saldo não pode passar de 999.999 unidades" },
      };
    }
    const history = this.movements.get(id) ?? [];
    const movement: StockMovement = {
      id: `movement-${id}-${history.length + 1}`,
      product_id: id,
      sequence: history.length + 1,
      kind,
      quantity,
      balance_after: balance,
      note,
      occurred_at: MOVEMENT_TIME,
    };
    history.push(movement);
    this.movements.set(id, history);
    product.stock_quantity = balance;
    return { status: 201, body: movement };
  }

  private active(id: string): StoredProduct | undefined {
    return this.products.find(
      (product) => product.id === id && !product.removed,
    );
  }

  private store(
    input: ProductInput & { id?: string; stock_quantity?: number },
  ): Product {
    const product: StoredProduct = {
      ...normalized(input),
      id: input.id ?? `product-${this.nextId++}`,
      stock_quantity: input.stock_quantity ?? 0,
      removed: false,
    };
    this.products.push(product);
    return publicProduct(product);
  }
}

function normalized(input: ProductInput): ProductInput {
  return {
    name: input.name,
    description: input.description,
    barcode: input.barcode,
    price: twoDecimals(input.price),
    min_stock: input.min_stock ?? 0,
  };
}

function publicProduct({
  removed: _removed,
  ...product
}: StoredProduct): Product {
  return {
    ...product,
    shortfall: shortfallOf(product as StoredProduct),
    stock_status: statusOf(product as StoredProduct),
  };
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
