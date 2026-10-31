import unicodedata


def searchable(text: str) -> str:
    """Forma de comparação da busca: sem acentos e sem diferenciar maiúsculas (D11)."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(
        char for char in decomposed if not unicodedata.combining(char)
    ).casefold()
