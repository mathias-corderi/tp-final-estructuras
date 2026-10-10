"""Reports for the owner — FLOW 5 (reports, settings and persistence).

Read-only: it walks the other services' data and never changes it.
The owner sees EVERYTHING (inactive products too) unless a method says otherwise.
Round every money amount to 2 decimals.
"""

from typing import Any

from store.models.product import Product
from store.models.settings import StoreSettings
from store.services.catalog_service import CatalogService
from store.services.order_service import OrderService
from store.services.search_history import SearchHistory
from store.structures.category_tree import CategoryTree


class ReportService:
    def __init__(
        self,
        catalog: CatalogService,
        tree: CategoryTree,
        orders: OrderService,
        search_history: SearchHistory,
        settings: StoreSettings,
    ) -> None:
        raise NotImplementedError("Flow 5: ReportService.__init__")

    def summary(self) -> dict[str, Any]:
        """{
          "revenue": sum of COMPLETED order totals,
          "orders": {"pending": n, "completed": n, "cancelled": n},
          "average_ticket": revenue / completed orders (0.0 if none),
          "inventory_value": sum of price * stock over ALL products (list price, no discount),
          "product_count": number of products (inactive too)
        }"""
        raise NotImplementedError("Flow 5: ReportService.summary")

    def best_sellers(self, limit: int = 10) -> list[dict[str, Any]]:
        """Ranking over COMPLETED orders: [{"code", "name", "units_sold", "revenue"}, ...].

        Order: units_sold descending, then code ascending. limit < 1 -> ValidationError.
        """
        raise NotImplementedError("Flow 5: ReportService.best_sellers")

    def low_stock(self) -> list[Product]:
        """ACTIVE products with stock <= min_stock, ordered by stock then code."""
        raise NotImplementedError("Flow 5: ReportService.low_stock")

    def categories(self) -> dict[str, Any]:
        """{
          "tree_depth": tree.depth(),
          "bst_height_by_code": ..., "bst_height_by_name": ...,     # catalog.tree_heights()
          "categories": [{"path", "product_count", "stock_value"}, ...]   # every path, preorder,
        }                                                           # counting the whole subtree"""
        raise NotImplementedError("Flow 5: ReportService.categories")

    def searches(self, limit: int = 5) -> dict[str, Any]:
        """{"recent": [...most recent first], "top_terms": [{"term", "count"}, ...]}"""
        raise NotImplementedError("Flow 5: ReportService.searches")

    def export_catalog(self) -> str:
        """Plain-text catalog of ACTIVE products sorted by name (use the BST via catalog.list_products).

        Line 1: "<store_name> — Catalog (<n> products)", line 2 blank, then one line per product:
            "80 | Ayudín Bleach 1L | Clorox | Cleaning | ARS 1100.00 | stock 8"
        (code | name | brand | category | currency final_price | stock), ending with a newline.
        """
        raise NotImplementedError("Flow 5: ReportService.export_catalog")
