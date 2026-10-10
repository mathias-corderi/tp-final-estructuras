"""FLUJO 4 — cotización del carrito, pedidos y la cola FIFO de pedidos pendientes."""

import pytest

from helpers import codes

pytestmark = pytest.mark.flow_orders


def stock(client, code):
    return client.get(f"/products/{code}").json()["stock"]


def place(client, items, customer="Ana"):
    body = {"customer_name": customer, "items": [{"code": c, "quantity": q} for c, q in items]}
    return client.post("/orders", json=body)


# --- cotizar ---------------------------------------------------------------------
def test_quote_prices_available_lines_and_lists_the_rest(client):
    body = {"items": [{"code": 50, "quantity": 2}, {"code": 40, "quantity": 1}, {"code": 999, "quantity": 1}]}
    response = client.post("/cart/quote", json=body)
    assert response.status_code == 200
    assert response.json() == {
        "lines": [{"code": 50, "name": "Coca-Cola 1.5L", "quantity": 2, "unit_price": 2500.0, "subtotal": 5000.0}],
        "total": 5000.0,
        "unavailable": [
            {"code": 40, "requested": 1, "available": 0, "reason": "insufficient_stock"},
            {"code": 999, "requested": 1, "available": 0, "reason": "not_found"},
        ],
    }
    assert stock(client, 50) == 20  # no se reservó nada


def test_quote_merges_codes_and_applies_discounts(client):
    body = {"items": [{"code": 20, "quantity": 1}, {"code": 50, "quantity": 1}, {"code": 20, "quantity": 2}]}
    quote = client.post("/cart/quote", json=body).json()
    assert quote["lines"][0] == {"code": 20, "name": "Pepsi 1.5L", "quantity": 3, "unit_price": 1980.0, "subtotal": 5940.0}
    assert quote["total"] == 8440.0


def test_quote_inactive_product_is_not_found(client):
    quote = client.post("/cart/quote", json={"items": [{"code": 10, "quantity": 1}]}).json()
    assert quote["unavailable"] == [{"code": 10, "requested": 1, "available": 0, "reason": "not_found"}]
    assert quote["total"] == 0.0


@pytest.mark.parametrize("body", [{"items": []}, {"items": [{"code": 50, "quantity": 0}]}])
def test_quote_invalid_body(client, body):
    assert client.post("/cart/quote", json=body).status_code == 422


# --- hacer pedido ---------------------------------------------------------------
def test_place_order_reserves_stock(client):
    response = place(client, [(50, 2), (20, 1)])
    assert response.status_code == 201
    order = response.json()
    assert order["id"] == 1
    assert order["customer_name"] == "Ana"
    assert order["status"] == "pending"
    assert order["total"] == 6980.0
    assert order["created_at"]
    assert order["items"] == [
        {"code": 50, "name": "Coca-Cola 1.5L", "quantity": 2, "unit_price": 2500.0, "subtotal": 5000.0},
        {"code": 20, "name": "Pepsi 1.5L", "quantity": 1, "unit_price": 1980.0, "subtotal": 1980.0},
    ]
    assert (stock(client, 50), stock(client, 20)) == (18, 9)


def test_order_ids_are_sequential(client):
    assert [place(client, [(60, 1)]).json()["id"] for _ in range(3)] == [1, 2, 3]


def test_order_keeps_price_at_purchase_time(client, admin_headers):
    order_id = place(client, [(50, 1)]).json()["id"]
    client.patch("/admin/products/50", json={"price": 9999}, headers=admin_headers)
    assert client.get(f"/orders/{order_id}").json()["items"][0]["unit_price"] == 2500.0


def test_insufficient_stock_reserves_nothing(client):
    response = place(client, [(50, 2), (30, 4)])  # solo hay 3 Sprite
    assert response.status_code == 409
    assert (stock(client, 50), stock(client, 30)) == (20, 3)
    assert client.get("/orders/1").status_code == 404


def test_repeated_codes_are_merged_before_checking_stock(client):
    assert place(client, [(30, 2), (30, 2)]).status_code == 409
    assert place(client, [(30, 2), (30, 1)]).status_code == 201
    assert stock(client, 30) == 0


