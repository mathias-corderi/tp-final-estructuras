"""FLUJO 5 — configuración de la tienda."""

import pytest

pytestmark = pytest.mark.flow_reports


def test_get_settings(client, admin_headers):
    response = client.get("/admin/settings", headers=admin_headers)
    assert response.status_code == 200
    assert response.json() == {
        "store_name": "Test Store",
        "currency": "ARS",
        "default_min_stock": 4,
        "search_history_size": 5,
    }


def test_update_settings(client, admin_headers):
    response = client.patch(
        "/admin/settings", json={"store_name": "Kiosco Don Pepe", "currency": "usd"}, headers=admin_headers
    )
    assert response.status_code == 200
    assert (response.json()["store_name"], response.json()["currency"]) == ("Kiosco Don Pepe", "USD")
    assert client.get("/admin/settings", headers=admin_headers).json()["store_name"] == "Kiosco Don Pepe"


def test_default_min_stock_applies_to_new_products(client, admin_headers):
    client.patch("/admin/settings", json={"default_min_stock": 12}, headers=admin_headers)
    product = {"code": 91, "name": "Ball", "brand": "Generic", "price": 500, "stock": 1, "category": "Electronics"}
    assert client.post("/admin/products", json=product, headers=admin_headers).json()["min_stock"] == 12


def test_resizing_search_history(client, admin_headers):
    for term in ("a", "b", "c"):
        client.get("/products/search", params={"name": term})
    client.patch("/admin/settings", json={"search_history_size": 2}, headers=admin_headers)
    assert client.get("/admin/reports/searches", headers=admin_headers).json()["recent"] == ["c", "b"]


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"search_history_size": 0},
        {"currency": "US"},
        {"currency": "U$D"},
        {"store_name": ""},
        {"color": "red"},
        {"store_name": "Ok", "default_min_stock": -1},
    ],
)
def test_invalid_updates_change_nothing(client, admin_headers, body):
    assert client.patch("/admin/settings", json=body, headers=admin_headers).status_code == 422
    assert client.get("/admin/settings", headers=admin_headers).json()["store_name"] == "Test Store"
