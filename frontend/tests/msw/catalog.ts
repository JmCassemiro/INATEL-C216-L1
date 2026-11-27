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
  Payment,
  Sale,
  SaleInput,
  SaleProblem,
} from "@/features/sales/types";
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

type ErrorBody = { detail: unknown; problems?: SaleProblem[] };

export type CatalogResult =
  | { status: 200 | 201; body: unknown }
  | { status: 204 }
  | { status: 404 | 409 | 422; body: ErrorBody };

export type SeedSale = Partial<
  Pick<Sale, "id" | "occurred_at" | "payments">
> & {
  items: { product: Product; quantity: number }[];
};

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

function cents(amount: string): number {
  const [integer = "0", decimals = ""] = amount.split(".");
  return Number(integer) * 100 + Number(decimals.padEnd(2, "0").slice(0, 2));
}

function money(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

function brl(value: number): string {
  const [integer = "0", decimals = "00"] = money(value).split(".");
  return `R$ ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimals}`;
}

function paymentsError(message: string): CatalogResult {
  return {
    status: 422,
    body: {
      detail: [
        { loc: ["body", "payments"], msg: message, type: "value_error" },
      ],
    },
  };
}

const SALE_REJECTED =
  "Não foi possível finalizar a venda. Revise os itens destacados.";

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
  private sales: Sale[] = [];
  private nextId = 1;
  readonly requests: RecordedRequest[] = [];

  reset(): void {
    this.products = [];
    this.movements.clear();
    this.sales = [];
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

  byBarcode(code: string): CatalogResult {
    const product = this.products.find(
      (item) => !item.removed && sameBarcode(item.barcode, code),
    );
    return product
      ? { status: 200, body: publicProduct(product) }
      : { status: 404, body: NOT_FOUND };
  }

  /** Venda registrada direto no catálogo (sem baixar o saldo), para o histórico. */
  seedSale(sale: SeedSale): Sale {
    const items = sale.items.map(({ product, quantity }) => ({
      product_id: product.id,
      name: product.name,
      barcode: product.barcode,
      unit_price: product.price,
      quantity,
      subtotal: money(cents(product.price) * quantity),
    }));
    const total = items.reduce((sum, item) => sum + cents(item.subtotal), 0);
    const payments = sale.payments ?? [{ method: "pix", amount: money(total) }];
    const paid = payments.reduce((sum, p) => sum + cents(p.amount), 0);
    const stored: Sale = {
      id: sale.id ?? `sale-${this.sales.length + 1}`,
      number: this.sales.length + 1,
      occurred_at: sale.occurred_at ?? new Date().toISOString(),
      items,
      payments,
      total: money(total),
      paid: money(paid),
      change: money(paid - total),
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    };
    this.sales.push(stored);
    return stored;
  }

  /** `POST /sales`: idempotente pelo id, com as recusas e as regras do back-end. */
  registerSale(input: SaleInput): CatalogResult {
    const existing = this.sales.find((sale) => sale.id === input.id);
    if (existing) return { status: 200, body: existing };

    const problems = input.items.flatMap((line): SaleProblem[] => {
      const product = this.active(line.product_id);
      if (!product) {
        const known = this.products.find((p) => p.id === line.product_id);
        return [
          {
            product_id: line.product_id,
            reason: "unavailable",
            message: `${known?.name ?? "Produto"} não está mais à venda`,
            available: null,
            current_price: null,
          },
        ];
      }
      if (cents(product.price) !== cents(line.unit_price)) {
        return [
          {
            product_id: product.id,
            reason: "price_changed",
            message: `O preço de ${product.name} mudou para ${brl(cents(product.price))}`,
            available: null,
            current_price: product.price,
          },
        ];
      }
      if (product.stock_quantity < line.quantity) {
        const available = product.stock_quantity;
        return [
          {
            product_id: product.id,
            reason: "insufficient_stock",
            message:
              available === 0
                ? `${product.name} está sem estoque`
                : `Há só ${available} un. de ${product.name} em estoque`,
            available,
            current_price: null,
          },
        ];
      }
      return [];
    });
    if (problems.length > 0) {
      return { status: 409, body: { detail: SALE_REJECTED, problems } };
    }

    const total = input.items.reduce(
      (sum, line) => sum + cents(line.unit_price) * line.quantity,
      0,
    );
    const paid = input.payments.reduce((sum, p) => sum + cents(p.amount), 0);
    const cash = input.payments
      .filter((p: Payment) => p.method === "cash")
      .reduce((sum, p) => sum + cents(p.amount), 0);
    if (paid < total) {
      return paymentsError(
        `Os pagamentos não cobrem o total: faltam ${brl(total - paid)}`,
      );
    }
    if (paid - cash > total) {
      return paymentsError(
        "Só o pagamento em dinheiro pode passar do total e gerar troco",
      );
    }
    if (paid > total && paid - total >= cash) {
      return paymentsError(
        "O troco não pode ser igual ou maior que o valor pago em dinheiro",
      );
    }

    const sale = this.seedSale({
      id: input.id,
      payments: input.payments,
      items: input.items.map((line) => ({
        product: publicProduct(this.active(line.product_id) as StoredProduct),
        quantity: line.quantity,
      })),
    });
    for (const line of input.items) {
      this.move(
        line.product_id,
        "sale",
        -line.quantity,
        `Venda nº ${sale.number}`,
      );
    }
    return { status: 201, body: sale };
  }

  listSales(page: number, size: number) {
    const newest = [...this.sales].reverse();
    const start = (page - 1) * size;
    return {
      items: newest.slice(start, start + size),
      total: newest.length,
      page,
      size,
    };
  }

  getSale(id: string): CatalogResult {
    const sale = this.sales.find((item) => item.id === id);
    return sale
      ? { status: 200, body: sale }
      : { status: 404, body: { detail: "Venda não encontrada" } };
  }

  salesSummary(start: string, end: string) {
    const from = Date.parse(start);
    const to = Date.parse(end);
    const today = this.sales.filter((sale) => {
      const at = Date.parse(sale.occurred_at);
      return from <= at && at < to;
    });
    const revenue = today.reduce((sum, sale) => sum + cents(sale.total), 0);
    return {
      count: today.length,
      revenue: money(revenue),
      average_ticket: money(
        today.length === 0 ? 0 : Math.round(revenue / today.length),
      ),
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
