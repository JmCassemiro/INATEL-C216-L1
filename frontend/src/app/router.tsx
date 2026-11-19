import { Navigate, type RouteObject } from "react-router";
import { ProductsPage } from "@/features/products/products-page";
import { AppLayout } from "./app-layout";

/** Rotas do painel; as próximas seções (estoque, vendas) entram como filhas do layout. */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/products" replace /> },
      {
        path: "products",
        element: <ProductsPage />,
        handle: { title: "Produtos" },
      },
      { path: "*", element: <Navigate to="/products" replace /> },
    ],
  },
];
