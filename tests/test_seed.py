"""The seed file (data/seed.json) the app starts from."""

import json
import shutil

import pytest

from store import config

SEED = json.loads(config.SEED_PATH.read_text(encoding="utf-8"))


@pytest.mark.shared
def test_seed_has_at_least_30_products_with_unique_codes():
    product_codes = [p["code"] for p in SEED["products"]]
    assert len(product_codes) >= 30
    assert len(set(product_codes)) == len(product_codes)


@pytest.mark.shared
def test_seed_codes_are_not_sorted():
    """Sorted codes would turn the BST into a list (height == number of products)."""
    product_codes = [p["code"] for p in SEED["products"]]
    assert product_codes != sorted(product_codes)


@pytest.mark.shared
def test_seed_categories_are_consistent():
    paths = SEED["categories"]
    for path in paths:
        if "/" in path:
            assert path.rsplit("/", 1)[0] in paths, f"{path} has no parent"
    for product in SEED["products"]:
        assert product["category"] in paths


@pytest.mark.shared
def test_seed_orders_reference_existing_products():
    product_codes = {p["code"] for p in SEED["products"]}
    for order in SEED["orders"]:
        for item in order["items"]:
            assert item["code"] in product_codes


@pytest.mark.integration
def test_seed_loads_into_a_container(tmp_path):
    from store.container import Container

    path = tmp_path / "store.json"
    shutil.copyfile(config.SEED_PATH, path)
    container = Container(path).load()
    assert len(container.catalog.all_products()) == len(SEED["products"])
    heights = container.catalog.tree_heights()
    assert heights["by_code"] < len(SEED["products"]) // 2
