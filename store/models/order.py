"""Orders — FLOW 4 (cart and orders).

An Order is created `pending` when a customer buys (stock is reserved at that
moment); the owner later completes it or cancels it.
Tests: tests/unit/test_order_models.py
"""

from datetime import datetime
from enum import Enum
from typing import Any


class OrderStatus(str, Enum):
    """Already implemented. OrderStatus("pending") -> OrderStatus.PENDING; ValueError if invalid."""

    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderItem:
    """One line of an order. `unit_price` is frozen at purchase time (final price, with discount).

    code int; name non-empty str; quantity int > 0; unit_price number > 0 (stored as float).
    ValueError on bad data.
    """

    def __init__(self, code: int, name: str, quantity: int, unit_price: float) -> None:
        raise NotImplementedError("Flow 4: OrderItem.__init__")

    @property
    def code(self) -> int:
        raise NotImplementedError("Flow 4: OrderItem.code")

    @property
    def name(self) -> str:
        raise NotImplementedError("Flow 4: OrderItem.name")

    @property
    def quantity(self) -> int:
        raise NotImplementedError("Flow 4: OrderItem.quantity")

    @property
    def unit_price(self) -> float:
        raise NotImplementedError("Flow 4: OrderItem.unit_price")

    @property
    def subtotal(self) -> float:
        """quantity * unit_price, rounded to 2 decimals."""
        raise NotImplementedError("Flow 4: OrderItem.subtotal")

    def to_dict(self) -> dict[str, Any]:
        """Keys: code, name, quantity, unit_price, subtotal."""
        raise NotImplementedError("Flow 4: OrderItem.to_dict")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "OrderItem":
        """Ignores `subtotal` (it is recomputed)."""
        raise NotImplementedError("Flow 4: OrderItem.from_dict")


class Order:
    """A customer's purchase.

    order_id       int > 0, read-only (property `id`)
    customer_name  non-empty str, stored stripped
    items          non-empty list of OrderItem
    status         OrderStatus (the setter also accepts the plain string, e.g. "completed")
    created_at     ISO-8601 string; if None, use now: datetime.now().isoformat(timespec="seconds")
    ValueError on bad data.
    """

    def __init__(
        self,
        order_id: int,
        customer_name: str,
        items: list[OrderItem],
        status: OrderStatus | str = OrderStatus.PENDING,
        created_at: str | None = None,
    ) -> None:
        raise NotImplementedError("Flow 4: Order.__init__")

    @property
    def id(self) -> int:
        raise NotImplementedError("Flow 4: Order.id")

    @property
    def customer_name(self) -> str:
        raise NotImplementedError("Flow 4: Order.customer_name")

    @property
    def items(self) -> list[OrderItem]:
        """A copy of the items list (callers must not be able to alter the order)."""
        raise NotImplementedError("Flow 4: Order.items")

    @property
    def status(self) -> OrderStatus:
        raise NotImplementedError("Flow 4: Order.status")

    @status.setter
    def status(self, value: OrderStatus | str) -> None:
        raise NotImplementedError("Flow 4: Order.status setter")

    @property
    def created_at(self) -> str:
        raise NotImplementedError("Flow 4: Order.created_at")

    @property
    def total(self) -> float:
        """Sum of the item subtotals, rounded to 2 decimals."""
        raise NotImplementedError("Flow 4: Order.total")

    def to_dict(self) -> dict[str, Any]:
        """Keys: id, customer_name, status (plain string), created_at, items (list of dicts), total."""
        raise NotImplementedError("Flow 4: Order.to_dict")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Order":
        raise NotImplementedError("Flow 4: Order.from_dict")
