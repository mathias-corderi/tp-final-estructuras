"""Shared infrastructure: these pass from day one and must keep passing."""

import pytest

pytestmark = pytest.mark.shared

ADMIN_ENDPOINTS = [
    ("GET", "/admin/products"),
    ("POST", "/admin/products"),
    ("PATCH", "/admin/products/1"),
    ("DELETE", "/admin/products/1"),
    ("POST", "/admin/products/1/restock"),
    ("POST", "/admin/products/1/stock-adjustment"),
    ("POST", "/admin/undo"),
    ("GET", "/admin/undo/history"),
    ("POST", "/admin/categories"),
    ("PATCH", "/admin/categories"),
    ("DELETE", "/admin/categories"),
    ("POST", "/admin/categories/price-adjustment"),
    ("GET", "/admin/orders"),
    ("POST", "/admin/orders/next/complete"),
    ("POST", "/admin/orders/1/cancel"),
    ("GET", "/admin/reports/summary"),
    ("GET", "/admin/reports/best-sellers"),
    ("GET", "/admin/reports/low-stock"),
    ("GET", "/admin/reports/categories"),
    ("GET", "/admin/reports/searches"),
    ("GET", "/admin/export/catalog"),
    ("GET", "/admin/settings"),
    ("PATCH", "/admin/settings"),
]

PUBLIC_ENDPOINTS = [
    ("GET", "/products"),
    ("GET", "/products/search"),
    ("GET", "/products/compare-search"),
    ("GET", "/products/{code}"),
    ("GET", "/categories"),
    ("GET", "/categories/products"),
    ("POST", "/cart/quote"),
    ("POST", "/orders"),
    ("GET", "/orders/{order_id}"),
]


@pytest.mark.parametrize("method, path", ADMIN_ENDPOINTS)
def test_admin_endpoints_without_token_return_401(bare_client, method, path):
    response = bare_client.request(method, path)
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing X-Admin-Token header"


@pytest.mark.parametrize("method, path", ADMIN_ENDPOINTS)
def test_admin_endpoints_with_wrong_token_return_403(bare_client, method, path):
    response = bare_client.request(method, path, headers={"X-Admin-Token": "wrong"})
    assert response.status_code == 403


def test_every_endpoint_is_declared(app):
    declared = {
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        for method in operations
    }
    templates = {
        "/admin/products/1": "/admin/products/{code}",
        "/admin/products/1/restock": "/admin/products/{code}/restock",
        "/admin/products/1/stock-adjustment": "/admin/products/{code}/stock-adjustment",
        "/admin/orders/1/cancel": "/admin/orders/{order_id}/cancel",
    }
    expected = set(PUBLIC_ENDPOINTS) | {(method, templates.get(path, path)) for method, path in ADMIN_ENDPOINTS}
    assert declared == expected