@pytest.mark.parametrize("code", [999, 10])  # inexistente e inactivo
def test_order_with_unavailable_product_returns_404(client, code):
    assert place(client, [(50, 1), (code, 1)]).status_code == 404
    assert stock(client, 50) == 20


@pytest.mark.parametrize(
    "body",
    [
        {"customer_name": "Ana", "items": []},
        {"customer_name": "Ana", "items": [{"code": 50, "quantity": 0}]},
        {"customer_name": "", "items": [{"code": 50, "quantity": 1}]},
        {"customer_name": "   ", "items": [{"code": 50, "quantity": 1}]},
        {"items": [{"code": 50, "quantity": 1}]},
    ],
)
def test_place_order_invalid_body(client, body):
    assert client.post("/orders", json=body).status_code == 422
    assert stock(client, 50) == 20


def test_track_order(client):
    place(client, [(60, 1)])
    response = client.get("/orders/1")
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    assert client.get("/orders/999").status_code == 404


# --- admin: listar, completar, cancelar ---------------------------------------------
def test_admin_list_orders_with_filter(client, admin_headers):
    place(client, [(60, 1)])
    place(client, [(70, 1)])
    client.post("/admin/orders/next/complete", headers=admin_headers)

    all_orders = client.get("/admin/orders", headers=admin_headers).json()
    assert [o["id"] for o in all_orders] == [1, 2]
    pending = client.get("/admin/orders", params={"status": "pending"}, headers=admin_headers).json()
    assert [o["id"] for o in pending] == [2]
    completed = client.get("/admin/orders", params={"status": "completed"}, headers=admin_headers).json()
    assert [o["id"] for o in completed] == [1]
    assert client.get("/admin/orders", params={"status": "shipped"}, headers=admin_headers).status_code == 422


def test_complete_next_is_fifo(client, admin_headers):
    place(client, [(60, 1)], customer="First")
    place(client, [(70, 1)], customer="Second")
    first = client.post("/admin/orders/next/complete", headers=admin_headers).json()
    assert (first["id"], first["customer_name"], first["status"]) == (1, "First", "completed")
    second = client.post("/admin/orders/next/complete", headers=admin_headers).json()
    assert second["id"] == 2
    assert client.post("/admin/orders/next/complete", headers=admin_headers).status_code == 409
    assert stock(client, 60) == 24  # completar no vuelve a tocar el stock


def test_cancel_returns_stock_and_leaves_the_queue(client, admin_headers):
    place(client, [(50, 2), (20, 1)])
    place(client, [(60, 1)])
    response = client.post("/admin/orders/1/cancel", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    assert (stock(client, 50), stock(client, 20)) == (20, 10)
    assert client.post("/admin/orders/next/complete", headers=admin_headers).json()["id"] == 2


def test_cancel_errors(client, admin_headers):
    place(client, [(60, 1)])
    place(client, [(60, 1)])
    client.post("/admin/orders/next/complete", headers=admin_headers)  # pedido 1 completado
    client.post("/admin/orders/2/cancel", headers=admin_headers)
    assert client.post("/admin/orders/1/cancel", headers=admin_headers).status_code == 409
    assert client.post("/admin/orders/2/cancel", headers=admin_headers).status_code == 409
    assert client.post("/admin/orders/999/cancel", headers=admin_headers).status_code == 404
    assert stock(client, 60) == 24


def test_cancel_with_deleted_product(client, admin_headers):
    place(client, [(60, 1), (70, 2)])
    client.delete("/admin/products/60", headers=admin_headers)
    assert client.post("/admin/orders/1/cancel", headers=admin_headers).status_code == 200
    assert stock(client, 70) == 15


def test_orders_do_not_appear_in_undo_history(client, admin_headers):
    place(client, [(60, 1)])
    assert client.get("/admin/undo/history", headers=admin_headers).json() == []
    assert codes(client.get("/products").json()) == [20, 30, 40, 50, 60, 70, 80]
