"""Banco de dados dos testes.

Por padrão, um SQLite em arquivo temporário, para `make test` rodar sem Docker. Com
`TEST_DATABASE_URL` definida (o CI usa um PostgreSQL), os mesmos testes rodam nesse
banco. O esquema é criado pelas migrations, e não pelos modelos, para que os testes
também garantam que elas reproduzem o banco a partir do zero.
"""

import os
from collections.abc import Iterator

import pytest
from alembic import command
from sqlalchemy import Engine, create_engine, delete
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.database.base import Base
from app.infrastructure.database.session import create_session_factory
from tests.helpers import alembic_config


@pytest.fixture(scope="session")
def engine(tmp_path_factory) -> Iterator[Engine]:
    url = os.environ.get("TEST_DATABASE_URL") or (
        f"sqlite:///{(tmp_path_factory.mktemp('db') / 'test.db').as_posix()}"
    )
    engine = create_engine(url)
    with engine.begin() as connection:
        command.upgrade(alembic_config(connection), "head")
    yield engine
    engine.dispose()


@pytest.fixture
def session_factory(engine) -> Iterator[sessionmaker[Session]]:
    """Fábrica de sessões; ao fim de cada teste, as tabelas são esvaziadas."""
    yield create_session_factory(engine)
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(delete(table))
