import pytest

from app.infrastructure.database.session import database_url


def test_database_url_comes_from_the_environment(monkeypatch):
    """A conexão é configurada pela variável de ambiente `DATABASE_URL`."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@db:5432/app")

    assert database_url() == "postgresql+psycopg://user:pass@db:5432/app"


@pytest.mark.parametrize("value", [None, ""])
def test_missing_database_url_fails_with_a_clear_message(monkeypatch, value):
    """Sem `DATABASE_URL`, a aplicação não sobe com uma credencial inventada."""
    if value is None:
        monkeypatch.delenv("DATABASE_URL", raising=False)
    else:
        monkeypatch.setenv("DATABASE_URL", value)

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        database_url()
