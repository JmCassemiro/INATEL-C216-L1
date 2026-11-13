import { useEffect, useState } from "react";
import { ItemForm } from "./components/ItemForm";
import { ItemList } from "./components/ItemList";
import { createItem, listItems } from "./services/items";

export default function App() {
  // O estado guarda só o que a interface mostra; a fonte dos dados é a API.
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    listItems()
      .then(setItems)
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  // Lança o erro da API para o formulário exibir (ex.: nome duplicado).
  async function addItem(values) {
    const created = await createItem(values);
    setItems((current) => [...current, created]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 p-4 sm:p-6">
      <h1 className="text-3xl font-bold">Gerenciador de Itens</h1>
      <ItemForm onAdd={addItem} />
      <section aria-labelledby="items-heading" className="space-y-3">
        <h2 id="items-heading" className="text-xl font-semibold">
          Itens cadastrados
        </h2>
        {loading && <p className="text-slate-600">Carregando itens...</p>}
        {loadError && (
          <p role="alert" className="text-red-700">
            {loadError}
          </p>
        )}
        {!loading && !loadError && <ItemList items={items} />}
      </section>
    </main>
  );
}
