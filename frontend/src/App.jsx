import { useState } from "react";
import { ItemForm } from "./components/ItemForm";
import { ItemList } from "./components/ItemList";

export default function App() {
  const [items, setItems] = useState([]);

  // Na Prática 7, esta função passará a chamar a API (POST /items).
  function addItem({ name, description }) {
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), name, description },
    ]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 p-4 sm:p-6">
      <h1 className="text-3xl font-bold">Gerenciador de Itens</h1>
      <ItemForm onAdd={addItem} />
      <section aria-labelledby="items-heading" className="space-y-3">
        <h2 id="items-heading" className="text-xl font-semibold">
          Itens cadastrados
        </h2>
        <ItemList items={items} />
      </section>
    </main>
  );
}
