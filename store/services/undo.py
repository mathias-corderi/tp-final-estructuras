"""Undo records — FLOW 2 (product administration).

An Operation stores enough information to revert one catalog change. It is
already implemented: CatalogService pushes one onto its Stack after every
change and pops it in undo().

  kind     before                         after                     how to revert
  ADD      None                           product.to_dict()         remove the product
  DELETE   product.to_dict()              None                      re-insert Product.from_dict(before)
  UPDATE   {field: old value, ...}        {field: new value, ...}   apply `before` again
  STOCK    {"stock": old}                 {"stock": new}            add (old - new) to the CURRENT stock
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
