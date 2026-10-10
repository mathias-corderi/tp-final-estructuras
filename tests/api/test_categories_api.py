"""FLUJO 3 — categorías (árbol n-ario): explorar, crear, renombrar, borrar, precios por rama."""

import pytest

from helpers import codes

pytestmark = pytest.mark.flow_categories


def child(node, name):
    return next(c for c in node["children"] if c["name"] == name)


# --- público --------------------------------------------------------------------
def test_category_tree_counts_active_products(client):
    response = client.get("/categories")
    assert response.status_code == 200
    root = response.json()
    assert (root["name"], root["path"], root["product_count"]) == ("Store", "", 7)
    assert [c["name"] for c in root["children"]] == ["Grocery", "Cleaning", "Electronics"]
    grocery = child(root, "Grocery")
    assert grocery["product_count"] == 6
    drinks = child(grocery, "Drinks")
    assert (drinks["path"], drinks["product_count"]) == ("Grocery/Drinks", 4)
    assert child(drinks, "Sodas")["product_count"] == 3
    assert child(root, "Electronics") == {"name": "Electronics", "path": "Electronics", "product_count": 0, "children": []}


def test_products_in_category_preorder(client):
    response = client.get("/categories/products", params={"path": "Grocery/Drinks"})
    assert response.status_code == 200
    assert codes(response.json()) == [50, 30, 20, 70]


def test_products_in_category_without_subcategories(client):
    params = {"path": "Grocery/Drinks", "include_subcategories": False}
    assert client.get("/categories/products", params=params).json() == []  # ahí solo está el jugo inactivo
    assert codes(client.get("/categories/products", params={"path": "Cleaning"}).json()) == [80]


def test_products_in_missing_category_returns_404(client):
    assert client.get("/categories/products", params={"path": "Grocery/Nope"}).status_code == 404


# --- crear --------------------------------------------------------------------
def test_create_category_with_missing_parents(client, admin_headers):
    response = client.post("/admin/categories", json={"path": "Electronics/Phones/Android"}, headers=admin_headers)
    assert response.status_code == 201
    assert response.json() == {
        "name": "Android",
        "path": "Electronics/Phones/Android",
        "product_count": 0,
        "children": [],
    }
    phones = child(child(client.get("/categories").json(), "Electronics"), "Phones")
    assert [c["name"] for c in phones["children"]] == ["Android"]


def test_create_top_level_category_and_use_it(client, admin_headers):
    assert client.post("/admin/categories", json={"path": "Toys"}, headers=admin_headers).status_code == 201
    product = {"code": 91, "name": "Ball", "brand": "Generic", "price": 500, "stock": 1, "category": "Toys"}
    assert client.post("/admin/products", json=product, headers=admin_headers).status_code == 201
    assert codes(client.get("/categories/products", params={"path": "Toys"}).json()) == [91]


@pytest.mark.parametrize("path, status", [("Grocery/Drinks", 409), ("Cleaning", 409), ("A//B", 422), ("   ", 422)])
def test_create_category_errors(client, admin_headers, path, status):
    assert client.post("/admin/categories", json={"path": path}, headers=admin_headers).status_code == status


# --- renombrar --------------------------------------------------------------------
def test_rename_updates_products(client, admin_headers):
    response = client.patch(
        "/admin/categories", json={"path": "Grocery/Snacks", "new_name": "Treats"}, headers=admin_headers
    )
    assert response.status_code == 200
    assert (response.json()["name"], response.json()["path"]) == ("Treats", "Grocery/Treats")
    assert client.get("/products/40").json()["category"] == "Grocery/Treats"
    assert client.get("/categories/products", params={"path": "Grocery/Snacks"}).status_code == 404
    assert codes(client.get("/categories/products", params={"path": "Grocery/Treats"}).json()) == [40, 60]


def test_rename_top_level_updates_nested_products(client, admin_headers):
    client.patch("/admin/categories", json={"path": "Grocery", "new_name": "Food"}, headers=admin_headers)
    assert client.get("/products/50").json()["category"] == "Food/Drinks/Sodas"
    assert client.get("/products/60").json()["category"] == "Food/Snacks"


@pytest.mark.parametrize(
    "body, status",
    [
        ({"path": "Grocery/Snacks", "new_name": "Drinks"}, 409),
        ({"path": "Grocery/Nope", "new_name": "X"}, 404),
        ({"path": "", "new_name": "X"}, 422),
        ({"path": "Grocery", "new_name": "A/B"}, 422),
        ({"path": "Grocery", "new_name": "   "}, 422),
    ],
)
def test_rename_errors(client, admin_headers, body, status):
    assert client.patch("/admin/categories", json=body, headers=admin_headers).status_code == status
    assert client.get("/products/40").json()["category"] == "Grocery/Snacks"


# --- borrar --------------------------------------------------------------------
def test_delete_empty_category(client, admin_headers):
    response = client.delete("/admin/categories", params={"path": "Electronics"}, headers=admin_headers)
    assert response.status_code == 204
    assert [c["name"] for c in client.get("/categories").json()["children"]] == ["Grocery", "Cleaning"]


@pytest.mark.parametrize(
    "path, status",
    [
        ("Cleaning", 409),  # tiene productos
        ("Grocery/Drinks", 409),  # tiene subcategorías (y un producto inactivo)
        ("Grocery/Nope", 404),
        ("", 422),
    ],
)
def test_delete_category_errors(client, admin_headers, path, status):
    assert client.delete("/admin/categories", params={"path": path}, headers=admin_headers).status_code == status


# --- ajuste de precios por rama -----------------------------------------------------
def test_price_adjustment_on_subtree(client, admin_headers):
    response = client.post(
        "/admin/categories/price-adjustment", json={"path": "Grocery/Drinks", "percent": 10}, headers=admin_headers
    )
    assert response.status_code == 200
    assert codes(response.json()["updated"]) == [10, 50, 30, 20, 70]
    assert client.get("/products/50").json()["price"] == 2750.0
    pepsi = client.get("/products/20").json()
    assert (pepsi["price"], pepsi["final_price"]) == (2420.0, 2178.0)
    assert client.get("/products/60").json()["price"] == 1500.0  # fuera del subárbol


def test_price_decrease(client, admin_headers):
    client.post("/admin/categories/price-adjustment", json={"path": "Cleaning", "percent": -10}, headers=admin_headers)
    assert client.get("/products/80").json()["price"] == 990.0


@pytest.mark.parametrize(
    "body, status",
    [
        ({"path": "Cleaning", "percent": 0}, 422),
        ({"path": "Cleaning", "percent": -95}, 422),
        ({"path": "Cleaning", "percent": 600}, 422),
        ({"path": "Nope", "percent": 10}, 404),
    ],
)
def test_price_adjustment_errors(client, admin_headers, body, status):
    assert client.post("/admin/categories/price-adjustment", json=body, headers=admin_headers).status_code == status
    assert client.get("/products/80").json()["price"] == 1100.0
