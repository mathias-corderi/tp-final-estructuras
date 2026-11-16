"""Servicio de categorías — FLUJO 3 (categorías).

Reglas de negocio sobre CategoryTree. Los items del árbol son los mismos objetos
Product (los pone ahí CatalogService), así que este servicio puede leerlos y
cambiarlos directamente (product.category, product.price).

Traducir las excepciones del árbol: KeyError -> CategoryNotFound; rutas o nombres
inválidos (ValueError) -> ValidationError.
Los clientes solo ven productos ACTIVOS; el dueño (reportes) ve todos.
"""

from typing import Any, Callable

from store import errors
from store.models.product import Product
from store.structures.category_tree import CategoryNode, CategoryTree, split_path


def _is_active(product: Product) -> bool:
    return product.active


class CategoryService:
    def __init__(self, tree: CategoryTree, on_change: Callable[[], None] | None = None) -> None:
        self._tree = tree
        self._on_change = on_change

    # --- ayudantes internos ----------------------------------------------------
    def _changed(self) -> None:
        if self._on_change is not None:
            self._on_change()

    def _segments(self, path: str) -> list[str]:
        """split_path, pero con el error de negocio en vez del ValueError del árbol."""
        try:
            return split_path(path)
        except ValueError as exc:
            raise errors.ValidationError(str(exc)) from exc

    def _find(self, path: str) -> CategoryNode:
        """El nodo en `path` ("" -> raíz). CategoryNotFound si no existe, ValidationError si la ruta es inválida."""
        self._segments(path)
        node = self._tree.find(path)
        if node is None:
            raise errors.CategoryNotFound(f"Category '{path}' not found")
        return node

    def _node_dict(self, node: CategoryNode) -> dict[str, Any]:
        """Dict anidado del nodo contando solo productos activos."""
        return self._tree.to_dict(node.path, item_filter=_is_active)

    def _sync_product_categories(self, node: CategoryNode) -> None:
        """Deja `product.category` igual a la ruta del nodo donde cuelga, en todo el subárbol.

        Se usa después de renombrar: los productos siguen colgando de los mismos nodos,
        pero el texto de su `category` quedó con el nombre viejo.
        """
        for product in node.items:
            product.category = node.path
        for child in node.children:
            self._sync_product_categories(child)

    # --- carga y consulta ------------------------------------------------------
    def load(self, paths: list[str]) -> None:
        """Crea las categorías leídas del archivo (sin on_change)."""
        for path in paths:
            self._tree.add_path(path)

    def paths(self) -> list[str]:
        """Todas las rutas de categorías en preorden (es lo que se guarda en el archivo)."""
        return self._tree.paths()

    def tree(self) -> dict[str, Any]:
        """El árbol completo como dict anidado (CategoryTree.to_dict) contando solo productos activos."""
        return self._tree.to_dict("", item_filter=_is_active)

    def products(self, path: str, include_subcategories: bool = True) -> list[Product]:
        """Productos activos de la categoría (en preorden si include_subcategories). CategoryNotFound."""
        self._find(path)  # valida la ruta y traduce los errores
        found = self._tree.items(path, include_subcategories)
        return [product for product in found if product.active]

    def count_products(self, path: str) -> int:
        """Cantidad de productos del subárbol, también inactivos (los que alcanza un ajuste de precios)."""
        self._find(path)
        return self._tree.count(path)

    # --- administración --------------------------------------------------------
    def create(self, path: str) -> dict[str, Any]:
        """Crea la categoría y los padres que falten. Devuelve su dict (como tree()).

        Ruta en blanco o inválida -> ValidationError. Ya existe -> CategoryAlreadyExists.
        """
        if not self._segments(path):
            raise errors.ValidationError("Category path cannot be blank")
        if self._tree.exists(path):
            raise errors.CategoryAlreadyExists(f"Category '{path}' already exists")
        node = self._tree.add_path(path)
        self._changed()
        return self._node_dict(node)

    def rename(self, path: str, new_name: str) -> dict[str, Any]:
        """Renombra el ÚLTIMO segmento de `path` y devuelve el dict del nodo renombrado.

        - Raíz ("") o nombre nuevo inválido (en blanco o con "/") -> ValidationError.
        - No existe -> CategoryNotFound. Un hermano ya se llama new_name -> CategoryAlreadyExists.
        - Hay que actualizar la `category` de todos los productos del subárbol:
          renombrar "Grocery" a "Food" convierte "Grocery/Drinks/Sodas" en "Food/Drinks/Sodas".
        """
        if not self._segments(path):
            raise errors.ValidationError("The root category cannot be renamed")
        if not isinstance(new_name, str) or not new_name.strip() or "/" in new_name:
            raise errors.ValidationError("New name must be non-blank and cannot contain '/'")
        new_name = new_name.strip()

        node = self._find(path)
        sibling = node.parent.find_child(new_name)
        if sibling is not None and sibling is not node:
            raise errors.CategoryAlreadyExists(f"A category named '{new_name}' already exists at that level")

        self._tree.rename(path, new_name)
        self._sync_product_categories(node)
        self._changed()
        return self._node_dict(node)

    def delete(self, path: str) -> None:
        """Elimina una categoría VACÍA.

        Raíz -> ValidationError. No existe -> CategoryNotFound.
        Tiene subcategorías o productos (los inactivos también cuentan) -> CategoryNotEmpty.
        """
        if not self._segments(path):
            raise errors.ValidationError("The root category cannot be deleted")
        node = self._find(path)
        if node.children:
            raise errors.CategoryNotEmpty(f"Category '{path}' has subcategories")
        if node.items:  # items incluye los productos inactivos
            raise errors.CategoryNotEmpty(f"Category '{path}' has products")
        self._tree.remove(path)
        self._changed()

    def adjust_prices(self, path: str, percent: float) -> list[Product]:
        """Sube o baja en `percent` el precio de TODOS los productos del subárbol (también los inactivos).

        - percent tiene que ser un número entre -90 y 500 y distinto de 0 (ValidationError).
        - precio nuevo = round(price * (1 + percent / 100), 2).
        - Devuelve los productos actualizados en preorden. CategoryNotFound si no existe.
        - No se puede deshacer (no es una operación de CatalogService).
        """
        if isinstance(percent, bool) or not isinstance(percent, (int, float)):
            raise errors.ValidationError("percent must be a number")
        if not (-90 <= percent <= 500) or percent == 0:  # escrito así, NaN también se rechaza
            raise errors.ValidationError("percent must be between -90 and 500 and different from 0")

        self._find(path)
        products = self._tree.items(path)  # subárbol completo, inactivos incluidos, en preorden

        # Primero se calculan TODOS los precios nuevos: si alguno queda inválido
        # (por ejemplo, un precio de 0.01 con -90 %), no se toca ningún producto.
        new_prices = []
        for product in products:
            new_price = round(product.price * (1 + percent / 100), 2)
            if new_price <= 0:
                raise errors.ValidationError(
                    f"The new price of product {product.code} would be {new_price}; nothing was changed"
                )
            new_prices.append(new_price)

        for index in range(len(products)):
            products[index].price = new_prices[index]
        if products:
            self._changed()
        return products
