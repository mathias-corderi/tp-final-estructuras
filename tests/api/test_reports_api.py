"""FLOW 5 — owner reports, search history and export."""

import re

import pytest

from helpers import codes

pytestmark = pytest.mark.flow_reports


def place(client, items):
    body = {"customer_name": "Ana", "items": [{"code": c, "quantity": q} for c, q in items]}
    assert client.post("/orders", json=body).status_code == 201


def test_summary_without_orders(client, admin_headers):
    response = client.get("/admin/reports/summary", headers=admin_headers)
    assert response.status_code == 200
    assert response.json() == {
        "revenue": 0.0,
        "orders": {"pending": 0, "completed": 0, "cancelled": 0},
        "average_ticket": 0.0,
        "inventory_value": 147700.0,  # price * stock of all 8 products, inactive included
        "product_count": 8,
    }


def test_summary_with_orders(client, admin_headers):
    place(client, [(50, 2), (20, 1)])  # 6980
    place(client, [(60, 1)])  # 1500
    place(client, [(70, 1)])  # 1200
    client.post("/admin/orders/next/complete", headers=admin_headers)
    client.post("/admin/orders/3/cancel", headers=admin_headers)
    summary = client.get("/admin/reports/summary", headers=admin_headers).json()
    assert summary["revenue"] == 6980.0
    assert summary["orders"] == {"pending": 1, "completed": 1, "cancelled": 1}
    assert summary["average_ticket"] == 6980.0
    assert summary["inventory_value"] == 139000.0  # 147700 - 5000 - 2200 - 1500 (cancelled stock came back)


def test_best_sellers_counts_completed_orders_only(client, admin_headers):
    place(client, [(50, 2), (20, 1)])
    place(client, [(50, 1), (60, 3)])
    place(client, [(70, 5)])  # stays pending
    client.post("/admin/orders/next/complete", headers=admin_headers)
    client.post("/admin/orders/next/complete", headers=admin_headers)

    ranking = client.get("/admin/reports/best-sellers", headers=admin_headers).json()
    assert ranking == [
        {"code": 50, "name": "Coca-Cola 1.5L", "units_sold": 3, "revenue": 7500.0},
        {"code": 60, "name": "Oreo 118g", "units_sold": 3, "revenue": 4500.0},
        {"code": 20, "name": "Pepsi 1.5L", "units_sold": 1, "revenue": 1980.0},
    ]
    top_two = client.get("/admin/reports/best-sellers", params={"limit": 2}, headers=admin_headers).json()
    assert codes(top_two) == [50, 60]
    assert client.get("/admin/reports/best-sellers", params={"limit": 0}, headers=admin_headers).status_code == 422


def test_low_stock(client, admin_headers):
    assert codes(client.get("/admin/reports/low-stock", headers=admin_headers).json()) == [40, 30]
    client.post("/admin/products/40/restock", json={"quantity": 50}, headers=admin_headers)
    assert codes(client.get("/admin/reports/low-stock", headers=admin_headers).json()) == [30]


def test_categories_report(client, admin_headers):
    report = client.get("/admin/reports/categories", headers=admin_headers).json()
    assert report["tree_depth"] == 3
    assert report["bst_height_by_code"] == 4
    assert report["bst_height_by_name"] == 5
    assert report["categories"] == [
        {"path": "Grocery", "product_count": 7, "stock_value": 138900.0},
        {"path": "Grocery/Drinks", "product_count": 5, "stock_value": 101400.0},
        {"path": "Grocery/Drinks/Sodas", "product_count": 3, "stock_value": 78900.0},
        {"path": "Grocery/Drinks/Water", "product_count": 1, "stock_value": 18000.0},
        {"path": "Grocery/Snacks", "product_count": 2, "stock_value": 37500.0},
        {"path": "Cleaning", "product_count": 1, "stock_value": 8800.0},
        {"path": "Electronics", "product_count": 0, "stock_value": 0.0},
    ]


def test_searches_report(client, admin_headers):
    client.get("/products/search", params={"name": "Cola"})
    client.get("/products/search", params={"brand": "PepsiCo"})
    client.get("/products/search", params={"name": "cola", "brand": "coca-cola"})
    report = client.get("/admin/reports/searches", headers=admin_headers).json()
    assert report["recent"] == ["coca-cola", "cola", "pepsico", "cola"]
    assert report["top_terms"] == [
        {"term": "cola", "count": 2},
        {"term": "coca-cola", "count": 1},
        {"term": "pepsico", "count": 1},
    ]


def test_search_history_keeps_last_n(client, admin_headers):
    for term in ("a", "b", "c", "d", "e", "f"):
        client.get("/products/search", params={"name": term})
    assert client.get("/admin/reports/searches", headers=admin_headers).json()["recent"] == ["f", "e", "d", "c", "b"]


def test_export_catalog(client, admin_headers):
    response = client.get("/admin/export/catalog", headers=admin_headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    lines = response.text.splitlines()
    assert lines[0] == "Test Store — Catalog (7 products)"
    product_lines = [line for line in lines if re.match(r"^\d+ \|", line)]
    assert [int(line.split(" | ")[0]) for line in product_lines] == [80, 50, 40, 60, 20, 30, 70]
    assert "20 | Pepsi 1.5L | PepsiCo | Grocery/Drinks/Sodas | ARS 1980.00 | stock 10" in lines
