"""Servicio del catálogo — FLUJO 1 (consultas) + FLUJO 2 (administración).

Fachada sobre todas las estructuras que guardan productos. Tiene que mantenerlas
SINCRONIZADAS en cada alta, modificación y baja:

  self._list        ProductList          orden de inserción, búsqueda secuencial  (Flujo 1)
  self._by_code     BinarySearchTree     clave = product.code                      (Flujo 1)
  self._by_name     BinarySearchTree     clave = (product.name.lower(), product.code)
  self._categories  CategoryTree         cada producto es un item del nodo
                                         en product.category                       (Flujo 3)
  self._undo        Stack de Operation   una entrada por cada cambio del dueño     (Flujo 2)

Esos nombres de atributos son el acuerdo entre el Flujo 1 y el Flujo 2: el
Flujo 2 los crea en __init__ y el Flujo 1 los lee en los métodos de consulta.

Todas las estructuras guardan los MISMOS objetos Product (referencias), así que
cambiar product.stock en un lugar se ve en todos. Solo los cambios de *claves*
(name, category) requieren trabajo extra: sacar con la clave vieja e insertar con la nueva.

`on_change` se llama después de cada cambio exitoso para que el container guarde
el JSON. load() y change_stock() NO deben llamarlo.
Errores: lanzar las clases de store/errors.py; nunca devolver None para "no encontrado".
"""

from typing import Any, Callable, Iterable

from store.models.product import Product
from store.models.settings import StoreSettings
from store.services.undo import Operation
from store.structures.category_tree import CategoryTree


class CatalogService:
    UPDATABLE_FIELDS = ("name", "brand", "price", "category", "min_stock", "discount_percent", "active")

    def __init__(
        self,
        categories: CategoryTree,
        settings: StoreSettings,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        """FLUJO 2. Crea las estructuras de arriba (vacías) y guarda los argumentos."""
        raise NotImplementedError("Flow 2: CatalogService.__init__")

    # ======================================================================
    # FLUJO 2 — administración
    # ======================================================================
    def load(self, products: Iterable[Product]) -> None:
        """Inserta los productos leídos del archivo: sin registro para deshacer y sin on_change.

        DuplicateCode si se repite un código, CategoryNotFound si su categoría no existe.
        """
        raise NotImplementedError("Flow 2: CatalogService.load")

    def all_products(self) -> list[Product]:
        """Todos los productos (también los inactivos) en el orden de la lista. Lo usan los reportes y el guardado."""
        raise NotImplementedError("Flow 2: CatalogService.all_products")

    def add(self, data: dict[str, Any]) -> Product:
        """Crea un producto a partir de un dict con los campos del constructor de Product.

        - min_stock ausente o None -> settings.default_min_stock.
        - Datos inválidos -> ValidationError. Código duplicado -> DuplicateCode.
          La categoría no existe -> CategoryNotFound.
        - Apila una Operation ADD y llama a on_change.
        """
        raise NotImplementedError("Flow 2: CatalogService.add")

    def update(self, code: int, changes: dict[str, Any]) -> Product:
        """Cambia algunos campos de un producto (solo UPDATABLE_FIELDS; code y stock no se cambian acá).

        - ProductNotFound; changes vacío o campo desconocido -> ValidationError.
        - Validar TODO primero: si algún valor es inválido (ValidationError) o la nueva
          categoría no existe (CategoryNotFound), no cambia nada.
        - Resincronizar _by_name si cambió el nombre y el árbol de categorías si cambió la categoría.
        - Apila una Operation UPDATE (before/after solo con los campos cambiados) y llama a on_change.
        """
        raise NotImplementedError("Flow 2: CatalogService.update")

    def delete(self, code: int) -> Product:
        """Lo saca de todas las estructuras. ProductNotFound. Apila una Operation DELETE y llama a on_change."""
        raise NotImplementedError("Flow 2: CatalogService.delete")

    def restock(self, code: int, quantity: int) -> Product:
        """Suma unidades. quantity tiene que ser un int > 0 (si no, ValidationError). Apila una Operation STOCK."""
        raise NotImplementedError("Flow 2: CatalogService.restock")

    def adjust_stock(self, code: int, delta: int, reason: str) -> Product:
        """Corrige el stock (roturas, conteo de inventario...). delta puede ser negativo.

        - delta tiene que ser un int distinto de 0 y reason un str no vacío (ValidationError).
        - Si el stock quedaría por debajo de 0 -> InsufficientStock y no cambia nada.
        - Apila una Operation STOCK (la descripción incluye el motivo) y llama a on_change.
        """
        raise NotImplementedError("Flow 2: CatalogService.adjust_stock")

    def change_stock(self, code: int, delta: int) -> Product:
        """Lo usa OrderService para reservar/devolver stock. NO se puede deshacer y NO llama a on_change.

        ProductNotFound (los inactivos también se encuentran). InsufficientStock si quedaría por debajo de 0.
        """
        raise NotImplementedError("Flow 2: CatalogService.change_stock")

    def undo(self) -> Operation:
        """Revierte la operación más reciente y la devuelve. NothingToUndo si la pila está vacía.

        Si revertir falla (por ejemplo, ahora el stock es muy bajo), lanzar el error y
        dejar la operación en la pila. Revertir NO apila una operación nueva.
        """
        raise NotImplementedError("Flow 2: CatalogService.undo")

    def undo_history(self) -> list[Operation]:
        """Operaciones pendientes de deshacer, la más reciente primero."""
        raise NotImplementedError("Flow 2: CatalogService.undo_history")

    # ======================================================================
    # FLUJO 1 — consultas
    # ======================================================================
    def list_products(self, sort: str = "code", include_inactive: bool = False) -> list[Product]:
        """Productos en el inorden del BST: sort="code" usa _by_code y sort="name" usa _by_name.

        Cualquier otro sort -> ValidationError. Los inactivos solo si include_inactive.
        """
        raise NotImplementedError("Flow 1: CatalogService.list_products")

    def get(self, code: int, include_inactive: bool = False) -> Product:
        """Busca el código en _by_code. ProductNotFound si no está, o si está inactivo y no se pidió include_inactive."""
        raise NotImplementedError("Flow 1: CatalogService.get")

    def search(self, name: str | None = None, brand: str | None = None) -> tuple[list[Product], int]:
        """Búsqueda secuencial en _list. Devuelve (resultados activos en el orden de la lista, comparaciones).

        - Al menos un criterio no vacío; si no, ValidationError.
        - Solo name: search_by_name. Solo brand: search_by_brand.
        - Los dos: productos que cumplen AMBOS; comparaciones = las dos búsquedas sumadas.
        """
        raise NotImplementedError("Flow 1: CatalogService.search")

    def compare_search(self, code: int) -> dict[str, Any]:
        """Busca el mismo código en la lista y en el BST (los inactivos cuentan como encontrados).

        {"code": 80, "found": True, "list_comparisons": 7, "tree_comparisons": 3}
        """
        raise NotImplementedError("Flow 1: CatalogService.compare_search")

    def tree_heights(self) -> dict[str, int]:
        """{"by_code": _by_code.height(), "by_name": _by_name.height()} (lo usan los reportes)."""
        raise NotImplementedError("Flow 1: CatalogService.tree_heights")
