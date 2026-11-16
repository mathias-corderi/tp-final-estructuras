"""Casos que cruzan flujos: deshacer (Flujo 2) con categorías (Flujo 3) y pedidos (Flujo 4),
y la API atendiendo pedidos en paralelo. Los tests de cada flujo no los cubren por separado.
"""

import threading
import time

import pytest

pytestmark = pytest.mark.integration


def undo(client, admin_headers):
    return client.post("/admin/undo", headers=admin_headers)


# --- deshacer después de cambiar categorías ----------------------------------------
def test_undo_update_after_renaming_its_old_category(client, admin_headers, container):
    client.patch("/admin/products/50", json={"category": "Grocery/Drinks/Water"}, headers=admin_headers)
    client.patch("/admin/categories", json={"path": "Grocery", "new_name": "Food"}, headers=admin_headers)

    response = undo(client, admin_headers)

    assert response.status_code == 200
    assert container.catalog.get(50).category == "Food/Drinks/Sodas"
    assert container.category_tree.exists("Food/Drinks/Sodas")
    assert not container.category_tree.exists("Grocery")


def test_undo_delete_after_renaming_its_category(client, admin_headers, container):
    client.delete("/admin/products/80", headers=admin_headers)
    client.patch("/admin/categories", json={"path": "Cleaning", "new_name": "Home"}, headers=admin_headers)

    assert undo(client, admin_headers).status_code == 200
    assert container.catalog.get(80).category == "Home"
    assert [p.code for p in container.categories.products("Home")] == [80]


def test_undo_delete_after_deleting_its_category_recreates_it(client, admin_headers, container):
    client.delete("/admin/products/80", headers=admin_headers)
    client.delete("/admin/categories", params={"path": "Cleaning"}, headers=admin_headers)

    assert undo(client, admin_headers).status_code == 200
    assert container.category_tree.exists("Cleaning")
    assert container.catalog.get(80).category == "Cleaning"


def test_undo_is_not_blocked_after_deleting_a_category(client, admin_headers, container):
    """Antes, la operación que fallaba quedaba en la pila y bloqueaba todo lo de abajo."""
    client.post("/admin/products/70/restock", json={"quantity": 5}, headers=admin_headers)
    client.delete("/admin/products/80", headers=admin_headers)
    client.delete("/admin/categories", params={"path": "Cleaning"}, headers=admin_headers)

    assert undo(client, admin_headers).status_code == 200
    assert undo(client, admin_headers).status_code == 200
    assert container.catalog.get(70).stock == 15


# --- deshacer con pedidos y ajustes de precios ----------------------------------------
def test_cancelling_an_order_of_a_deleted_product_keeps_its_stock_for_undo(client, admin_headers, container):
    order = client.post("/orders", json={"customer_name": "Ana", "items": [{"code": 60, "quantity": 10}]}).json()
    client.delete("/admin/products/60", headers=admin_headers)
    client.post(f"/admin/orders/{order['id']}/cancel", headers=admin_headers)

    assert undo(client, admin_headers).status_code == 200
    assert container.catalog.get(60).stock == 25


def test_undo_update_does_not_overwrite_a_later_price_adjustment(client, admin_headers, container):
    client.patch("/admin/products/50", json={"price": 3000, "name": "Coca-Cola 2L"}, headers=admin_headers)
    client.post(
        "/admin/categories/price-adjustment",
        json={"path": "Grocery/Drinks/Sodas", "percent": 10},
        headers=admin_headers,
    )

    assert undo(client, admin_headers).status_code == 200
    product = container.catalog.get(50)
    assert product.name == "Coca-Cola 1.5L"  # el nombre no se tocó después: se revierte
    assert product.price == 3300  # el precio lo cambió el ajuste masivo: se respeta


# --- categorías con espacios --------------------------------------------------------
def test_product_category_is_stored_in_canonical_form(client, admin_headers, container):
    response = client.patch(
        "/admin/products/50", json={"category": " Grocery /  Drinks "}, headers=admin_headers
    )

    assert response.status_code == 200
    assert response.json()["category"] == "Grocery/Drinks"
    assert container.catalog.get(50).category == "Grocery/Drinks"


# --- API en paralelo y token ----------------------------------------------------------
def test_parallel_orders_get_unique_ids(client, monkeypatch):
    """La API atiende cada request en un hilo. Sin un lock, dos pedidos podían leer el mismo
    próximo id. El Order lento agranda esa ventana para que el choque aparezca siempre."""
    from store.services import order_service

    class SlowOrder(order_service.Order):
        def __init__(self, *args, **kwargs):
            time.sleep(0.002)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(order_service, "Order", SlowOrder)
    ids: list[int] = []
    errors: list[object] = []

    def place_orders() -> None:
        for _ in range(15):
            response = client.post("/orders", json={"customer_name": "Ana", "items": [{"code": 60, "quantity": 1}]})
            if response.status_code == 201:
                ids.append(response.json()["id"])
            else:
                errors.append(response.status_code)

    threads = [threading.Thread(target=place_orders) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert len(ids) == len(set(ids)) == 25  # 25 unidades de Oreo: el resto se rechaza por stock
    assert errors.count(409) == 8 * 15 - 25


def test_non_ascii_admin_token_is_rejected_with_403(client):
    # Los navegadores mandan el header en UTF-8; el servidor lo recibe como texto no ASCII.
    response = client.get("/admin/settings", headers={"X-Admin-Token": "contraseña".encode()})

    assert response.status_code == 403
