export function ItemList({ items }) {
  if (items.length === 0) {
    return <p className="text-slate-600">Nenhum item cadastrado.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="font-medium">{item.name}</p>
          {item.description && (
            <p className="text-sm text-slate-600">{item.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
