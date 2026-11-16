"""FLUJO 5 — casos del contrato de reportes que test_reports_api.py no llega a cubrir."""

import pytest

from helpers import codes
from store import errors

pytestmark = pytest.mark.flow_reports


def place_and_complete(client, admin_headers, items):
    body = {"customer_name": "Ana", "items": [{"code": c, "quantity": q} for c, q in items]}
    assert client.post("/orders", json=body).status_code == 201
    assert client.post("/admin/orders/next/complete", headers=admin_headers).status_code == 200


def adjust_stock(client, admin_headers, code, delta):
    body = {"delta": delta, "reason": "count"}
    assert client.post(f"/admin/products/{code}/stock-adjustment", json=body, headers=admin_headers).status_code == 200


def set_price(client, admin_headers, code, price):
    assert client.patch(f"/admin/products/{code}", json={"price": price}, headers=admin_headers).status_code == 200


def test_low_stock_includes_a_product_exactly_at_its_minimum(client, admin_headers):
    adjust_stock(client, admin_headers, 80, -3)  # stock 8 -> 5, min_stock 5
    assert codes(client.get("/admin/reports/low-stock", headers=admin_headers).json()) == [40, 30, 80]


def test_low_stock_ties_are_ordered_by_code(client, admin_headers):
    adjust_stock(client, admin_headers, 50, -17)  # queda en 3, igual que el 30, que se cargó después
    assert codes(client.get("/admin/reports/low-stock", headers=admin_headers).json()) == [40, 30, 50]


def test_best_sellers_keeps_sale_data_after_the_product_changes(client, admin_headers):
    place_and_complete(client, admin_headers, [(50, 2)])
    set_price(client, admin_headers, 50, 9999)
    client.delete("/admin/products/50", headers=admin_headers)
    ranking = client.get("/admin/reports/best-sellers", headers=admin_headers).json()
    assert ranking == [{"code": 50, "name": "Coca-Cola 1.5L", "units_sold": 2, "revenue": 5000.0}]


def test_best_sellers_ties_are_ordered_by_code(client, admin_headers):
    place_and_complete(client, admin_headers, [(60, 1)])  # el código mayor se vende primero
    place_and_complete(client, admin_headers, [(50, 1)])
    assert codes(client.get("/admin/reports/best-sellers", headers=admin_headers).json()) == [50, 60]


def test_best_sellers_rejects_low_limit_in_the_service(container):
    """El contrato del servicio exige este error aunque la API ya lo frene antes con Query(ge=1)."""
    with pytest.raises(errors.ValidationError):
        container.reports.best_sellers(limit=0)


def test_summary_amounts_are_rounded(client, admin_headers):
    set_price(client, admin_headers, 50, 0.1)
    set_price(client, admin_headers, 30, 0.2)
    place_and_complete(client, admin_headers, [(50, 1)])
    place_and_complete(client, admin_headers, [(30, 1)])
    summary = client.get("/admin/reports/summary", headers=admin_headers).json()
    assert summary["revenue"] == 0.3  # 0.1 + 0.2 da 0.30000000000000004 en punto flotante
    assert summary["average_ticket"] == 0.15


def test_average_ticket_is_rounded(client, admin_headers):
    for code in (80, 60, 70):  # 1100 + 1500 + 1200 = 3800 / 3 = 1266.666...
        place_and_complete(client, admin_headers, [(code, 1)])
    assert client.get("/admin/reports/summary", headers=admin_headers).json()["average_ticket"] == 1266.67


def test_best_sellers_revenue_is_rounded(client, admin_headers):
    set_price(client, admin_headers, 50, 0.1)
    place_and_complete(client, admin_headers, [(50, 1)])
    place_and_complete(client, admin_headers, [(50, 2)])
    ranking = client.get("/admin/reports/best-sellers", headers=admin_headers).json()
    assert ranking[0]["revenue"] == 0.3


def test_category_stock_value_is_rounded(client, admin_headers):
    set_price(client, admin_headers, 80, 0.1)
    adjust_stock(client, admin_headers, 80, -5)  # 3 unidades: 0.1 * 3 da 0.30000000000000004
    report = client.get("/admin/reports/categories", headers=admin_headers).json()
    cleaning = [entry for entry in report["categories"] if entry["path"] == "Cleaning"]
    assert cleaning == [{"path": "Cleaning", "product_count": 1, "stock_value": 0.3}]


def test_top_terms_are_limited_to_five(client, admin_headers):
    client.patch("/admin/settings", json={"search_history_size": 10}, headers=admin_headers)
    for term in ("a", "b", "c", "d", "e", "f"):
        client.get("/products/search", params={"name": term})
    report = client.get("/admin/reports/searches", headers=admin_headers).json()
    assert [entry["term"] for entry in report["top_terms"]] == ["a", "b", "c", "d", "e"]


def test_export_uses_current_settings_and_exact_layout(client, admin_headers):
    client.patch("/admin/settings", json={"store_name": "Kiosco", "currency": "usd"}, headers=admin_headers)
    text = client.get("/admin/export/catalog", headers=admin_headers).text
    lines = text.split("\n")
    assert lines[:3] == [
        "Kiosco — Catalog (7 products)",
        "",
        "80 | Ayudín Bleach 1L | Clorox | Cleaning | USD 1100.00 | stock 8",
    ]
    assert lines[-1] == "" and lines[-2] != ""  # exactamente un salto de línea al final
