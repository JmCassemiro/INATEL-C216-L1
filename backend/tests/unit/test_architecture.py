"""Regra de dependência da Clean Architecture (D14, Princípio V).

Domínio e aplicação não podem importar o framework nem as camadas de fora.
"""

import ast
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parents[2] / "app"
INNER_LAYERS = ("domain", "application")
FORBIDDEN_IMPORTS = (
    "fastapi",
    "pydantic",
    "starlette",
    "app.api",
    "app.infrastructure",
)


def find_forbidden_imports(source: str) -> list[str]:
    """Devolve os imports proibidos encontrados no código-fonte."""
    imported: list[str] = []
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            imported.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            imported.append(node.module)
    return [name for name in imported if _is_forbidden(name)]


def _is_forbidden(module: str) -> bool:
    return any(
        module == forbidden or module.startswith(f"{forbidden}.")
        for forbidden in FORBIDDEN_IMPORTS
    )


def _inner_layer_modules() -> list[Path]:
    return sorted(
        path for layer in INNER_LAYERS for path in (APP_DIR / layer).rglob("*.py")
    )


def test_checker_flags_framework_and_outer_layer_imports():
    """D14: o verificador acusa imports do framework e das camadas de fora."""
    source = "import fastapi\nfrom app.infrastructure.repositories import x\n"

    assert find_forbidden_imports(source) == [
        "fastapi",
        "app.infrastructure.repositories",
    ]


def test_checker_accepts_stdlib_and_inner_imports():
    """D14: imports da stdlib e das camadas de dentro são permitidos."""
    source = "import uuid\nfrom decimal import Decimal\nfrom app.domain import errors\n"

    assert find_forbidden_imports(source) == []


def test_inner_layers_have_modules_to_check():
    """D14: o verificador percorre módulos reais de domínio e aplicação."""
    assert _inner_layer_modules()


@pytest.mark.parametrize(
    "module", _inner_layer_modules(), ids=lambda p: str(p.relative_to(APP_DIR))
)
def test_inner_layers_do_not_import_outer_layers(module: Path):
    """Princípio V: domínio e aplicação só dependem da stdlib e de camadas internas."""
    source = module.read_text(encoding="utf-8")

    assert find_forbidden_imports(source) == []
