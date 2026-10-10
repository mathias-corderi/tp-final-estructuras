"""Shared fixtures. Every API test runs against a small, known store (FIXTURE_DATA)
copied to a temporary file, never against data/store.json.

The fixture catalog (codes in insertion order: 50, 30, 70, 20, 40, 60, 80, 10):

  code  name                    brand      price  stock  category               notes
  50    Coca-Cola 1.5L          Coca-Cola  2500   20     Grocery/Drinks/Sodas
  30    Sprite 1.5L             Coca-Cola  2300   3      Grocery/Drinks/Sodas   low stock
  70    Villavicencio 2L        Danone     1200   15     Grocery/Drinks/Water
  20    Pepsi 1.5L              PepsiCo    2200   10     Grocery/Drinks/Sodas   10 % off -> 1980
  40    Lay's Classic 150g      PepsiCo    1800   0      Grocery/Snacks         low stock
  60    Oreo 118g               Mondelez   1500   25     Grocery/Snacks
  80    Ayudín Bleach 1L        Clorox     1100   8      Cleaning
  10    Cepita Orange Juice 1L  Cepita     900    5      Grocery/Drinks         INACTIVE

BST by code (insertion order above) has height 4:
            50
         /      \\
       30        70
      /  \\      /  \\
    20    40  60    80
   /
 10
"""

import copy
import json

import pytest
from fastapi.testclient import TestClient

from store.api.app import create_app
from store.api.deps import get_container

ADMIN_TOKEN = "test-admin-token"

FIXTURE_DATA = {
    "settings": {
        "store_name": "Test Store",
        "currency": "ARS",
        "default_min_stock": 4,
        "search_history_size": 5,
    },
    "categories": [
        "Grocery",
        "Grocery/Drinks",
        "Grocery/Drinks/Sodas",
        "Grocery/Drinks/Water",
        "Grocery/Snacks",
        "Cleaning",
        "Electronics",
    ],
    "products": [
        {"code": 50, "name": "Coca-Cola 1.5L", "brand": "Coca-Cola", "price": 2500, "stock": 20,
         "category": "Grocery/Drinks/Sodas", "min_stock": 5, "discount_percent": 0, "active": True},
        {"code": 30, "name": "Sprite 1.5L", "brand": "Coca-Cola", "price": 2300, "stock": 3,
         "category": "Grocery/Drinks/Sodas", "min_stock": 5, "discount_percent": 0, "active": True},
        {"code": 70, "name": "Villavicencio 2L", "brand": "Danone", "price": 1200, "stock": 15,
         "category": "Grocery/Drinks/Water", "min_stock": 5, "discount_percent": 0, "active": True},
        {"code": 20, "name": "Pepsi 1.5L", "brand": "PepsiCo", "price": 2200, "stock": 10,
         "category": "Grocery/Drinks/Sodas", "min_stock": 5, "discount_percent": 10, "active": True},
        {"code": 40, "name": "Lay's Classic 150g", "brand": "PepsiCo", "price": 1800, "stock": 0,
         "category": "Grocery/Snacks", "min_stock": 5, "discount_percent": 0, "active": True},
        {"code": 60, "name": "Oreo 118g", "brand": "Mondelez", "price": 1500, "stock": 25,
         "category": "Grocery/Snacks", "min_stock": 5, "discount_percent": 0, "active": True},
        {"code": 80, "name": "Ayudín Bleach 1L", "brand": "Clorox", "price": 1100, "stock": 8,
         "category": "Cleaning", "min_stock": 5, "discount_percent": 0, "active": True},
        {"code": 10, "name": "Cepita Orange Juice 1L", "brand": "Cepita", "price": 900, "stock": 5,
         "category": "Grocery/Drinks", "min_stock": 5, "discount_percent": 0, "active": False},
    ],
    "orders": [],
    "search_history": [],
}


@pytest.fixture(autouse=True)
def admin_token_env(monkeypatch):
    monkeypatch.setenv("STORE_ADMIN_TOKEN", ADMIN_TOKEN)


@pytest.fixture
def admin_headers():
    return {"X-Admin-Token": ADMIN_TOKEN}


@pytest.fixture
def data_file(tmp_path):
    path = tmp_path / "store.json"
    path.write_text(json.dumps(copy.deepcopy(FIXTURE_DATA), ensure_ascii=False), encoding="utf-8")
    return path


@pytest.fixture
def container(data_file):
    from store.container import Container

    return Container(data_file).load()


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app, container):
    """TestClient whose endpoints use the fixture store."""
    app.dependency_overrides[get_container] = lambda: container
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def bare_client(app):
    """TestClient for tests that must not reach any service (e.g. auth checks)."""

    def no_container():
        raise AssertionError("This request should have been rejected before using the container")

    app.dependency_overrides[get_container] = no_container
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
