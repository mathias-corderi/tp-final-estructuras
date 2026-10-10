from datetime import datetime

import pytest

from store.models.order import Order, OrderItem, OrderStatus

pytestmark = pytest.mark.flow_orders


def items():
    return [OrderItem(50, "Coca-Cola 1.5L", 2, 2500), OrderItem(20, "Pepsi 1.5L", 1, 1980)]


# --- OrderItem -----------------------------------------------------------------
def test_order_item_subtotal():
    line = OrderItem(50, "Coca-Cola 1.5L", 3, 2500)
    assert (line.code, line.name, line.quantity, line.unit_price) == (50, "Coca-Cola 1.5L", 3, 2500.0)
    assert line.subtotal == 7500.0
    assert OrderItem(1, "x", 3, 0.1).subtotal == 0.3


@pytest.mark.parametrize("quantity, price", [(0, 10), (-1, 10), (1, 0), (1.5, 10)])
def test_order_item_invalid_values(quantity, price):
    with pytest.raises(ValueError):
        OrderItem(1, "x", quantity, price)


def test_order_item_dict_round_trip():
    line = OrderItem(50, "Coca-Cola 1.5L", 2, 2500)
    data = line.to_dict()
    assert data == {"code": 50, "name": "Coca-Cola 1.5L", "quantity": 2, "unit_price": 2500.0, "subtotal": 5000.0}
    assert OrderItem.from_dict(data).to_dict() == data


# --- Order ---------------------------------------------------------------------
def test_new_order_defaults():
    order = Order(1, "  Ana  ", items())
    assert order.id == 1
    assert order.customer_name == "Ana"
    assert order.status is OrderStatus.PENDING
    assert order.total == 6980.0
    datetime.fromisoformat(order.created_at)  # tiene que ser una fecha ISO válida


def test_items_returns_a_copy():
    order = Order(1, "Ana", items())
    order.items.clear()
    assert len(order.items) == 2


def test_status_accepts_enum_or_string():
    order = Order(1, "Ana", items())
    order.status = "completed"
    assert order.status is OrderStatus.COMPLETED
    order.status = OrderStatus.CANCELLED
    assert order.status is OrderStatus.CANCELLED
    with pytest.raises(ValueError):
        order.status = "shipped"


@pytest.mark.parametrize(
    "kwargs",
    [
        dict(order_id=0, customer_name="Ana"),
        dict(order_id=1, customer_name="  "),
        dict(order_id=1, customer_name="Ana", items=[]),
        dict(order_id=1, customer_name="Ana", status="shipped"),
    ],
)
def test_invalid_orders(kwargs):
    kwargs.setdefault("items", items())
    with pytest.raises(ValueError):
        Order(**kwargs)


def test_order_dict_round_trip():
    order = Order(3, "Ana", items(), status="completed", created_at="2026-10-10T12:00:00")
    data = order.to_dict()
    assert data["id"] == 3
    assert data["customer_name"] == "Ana"
    assert data["status"] == "completed"
    assert data["created_at"] == "2026-10-10T12:00:00"
    assert data["total"] == 6980.0
    assert [line["code"] for line in data["items"]] == [50, 20]
    assert Order.from_dict(data).to_dict() == data
