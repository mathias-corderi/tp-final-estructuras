"""FLUJO 2 — administración de productos: ABM, stock y deshacer (pila).

Varios tests revisan las otras estructuras a través del container para comprobar
que CatalogService mantiene sincronizados la lista, los dos BST y el árbol de categorías.
"""

import pytest

from helpers import codes

pytestmark = pytest.mark.flow_products

NEW_PRODUCT = {
    "code": 90,
    "name": "Mr. Músculo Kitchen 500ml",
    "brand": "SC Johnson",
    "price": 1900,
    "stock": 12,
    "category": "Cleaning",
}


def category_codes(container, path):
    return [product.code for product in container.category_tree.items(path)]


# --- listado -------------------------------------------------------------------
def test_admin_list_includes_inactive(client, admin_headers):
    response = client.get("/admin/products", headers=admin_headers)
    assert response.status_code == 200
    assert codes(response.json()) == [10, 20, 30, 40, 50, 60, 70, 80]
    by_name = client.get("/admin/products", params={"sort": "name"}, headers=admin_headers).json()
    assert codes(by_name) == [80, 10, 50, 40, 60, 20, 30, 70]


# --- alta --------------------------------------------------------------------
def test_create_product(client, admin_headers, container):
    response = client.post("/admin/products", json=NEW_PRODUCT, headers=admin_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["code"] == 90
    assert body["final_price"] == 1900.0
    assert body["min_stock"] == 4  # default_min_stock de la tienda
    assert body["active"] is True

    assert client.get("/products/90").status_code == 200
    assert 90 in codes(client.get("/products", params={"sort": "name"}).json())
    found = client.get("/products/search", params={"name": "músculo"}).json()
    assert codes(found["results"]) == [90]
    assert category_codes(container, "Cleaning") == [80, 90]


def test_create_duplicate_code_returns_409(client, admin_headers):
    response = client.post("/admin/products", json={**NEW_PRODUCT, "code": 50}, headers=admin_headers)
    assert response.status_code == 409
    assert client.get("/products/50").json()["name"] == "Coca-Cola 1.5L"


def test_create_with_unknown_category_returns_404(client, admin_headers):
    response = client.post("/admin/products", json={**NEW_PRODUCT, "category": "Toys"}, headers=admin_headers)
    assert response.status_code == 404
    assert client.get("/products/90").status_code == 404


@pytest.mark.parametrize(
    "override",
    [{"price": -1}, {"discount_percent": 95}, {"name": ""}, {"stock": -2}, {"name": "   "}],
)
def test_create_with_invalid_data_returns_422(client, admin_headers, override):
    response = client.post("/admin/products", json={**NEW_PRODUCT, **override}, headers=admin_headers)
    assert response.status_code == 422
    assert client.get("/products/90").status_code == 404


# --- modificación --------------------------------------------------------------------
def test_update_name_resyncs_name_tree(client, admin_headers):
    response = client.patch("/admin/products/50", json={"name": "Zero Cola 1.5L"}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Zero Cola 1.5L"
    assert codes(client.get("/products", params={"sort": "name"}).json()) == [80, 40, 60, 20, 30, 70, 50]
    assert codes(client.get("/products/search", params={"name": "zero"}).json()["results"]) == [50]


def test_update_category_moves_product_in_tree(client, admin_headers, container):
    response = client.patch(
        "/admin/products/50", json={"category": "Grocery/Drinks/Water"}, headers=admin_headers
    )
    assert response.status_code == 200
    assert category_codes(container, "Grocery/Drinks/Sodas") == [30, 20]
    assert category_codes(container, "Grocery/Drinks/Water") == [70, 50]


def test_update_several_fields(client, admin_headers):
    body = client.patch(
        "/admin/products/60",
        json={"price": 1600, "discount_percent": 25, "min_stock": 10, "brand": "Mondelez AR"},
        headers=admin_headers,
    ).json()
    assert (body["price"], body["final_price"], body["min_stock"], body["brand"]) == (1600.0, 1200.0, 10, "Mondelez AR")


def test_deactivate_hides_from_customers(client, admin_headers):
    assert client.patch("/admin/products/50", json={"active": False}, headers=admin_headers).status_code == 200
    assert client.get("/products/50").status_code == 404
    admin_list = client.get("/admin/products", headers=admin_headers).json()
    assert next(p for p in admin_list if p["code"] == 50)["active"] is False


@pytest.mark.parametrize(
    "code, body, status",
    [
        (999, {"name": "x"}, 404),
        (50, {"category": "Toys"}, 404),
        (50, {"code": 51}, 422),
        (50, {"stock": 100}, 422),
        (50, {}, 422),
        (50, {"price": -1}, 422),
        (50, {"name": "  "}, 422),
    ],
)
def test_invalid_updates_change_nothing(client, admin_headers, code, body, status):
    before = client.get("/products/50").json()
    assert client.patch(f"/admin/products/{code}", json=body, headers=admin_headers).status_code == status
    assert client.get("/products/50").json() == before


# --- baja --------------------------------------------------------------------
def test_delete_product_everywhere(client, admin_headers, container):
    response = client.delete("/admin/products/50", headers=admin_headers)
    assert response.status_code == 204
    assert response.content == b""
    assert client.get("/products/50").status_code == 404
    assert 50 not in codes(client.get("/products", params={"sort": "name"}).json())
    assert client.get("/products/search", params={"name": "coca"}).json()["comparisons"] == 7
    assert category_codes(container, "Grocery/Drinks/Sodas") == [30, 20]
    assert client.delete("/admin/products/50", headers=admin_headers).status_code == 404


# --- stock ---------------------------------------------------------------------
def test_restock(client, admin_headers):
    response = client.post("/admin/products/30/restock", json={"quantity": 10}, headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["stock"] == 13


@pytest.mark.parametrize("code, body, status", [(30, {"quantity": 0}, 422), (999, {"quantity": 1}, 404)])
def test_restock_errors(client, admin_headers, code, body, status):
    assert client.post(f"/admin/products/{code}/restock", json=body, headers=admin_headers).status_code == status


def test_stock_adjustment(client, admin_headers):
    response = client.post(
        "/admin/products/30/stock-adjustment", json={"delta": -3, "reason": "broken"}, headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["stock"] == 0


@pytest.mark.parametrize(
    "body, status",
    [
        ({"delta": -4, "reason": "broken"}, 409),
        ({"delta": 0, "reason": "nothing"}, 422),
        ({"delta": -1, "reason": ""}, 422),
        ({"delta": -1, "reason": "   "}, 422),
        ({"delta": -1}, 422),
    ],
)
def test_stock_adjustment_errors_change_nothing(client, admin_headers, body, status):
    assert client.post("/admin/products/30/stock-adjustment", json=body, headers=admin_headers).status_code == status
    assert client.get("/products/30").json()["stock"] == 3


# --- deshacer ----------------------------------------------------------------------
def test_undo_with_empty_stack_returns_409(client, admin_headers):
    assert client.post("/admin/undo", headers=admin_headers).status_code == 409


def test_undo_add(client, admin_headers, container):
    client.post("/admin/products", json=NEW_PRODUCT, headers=admin_headers)
    response = client.post("/admin/undo", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["undone"]["kind"] == "add"
    assert response.json()["undone"]["code"] == 90
    assert client.get("/products/90").status_code == 404
    assert category_codes(container, "Cleaning") == [80]


def test_undo_delete_restores_everything(client, admin_headers, container):
    original = client.get("/products/50").json()
    client.delete("/admin/products/50", headers=admin_headers)
    assert client.post("/admin/undo", headers=admin_headers).json()["undone"]["kind"] == "delete"
    assert client.get("/products/50").json() == original
    assert codes(client.get("/products", params={"sort": "name"}).json()) == [80, 50, 40, 60, 20, 30, 70]
    assert sorted(category_codes(container, "Grocery/Drinks/Sodas")) == [20, 30, 50]


def test_undo_update_restores_old_values_and_keys(client, admin_headers, container):
    client.patch(
        "/admin/products/50",
        json={"name": "Zero Cola", "price": 9999, "category": "Cleaning"},
        headers=admin_headers,
    )
    assert client.post("/admin/undo", headers=admin_headers).json()["undone"]["kind"] == "update"
    product = client.get("/products/50").json()
    assert (product["name"], product["price"], product["category"]) == ("Coca-Cola 1.5L", 2500.0, "Grocery/Drinks/Sodas")
    assert codes(client.get("/products", params={"sort": "name"}).json()) == [80, 50, 40, 60, 20, 30, 70]
    assert category_codes(container, "Cleaning") == [80]


def test_undo_stock_operations(client, admin_headers):
    client.post("/admin/products/30/restock", json={"quantity": 10}, headers=admin_headers)
    client.post("/admin/products/30/stock-adjustment", json={"delta": -2, "reason": "broken"}, headers=admin_headers)
    assert client.get("/products/30").json()["stock"] == 11
    client.post("/admin/undo", headers=admin_headers)
    assert client.get("/products/30").json()["stock"] == 13
    client.post("/admin/undo", headers=admin_headers)
    assert client.get("/products/30").json()["stock"] == 3


def test_undo_is_lifo_and_history_is_most_recent_first(client, admin_headers):
    client.post("/admin/products/30/restock", json={"quantity": 5}, headers=admin_headers)
    client.patch("/admin/products/30", json={"price": 3000}, headers=admin_headers)
    client.post("/admin/products", json=NEW_PRODUCT, headers=admin_headers)

    history = client.get("/admin/undo/history", headers=admin_headers).json()
    assert [entry["kind"] for entry in history] == ["add", "update", "stock"]
    assert all(entry["description"] for entry in history)

    client.post("/admin/undo", headers=admin_headers)  # add
    client.post("/admin/undo", headers=admin_headers)  # update
    sprite = client.get("/products/30").json()
    assert (sprite["price"], sprite["stock"]) == (2300.0, 8)
    assert [entry["kind"] for entry in client.get("/admin/undo/history", headers=admin_headers).json()] == ["stock"]


def test_undo_does_not_push_new_operations(client, admin_headers):
    client.post("/admin/products/30/restock", json={"quantity": 5}, headers=admin_headers)
    client.post("/admin/undo", headers=admin_headers)
    assert client.get("/admin/undo/history", headers=admin_headers).json() == []
    assert client.post("/admin/undo", headers=admin_headers).status_code == 409
