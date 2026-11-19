"""CORS: quais origens o navegador pode usar para chamar a API.

O frontend (Vite, porta 5173) e a API (porta 8000) são origens diferentes; sem esta
autorização, o navegador bloqueia a leitura das respostas.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def cors_origins() -> list[str]:
    """Origens de `CORS_ORIGINS` (separadas por vírgula); sem ela, as do Vite local.

    Nada de `"*"`: só são liberadas as origens que o frontend realmente usa.
    """
    origins = os.environ.get("CORS_ORIGINS") or DEFAULT_CORS_ORIGINS
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


def add_cors(app: FastAPI) -> None:
    """Libera exatamente os métodos que o painel usa: listar (GET), cadastrar (POST),
    salvar a edição (PUT) e remover (DELETE). O PATCH continua na API para outros
    clientes, mas o navegador não é autorizado a chamá-lo (spec 007, RP-003).
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type"],
    )
