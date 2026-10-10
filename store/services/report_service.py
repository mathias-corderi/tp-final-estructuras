"""Reportes para el dueño — FLUJO 5 (reportes, configuración y persistencia).

Solo lectura: recorre los datos de los otros servicios y nunca los modifica.
El dueño ve TODO (también los productos inactivos), salvo que un método diga otra cosa.
Redondear todos los montos a 2 decimales.
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
          "revenue": suma de los totales de los pedidos COMPLETADOS,
          "orders": {"pending": n, "completed": n, "cancelled": n},
          "average_ticket": revenue / pedidos completados (0.0 si no hay),
          "inventory_value": suma de price * stock de TODOS los productos (precio de lista, sin descuento),
          "product_count": cantidad de productos (también los inactivos)
        }"""
        raise NotImplementedError("Flow 5: ReportService.summary")

    def best_sellers(self, limit: int = 10) -> list[dict[str, Any]]:
        """Ranking sobre los pedidos COMPLETADOS: [{"code", "name", "units_sold", "revenue"}, ...].

        Orden: units_sold descendente y después code ascendente. limit < 1 -> ValidationError.
        """
        raise NotImplementedError("Flow 5: ReportService.best_sellers")

    def low_stock(self) -> list[Product]:
        """Productos ACTIVOS con stock <= min_stock, ordenados por stock y después por código."""
        raise NotImplementedError("Flow 5: ReportService.low_stock")

    def categories(self) -> dict[str, Any]:
        """{
          "tree_depth": tree.depth(),
          "bst_height_by_code": ..., "bst_height_by_name": ...,     # catalog.tree_heights()
          "categories": [{"path", "product_count", "stock_value"}, ...]   # todas las rutas, en preorden,
        }                                                           # contando el subárbol completo"""
        raise NotImplementedError("Flow 5: ReportService.categories")

    def searches(self, limit: int = 5) -> dict[str, Any]:
        """{"recent": [...la más reciente primero], "top_terms": [{"term", "count"}, ...]}"""
        raise NotImplementedError("Flow 5: ReportService.searches")

    def export_catalog(self) -> str:
        """Catálogo en texto plano de los productos ACTIVOS ordenados por nombre (usar el BST vía catalog.list_products).

        Línea 1: "<store_name> — Catalog (<n> products)", línea 2 en blanco, después una línea por producto:
            "80 | Ayudín Bleach 1L | Clorox | Cleaning | ARS 1100.00 | stock 8"
        (código | nombre | marca | categoría | moneda precio_final | stock), terminando con un salto de línea.
        """
        raise NotImplementedError("Flow 5: ReportService.export_catalog")
