"""Pedidos — FLUJO 4 (carrito y pedidos).

Un Order se crea `pending` cuando un cliente compra (en ese momento se reserva
el stock); después el dueño lo completa o lo cancela.
Tests: tests/unit/test_order_models.py
"""

from datetime import datetime
from enum import Enum
from typing import Any


class OrderStatus(str, Enum):
    """Ya implementado. OrderStatus("pending") -> OrderStatus.PENDING; ValueError si es inválido."""

    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderItem:
    """Una línea del pedido. `unit_price` queda fijo al momento de la compra (precio final, con descuento).

    code int; name str no vacío; quantity int > 0; unit_price número > 0 (se guarda como float).
    ValueError si algún dato es inválido.
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
        """quantity * unit_price, redondeado a 2 decimales."""
        raise NotImplementedError("Flow 4: OrderItem.subtotal")

    def to_dict(self) -> dict[str, Any]:
        """Claves: code, name, quantity, unit_price, subtotal."""
        raise NotImplementedError("Flow 4: OrderItem.to_dict")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "OrderItem":
        """Ignora `subtotal` (se vuelve a calcular)."""
        raise NotImplementedError("Flow 4: OrderItem.from_dict")


class Order:
    """La compra de un cliente.

    order_id       int > 0, solo lectura (propiedad `id`)
    customer_name  str no vacío, sin espacios en los extremos
    items          lista no vacía de OrderItem
    status         OrderStatus (el setter también acepta el string, por ejemplo "completed")
    created_at     string ISO-8601; si es None, usar ahora: datetime.now().isoformat(timespec="seconds")
    ValueError si algún dato es inválido.
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
        """Una copia de la lista de items (desde afuera no se debe poder alterar el pedido)."""
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
        """Suma de los subtotales, redondeada a 2 decimales."""
        raise NotImplementedError("Flow 4: Order.total")

    def to_dict(self) -> dict[str, Any]:
        """Claves: id, customer_name, status (string), created_at, items (lista de dicts), total."""
        raise NotImplementedError("Flow 4: Order.to_dict")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Order":
        raise NotImplementedError("Flow 4: Order.from_dict")
