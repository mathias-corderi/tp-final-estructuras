"""FLUJO 1 — catálogo público: listado (inorden del BST), búsqueda por código (BST) y búsqueda (lista)."""

import pytest

from helpers import codes

pytestmark = pytest.mark.flow_catalog


def test_list_products_sorted_by_code_hides_inactive(client):
    response = client.get("/products")
    assert response.status_code == 200
    assert codes(response.json()) == [20, 30, 40, 50, 60, 70, 80]


def test_list_products_sorted_by_name(client):
    response = client.get("/products", params={"sort": "name"})
    assert codes(response.json()) == [80, 50, 40, 60, 20, 30, 70]


def test_list_products_invalid_sort(client):
    assert client.get("/products", params={"sort": "price"}).status_code == 422


def test_product_fields(client):
    pepsi = client.get("/products/20").json()
    assert pepsi == {
        "code": 20,
        "name": "Pepsi 1.5L",
        "brand": "PepsiCo",
        "price": 2200.0,
        "final_price": 1980.0,
        "stock": 10,
        "category": "Grocery/Drinks/Sodas",
        "min_stock": 5,
        "discount_percent": 10.0,
        "active": True,
    }


@pytest.mark.parametrize("code", [10, 999])  # el 10 está inactivo
def test_get_missing_or_inactive_product_returns_404(client, code):
    response = client.get(f"/products/{code}")
    assert response.status_code == 404
    assert "detail" in response.json()


def test_search_by_name(client):
    body = client.get("/products/search", params={"name": "cola"}).json()
    assert codes(body["results"]) == [50]
    assert body["comparisons"] == 8


def test_search_by_brand_is_case_insensitive(client):
    body = client.get("/products/search", params={"brand": "PEPSICO"}).json()
    assert codes(body["results"]) == [20, 40]
    assert body["comparisons"] == 8


def test_search_by_name_and_brand_requires_both(client):
    body = client.get("/products/search", params={"name": "1.5", "brand": "coca"}).json()
    assert codes(body["results"]) == [50, 30]
    assert body["comparisons"] == 16


def test_search_hides_inactive_but_counts_them(client):
    body = client.get("/products/search", params={"name": "juice"}).json()
    assert body == {"results": [], "comparisons": 8}


@pytest.mark.parametrize("params", [{}, {"name": "   "}, {"name": "", "brand": ""}])
def test_search_without_criteria_returns_422(client, params):
    assert client.get("/products/search", params=params).status_code == 422


@pytest.mark.parametrize(
    "code, found, list_comparisons, tree_comparisons",
    [
        (50, True, 1, 1),
        (80, True, 7, 3),
        (10, True, 8, 4),  # los inactivos siguen estando en las estructuras
        (999, False, 8, 3),
    ],
)
def test_compare_search(client, code, found, list_comparisons, tree_comparisons):
    body = client.get("/products/compare-search", params={"code": code}).json()
    assert body == {
        "code": code,
        "found": found,
        "list_comparisons": list_comparisons,
        "tree_comparisons": tree_comparisons,
    }
