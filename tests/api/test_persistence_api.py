"""FLUJO 5 — todo sobrevive a un reinicio (persistencia en JSON).

Un "reinicio" es un Container nuevo leyendo el mismo archivo. Estos tests tocan
todos los flujos, así que recién pasan cuando todos guardan bien.
"""

import json

import pytest

from store.container import Container

pytestmark = [pytest.mark.flow_reports, pytest.mark.integration]


def restart(data_file):
    return Container(data_file).load()


def test_new_product_is_saved_to_disk(client, admin_headers, data_file):
    product = {"code": 91, "name": "Ball", "brand": "Generic", "price": 500, "stock": 1, "category": "Electronics"}
    client.post("/admin/products", json=product, headers=admin_headers)
    on_disk = json.loads(data_file.read_text(encoding="utf-8"))
    assert 91 in [p["code"] for p in on_disk["products"]]
    assert restart(data_file).catalog.get(91).name == "Ball"


def test_pending_orders_queue_survives_restart(client, admin_headers, data_file):
    for code in (60, 70):
        client.post("/orders", json={"customer_name": "Ana", "items": [{"code": code, "quantity": 1}]})
    reloaded = restart(data_file)
    assert reloaded.catalog.get(60).stock == 24
    assert reloaded.orders.complete_next().id == 1
    assert reloaded.orders.complete_next().id == 2
    new_order = reloaded.orders.place_order("Bea", [(80, 1)])
    assert new_order.id == 3


def test_categories_settings_and_deletes_survive_restart(client, admin_headers, data_file):
    client.post("/admin/categories", json={"path": "Electronics/Phones"}, headers=admin_headers)
    client.patch("/admin/categories", json={"path": "Grocery/Snacks", "new_name": "Treats"}, headers=admin_headers)
    client.patch("/admin/settings", json={"store_name": "Kiosco"}, headers=admin_headers)
    client.delete("/admin/products/80", headers=admin_headers)

    reloaded = restart(data_file)
    assert "Electronics/Phones" in reloaded.categories.paths()
    assert reloaded.catalog.get(40).category == "Grocery/Treats"
    assert reloaded.settings.store_name == "Kiosco"
    assert 80 not in [p.code for p in reloaded.catalog.all_products()]


def test_search_history_is_saved_with_the_next_change(client, admin_headers, data_file):
    client.get("/products/search", params={"name": "cola"})
    client.post("/admin/products/30/restock", json={"quantity": 1}, headers=admin_headers)
    assert restart(data_file).search_history.recent() == ["cola"]
