"""Reportes para el dueño — FLUJO 5 (reportes, configuración y persistencia).

Solo lectura: recorre los datos de los otros servicios y nunca los modifica.
El dueño ve TODO (también los productos inactivos), salvo que un método diga otra cosa.
Redondear todos los montos a 2 decimales.
"""

from typing import Any

from store import errors
from store.models.order import OrderStatus
from store.models.product import Product
from store.models.settings import StoreSettings
from store.services.catalog_service import CatalogService
from store.services.order_service import OrderService
from store.services.search_history import SearchHistory
from store.structures.category_tree import CategoryTree


def _stock_value(products: list[Product]) -> float:
    """Valor a precio de lista, sin descuento, redondeado a 2 decimales."""
    return round(sum((product.price * product.stock for product in products), 0.0), 2)


class ReportService:
    def __init__(
        self,
        catalog: CatalogService,
        tree: CategoryTree,
        orders: OrderService,
        search_history: SearchHistory,
        settings: StoreSettings,
    ) -> None:
        self._catalog = catalog
        self._tree = tree
        self._orders = orders
        self._search_history = search_history
        self._settings = settings

    def summary(self) -> dict[str, Any]:
        """{
          "revenue": suma de los totales de los pedidos COMPLETADOS,
          "orders": {"pending": n, "completed": n, "cancelled": n},
          "average_ticket": revenue / pedidos completados (0.0 si no hay),
          "inventory_value": suma de price * stock de TODOS los productos (precio de lista, sin descuento),
          "product_count": cantidad de productos (también los inactivos)
        }"""
        counts = {status.value: 0 for status in OrderStatus}
        revenue = 0.0
        for order in self._orders.all_orders():
            counts[order.status.value] += 1
            if order.status is OrderStatus.COMPLETED:
                revenue += order.total
        revenue = round(revenue, 2)
        completed = counts[OrderStatus.COMPLETED.value]
        products = self._catalog.all_products()
        return {
            "revenue": revenue,
            "orders": counts,
            "average_ticket": round(revenue / completed, 2) if completed else 0.0,
            "inventory_value": _stock_value(products),
            "product_count": len(products),
        }

    def best_sellers(self, limit: int = 10) -> list[dict[str, Any]]:
        """Ranking sobre los pedidos COMPLETADOS: [{"code", "name", "units_sold", "revenue"}, ...].

        Orden: units_sold descendente y después code ascendente. limit < 1 -> ValidationError.
        """
        if limit < 1:
            raise errors.ValidationError("limit must be at least 1")
        # Sale todo de los items del pedido (nombre y precio de ese momento), no del
        # catálogo: el producto pudo cambiar de precio o haberse borrado después de la venta.
        totals: dict[int, dict[str, Any]] = {}
        for order in self._orders.list_orders(OrderStatus.COMPLETED.value):
            for item in order.items:
                entry = totals.setdefault(
                    item.code, {"code": item.code, "name": item.name, "units_sold": 0, "revenue": 0.0}
                )
                entry["units_sold"] += item.quantity
                entry["revenue"] += item.subtotal
        ranking = sorted(totals.values(), key=lambda entry: (-entry["units_sold"], entry["code"]))
        return [{**entry, "revenue": round(entry["revenue"], 2)} for entry in ranking[:limit]]

    def low_stock(self) -> list[Product]:
        """Productos ACTIVOS con stock <= min_stock, ordenados por stock y después por código."""
        products = [
            product
            for product in self._catalog.all_products()
            if product.active and product.stock <= product.min_stock
        ]
        return sorted(products, key=lambda product: (product.stock, product.code))

    def categories(self) -> dict[str, Any]:
        """{
          "tree_depth": tree.depth(),
          "bst_height_by_code": ..., "bst_height_by_name": ...,     # catalog.tree_heights()
          "categories": [{"path", "product_count", "stock_value"}, ...]   # todas las rutas, en preorden,
        }                                                           # contando el subárbol completo"""
        heights = self._catalog.tree_heights()
        stats = []
        for path in self._tree.paths():
            products = self._tree.items(path)  # recorre el subárbol, inactivos incluidos
            stats.append({"path": path, "product_count": len(products), "stock_value": _stock_value(products)})
        return {
            "tree_depth": self._tree.depth(),
            "bst_height_by_code": heights["by_code"],
            "bst_height_by_name": heights["by_name"],
            "categories": stats,
        }

    def searches(self, limit: int = 5) -> dict[str, Any]:
        """{"recent": [...la más reciente primero], "top_terms": [{"term", "count"}, ...]}"""
        return {"recent": self._search_history.recent(), "top_terms": self._search_history.top_terms(limit)}

    def export_catalog(self) -> str:
        """Catálogo en texto plano de los productos ACTIVOS ordenados por nombre (usar el BST vía catalog.list_products).

        Línea 1: "<store_name> — Catalog (<n> products)", línea 2 en blanco, después una línea por producto:
            "80 | Ayudín Bleach 1L | Clorox | Cleaning | ARS 1100.00 | stock 8"
        (código | nombre | marca | categoría | moneda precio_final | stock), terminando con un salto de línea.
        """
        products = self._catalog.list_products(sort="name")
        lines = [f"{self._settings.store_name} — Catalog ({len(products)} products)", ""]
        for product in products:
            lines.append(
                f"{product.code} | {product.name} | {product.brand} | {product.category} | "
                f"{self._settings.currency} {product.final_price:.2f} | stock {product.stock}"
            )
        return "\n".join(lines) + "\n"
