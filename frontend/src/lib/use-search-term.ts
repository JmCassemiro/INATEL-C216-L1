import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "./use-debounced-value";

/**
 * Campo de busca ligado à URL (spec 007, FR-003 e FR-004): o texto digitado é local e
 * vai para a URL depois de uma pausa; se a URL mudar por fora (voltar do navegador),
 * o campo acompanha. Usado pelas seções Produtos e Estoque.
 */
export function useSearchTerm(
  search: string,
  setSearch: (term: string) => void,
) {
  const [term, setTerm] = useState(search);
  const debouncedTerm = useDebouncedValue(term);
  const submittedTerm = useRef(search);

  useEffect(() => {
    const trimmed = debouncedTerm.trim();
    if (trimmed !== submittedTerm.current) {
      submittedTerm.current = trimmed;
      setSearch(trimmed);
    }
  }, [debouncedTerm, setSearch]);

  useEffect(() => {
    if (search !== submittedTerm.current) {
      submittedTerm.current = search;
      setTerm(search);
    }
  }, [search]);

  /** Limpa o campo e a URL na hora, sem esperar a pausa. */
  const clear = useCallback(() => {
    submittedTerm.current = "";
    setTerm("");
    setSearch("");
  }, [setSearch]);

  return { term, setTerm, clear };
}
