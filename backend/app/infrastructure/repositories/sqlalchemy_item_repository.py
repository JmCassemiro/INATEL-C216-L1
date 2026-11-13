import builtins

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.errors import DuplicateItemNameError
from app.domain.item import Item
from app.infrastructure.models.item import ItemModel


class SqlAlchemyItemRepository:
    """Repositório no banco relacional que satisfaz a porta `ItemRepository`.

    O nome sem repetição vem da constraint única de `name`: o banco recusa o duplicado
    de forma atômica, sem um `SELECT` antes do `INSERT`.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, item: Item) -> None:
        self._session.add(ItemModel.from_entity(item))
        try:
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            if "name" in str(error.orig):
                raise DuplicateItemNameError() from error
            raise

    def list(self) -> builtins.list[Item]:
        # O id é UUID v7, que cresce com o tempo: ordenar por ele é a ordem de cadastro.
        models = self._session.scalars(select(ItemModel).order_by(ItemModel.id))
        return [model.to_entity() for model in models]
