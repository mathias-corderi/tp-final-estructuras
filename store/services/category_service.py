"""Servicio de categorías — FLUJO 3 (categorías).

Reglas de negocio sobre CategoryTree. Los items del árbol son los mismos objetos
Product (los pone ahí CatalogService), así que este servicio puede leerlos y
cambiarlos directamente (product.category, product.price).

Traducir las excepciones del árbol: KeyError -> CategoryNotFound; rutas o nombres
inválidos (ValueError) -> ValidationError.
Los clientes solo ven productos ACTIVOS; el dueño (reportes) ve todos.
"""

from typing import Any, Callable

from store.models.product import Product
from store.structures.category_tree import CategoryTree


class CategoryService:
    def __init__(self, tree: CategoryTree, on_change: Callable[[], None] | None = None) -> None:
        raise NotImplementedError("Flow 3: CategoryService.__init__")

    def load(self, paths: list[str]) -> None:
        """Crea las categorías leídas del archivo (sin on_change)."""
        raise NotImplementedError("Flow 3: CategoryService.load")

    def paths(self) -> list[str]:
        """Todas las rutas de categorías en preorden (es lo que se guarda en el archivo)."""
        raise NotImplementedError("Flow 3: CategoryService.paths")

    def tree(self) -> dict[str, Any]:
        """El árbol completo como dict anidado (CategoryTree.to_dict) contando solo productos activos."""
        raise NotImplementedError("Flow 3: CategoryService.tree")

    def products(self, path: str, include_subcategories: bool = True) -> list[Product]:
        """Productos activos de la categoría (en preorden si include_subcategories). CategoryNotFound."""
        raise NotImplementedError("Flow 3: CategoryService.products")

    def create(self, path: str) -> dict[str, Any]:
        """Crea la categoría y los padres que falten. Devuelve su dict (como tree()).

        Ruta en blanco o inválida -> ValidationError. Ya existe -> CategoryAlreadyExists.
        """
        raise NotImplementedError("Flow 3: CategoryService.create")

    def rename(self, path: str, new_name: str) -> dict[str, Any]:
        """Renombra el ÚLTIMO segmento de `path` y devuelve el dict del nodo renombrado.

        - Raíz ("") o nombre nuevo inválido (en blanco o con "/") -> ValidationError.
        - No existe -> CategoryNotFound. Un hermano ya se llama new_name -> CategoryAlreadyExists.
        - Hay que actualizar la `category` de todos los productos del subárbol:
          renombrar "Grocery" a "Food" convierte "Grocery/Drinks/Sodas" en "Food/Drinks/Sodas".
        """
        raise NotImplementedError("Flow 3: CategoryService.rename")

    def delete(self, path: str) -> None:
        """Elimina una categoría VACÍA.

        Raíz -> ValidationError. No existe -> CategoryNotFound.
        Tiene subcategorías o productos (los inactivos también cuentan) -> CategoryNotEmpty.
        """
        raise NotImplementedError("Flow 3: CategoryService.delete")

    def adjust_prices(self, path: str, percent: float) -> list[Product]:
        """Sube o baja en `percent` el precio de TODOS los productos del subárbol (también los inactivos).

        - percent tiene que ser un número entre -90 y 500 y distinto de 0 (ValidationError).
        - precio nuevo = round(price * (1 + percent / 100), 2).
        - Devuelve los productos actualizados en preorden. CategoryNotFound si no existe.
        - No se puede deshacer (no es una operación de CatalogService).
        """
        raise NotImplementedError("Flow 3: CategoryService.adjust_prices")
