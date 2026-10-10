"""Registros para deshacer — FLUJO 2 (administración de productos).

Una Operation guarda lo necesario para revertir un cambio del catálogo. Ya está
implementada: CatalogService apila una después de cada cambio y la desapila en undo().

  kind     before                         after                     cómo se revierte
  ADD      None                           product.to_dict()         se elimina el producto
  DELETE   product.to_dict()              None                      se vuelve a insertar Product.from_dict(before)
  UPDATE   {campo: valor viejo, ...}      {campo: valor nuevo, ...} se vuelve a aplicar `before`
  STOCK    {"stock": viejo}               {"stock": nuevo}          se suma (viejo - nuevo) al stock ACTUAL
"""

from enum import Enum
from typing import Any


class OperationKind(str, Enum):
    ADD = "add"
    UPDATE = "update"
    DELETE = "delete"
    STOCK = "stock"


class Operation:
    def __init__(
        self,
        kind: OperationKind,
        code: int,
        before: dict[str, Any] | None,
        after: dict[str, Any] | None,
        description: str,
    ) -> None:
        self.kind = kind
        self.code = code
        self.before = before
        self.after = after
        self.description = description

    def to_dict(self) -> dict[str, Any]:
        return {"kind": self.kind.value, "code": self.code, "description": self.description}

    def __repr__(self) -> str:
        return f"Operation({self.kind.value}, code={self.code})"
