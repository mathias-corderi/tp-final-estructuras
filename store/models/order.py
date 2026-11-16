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


def _is_int(value: Any) -> bool:
    """True si es un int de verdad (bool es subclase de int en Python, así que lo descartamos)."""
    return isinstance(value, int) and not isinstance(value, bool)


class OrderItem:
    """Una línea del pedido. `unit_price` queda fijo al momento de la compra (precio final, con descuento).

    code int; name str no vacío; quantity int > 0; unit_price número > 0 (se guarda como float).
    ValueError si algún dato es inválido.

    Es inmutable: todos los atributos son privados y solo tienen getter (@property),
    así una línea de un pedido ya hecho no se puede alterar desde afuera.
    """

    def __init__(self, code: int, name: str, quantity: int, unit_price: float) -> None:
        if not _is_int(code):
            raise ValueError("code must be an integer")
        if not isinstance(name, str) or not name.strip():
            raise ValueError("name must be a non-empty string")
        if not _is_int(quantity) or quantity <= 0:
            raise ValueError("quantity must be an integer greater than 0")
        if isinstance(unit_price, bool) or not isinstance(unit_price, (int, float)) or unit_price <= 0:
            raise ValueError("unit_price must be a number greater than 0")
        self._code = code
        self._name = name.strip()
        self._quantity = quantity
        self._unit_price = float(unit_price)

    @property
    def code(self) -> int:
        return self._code

    @property
    def name(self) -> str:
        return self._name

    @property
    def quantity(self) -> int:
        return self._quantity

    @property
    def unit_price(self) -> float:
        return self._unit_price

    @property
    def subtotal(self) -> float:
        """quantity * unit_price, redondeado a 2 decimales."""
        return round(self._quantity * self._unit_price, 2)

    def to_dict(self) -> dict[str, Any]:
        """Claves: code, name, quantity, unit_price, subtotal."""
        return {
            "code": self._code,
            "name": self._name,
            "quantity": self._quantity,
            "unit_price": self._unit_price,
            "subtotal": self.subtotal,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "OrderItem":
        """Ignora `subtotal` (se vuelve a calcular)."""
        return cls(data["code"], data["name"], data["quantity"], data["unit_price"])

    def __repr__(self) -> str:
        return f"OrderItem(code={self._code}, quantity={self._quantity}, unit_price={self._unit_price})"


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
        if not _is_int(order_id) or order_id <= 0:
            raise ValueError("order id must be an integer greater than 0")
        if not isinstance(customer_name, str) or not customer_name.strip():
            raise ValueError("customer_name must be a non-empty string")
        items = list(items)
        if not items:
            raise ValueError("an order needs at least one item")
        for item in items:
            if not isinstance(item, OrderItem):
                raise ValueError("items must be OrderItem objects")
        if created_at is None:
            created_at = datetime.now().isoformat(timespec="seconds")
        else:
            datetime.fromisoformat(created_at)  # ValueError si no es una fecha ISO válida

        self._id = order_id
        self._customer_name = customer_name.strip()
        self._items = items  # copia propia: list(items) de arriba
        self._created_at = created_at
        self.status = status  # pasa por el setter, que valida

    @property
    def id(self) -> int:
        return self._id

    @property
    def customer_name(self) -> str:
        return self._customer_name

    @property
    def items(self) -> list[OrderItem]:
        """Una copia de la lista de items (desde afuera no se debe poder alterar el pedido)."""
        return list(self._items)

    @property
    def status(self) -> OrderStatus:
        return self._status

    @status.setter
    def status(self, value: OrderStatus | str) -> None:
        # OrderStatus("shipped") ya lanza ValueError, que es lo que pide el contrato.
        self._status = OrderStatus(value)

    @property
    def created_at(self) -> str:
        return self._created_at

    @property
    def total(self) -> float:
        """Suma de los subtotales, redondeada a 2 decimales."""
        total = 0.0
        for item in self._items:
            total += item.subtotal
        return round(total, 2)

    def to_dict(self) -> dict[str, Any]:
        """Claves: id, customer_name, status (string), created_at, items (lista de dicts), total."""
        return {
            "id": self._id,
            "customer_name": self._customer_name,
            "status": self._status.value,
            "created_at": self._created_at,
            "items": [item.to_dict() for item in self._items],
            "total": self.total,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Order":
        return cls(
            order_id=data["id"],
            customer_name=data["customer_name"],
            items=[OrderItem.from_dict(item) for item in data["items"]],
            status=data.get("status", OrderStatus.PENDING),
            created_at=data.get("created_at"),
        )

    def __repr__(self) -> str:
        return f"Order(id={self._id}, customer={self._customer_name!r}, status={self._status.value}, total={self.total})"
