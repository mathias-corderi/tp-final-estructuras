"""Builds and wires every service once. Shared code — already implemented.

Both the API and the console use a Container, so they share the exact same
logic. It also knows how to turn the whole store into the JSON format of
JsonStorage and back.
"""

import shutil
from pathlib import Path
from typing import Any

from store import config
from store.models.order import Order
from store.models.product import Product
from store.models.settings import StoreSettings
from store.services.catalog_service import CatalogService
from store.services.category_service import CategoryService
from store.services.order_service import OrderService
from store.services.report_service import ReportService
from store.services.search_history import SearchHistory
from store.services.settings_service import SettingsService
from store.services.storage import JsonStorage
from store.structures.category_tree import CategoryTree


class Container:
    def __init__(self, data_path: Path, seed_path: Path | None = None) -> None:
        self._seed_path = seed_path
        self.storage = JsonStorage(data_path)
        self.settings = StoreSettings()
        self.search_history = SearchHistory(self.settings.search_history_size)
        self.category_tree = CategoryTree()
        self.catalog = CatalogService(self.category_tree, self.settings, on_change=self.save)
        self.categories = CategoryService(self.category_tree, on_change=self.save)
        self.orders = OrderService(self.catalog, on_change=self.save)
        self.settings_service = SettingsService(self.settings, self.search_history, on_change=self.save)
        self.reports = ReportService(
            self.catalog, self.category_tree, self.orders, self.search_history, self.settings
        )

    def load(self) -> "Container":
        """Load the JSON file (copying the seed first if the file doesn't exist yet)."""
        path = self.storage.path
        if not path.exists() and self._seed_path is not None and self._seed_path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(self._seed_path, path)

        data = self.storage.load()
        if data["settings"]:
            self.settings.update(**data["settings"])
        self.search_history.resize(self.settings.search_history_size)
        self.search_history.load(data["search_history"])
        self.categories.load(data["categories"])
        self.catalog.load(Product.from_dict(item) for item in data["products"])
        self.orders.load(Order.from_dict(item) for item in data["orders"])
        return self

    def snapshot(self) -> dict[str, Any]:
        return {
            "settings": self.settings.to_dict(),
            "categories": self.categories.paths(),
            "products": [product.to_dict() for product in self.catalog.all_products()],
            "orders": [order.to_dict() for order in self.orders.all_orders()],
            "search_history": self.search_history.to_list(),
        }

    def save(self) -> None:
        self.storage.save(self.snapshot())


def build_default_container() -> Container:
    """Container over the real data file (data/store.json, created from data/seed.json)."""
    return Container(config.data_path(), seed_path=config.SEED_PATH).load()
