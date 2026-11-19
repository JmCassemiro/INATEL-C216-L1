import { Navigate, type RouteObject } from "react-router";
import { LandingPage } from "@/features/landing/landing-page";
import { ProductsPage } from "@/features/products/products-page";
import { AppLayout } from "./app-layout";

/**
 * Rotas: a página de entrada em `/` e o painel sob o layout com menu lateral. As
 * próximas seções (estoque, vendas) entram como filhas do layout.
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
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];
