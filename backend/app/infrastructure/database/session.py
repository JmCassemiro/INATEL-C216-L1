"""Conexão com o banco: URL vinda do ambiente, engine e fábrica de sessões."""

import os

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker


def database_url() -> str:
    """URL do banco, lida de `DATABASE_URL` (nunca escrita no código)."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "Defina a variável de ambiente DATABASE_URL, por exemplo "
            "postgresql+psycopg://usuario:senha@localhost:5432/banco"
        )
    return url


def create_database_engine() -> Engine:
    # pool_pre_ping: descarta conexões que o banco derrubou (ex.: reinício do Postgres).
    return create_engine(database_url(), pool_pre_ping=True)


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
