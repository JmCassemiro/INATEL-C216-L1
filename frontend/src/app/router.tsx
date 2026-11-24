import { Navigate, type RouteObject } from "react-router";
import { LandingPage } from "@/features/landing/landing-page";
import { ProductsPage } from "@/features/products/products-page";
import { StockPage } from "@/features/stock/stock-page";
import { AppLayout } from "./app-layout";

/**
 * Rotas: a página de entrada em `/` e o painel sob o layout com menu lateral. As
 * seções do painel (produtos, estoque e, depois, vendas) são filhas do layout.
 */
export const routes: RouteObject[] = [
  { path: "/", element: <LandingPage /> },
  {
    element: <AppLayout />,
    children: [
      {
        path: "/products",
        element: <ProductsPage />,
        handle: { title: "Produtos" },
      },
      {
        path: "/stock",
        element: <StockPage />,
        handle: { title: "Estoque" },
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];
