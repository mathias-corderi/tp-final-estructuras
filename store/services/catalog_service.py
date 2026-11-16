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
from store import errors
from store.services.undo import Operation, OperationKind
from store.structures.bst import BinarySearchTree
from store.structures.category_tree import CategoryTree, split_path
from store.structures.product_list import ProductList
from store.structures.stack import Stack
from store.errors import ProductNotFound, ValidationError


def _is_int(value: Any) -> bool:
    """True para un int de verdad: bool es subclase de int y hay que excluirlo a mano."""
    return isinstance(value, int) and not isinstance(value, bool)


class CatalogService:
    UPDATABLE_FIELDS = ("name", "brand", "price", "category", "min_stock", "discount_percent", "active")

    def __init__(
        self,
        categories: CategoryTree,
        settings: StoreSettings,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        """FLUJO 2. Crea las estructuras de arriba (vacías) y guarda los argumentos."""
        self._categories = categories
        self._settings = settings
        self._on_change = on_change
        self._list = ProductList()
        self._by_code = BinarySearchTree()
        self._by_name = BinarySearchTree()
        self._undo = Stack()

    # ======================================================================
    # FLUJO 2 — administración
    # ======================================================================
    def load(self, products: Iterable[Product]) -> None:
        """Inserta los productos leídos del archivo: sin registro para deshacer y sin on_change.

        DuplicateCode si se repite un código, CategoryNotFound si su categoría no existe.
        """
        for product in products:
            self._check_can_insert(product)
            self._insert(product)

    def all_products(self) -> list[Product]:
        """Todos los productos (también los inactivos) en el orden de la lista. Lo usan los reportes y el guardado."""
        return self._list.to_list()

    def add(self, data: dict[str, Any]) -> Product:
        """Crea un producto a partir de un dict con los campos del constructor de Product.

        - min_stock ausente o None -> settings.default_min_stock.
        - Datos inválidos -> ValidationError. Código duplicado -> DuplicateCode.
          La categoría no existe -> CategoryNotFound.
        - Apila una Operation ADD y llama a on_change.
        """
        data = dict(data)  # no modificar el dict de quien llama
        if "category" in data:
            data["category"] = self._canonical_category(data["category"])
        if data.get("min_stock") is None:
            data["min_stock"] = self._settings.default_min_stock
        try:
            product = Product(**data)
        except ValueError as exc:
            raise errors.ValidationError(str(exc)) from exc
        except TypeError as exc:  # faltan campos o sobran
            raise errors.ValidationError(f"Invalid product fields: {exc}") from exc

        self._check_can_insert(product)
        self._insert(product)
        self._push(Operation(OperationKind.ADD, product.code, None, product.to_dict(), f"Add product {product.code} ({product.name})"))
        return product

    def update(self, code: int, changes: dict[str, Any]) -> Product:
        """Cambia algunos campos de un producto (solo UPDATABLE_FIELDS; code y stock no se cambian acá).

        - ProductNotFound; changes vacío o campo desconocido -> ValidationError.
        - Validar TODO primero: si algún valor es inválido (ValidationError) o la nueva
          categoría no existe (CategoryNotFound), no cambia nada.
        - Resincronizar _by_name si cambió el nombre y el árbol de categorías si cambió la categoría.
        - Apila una Operation UPDATE (before/after solo con los campos cambiados) y llama a on_change.
        """
        if not changes:
            raise errors.ValidationError("No fields to update")
        for field in changes:
            if field not in self.UPDATABLE_FIELDS:
                raise errors.ValidationError(f"Field '{field}' cannot be updated")
        product = self._find(code)
        if "category" in changes:
            changes = {**changes, "category": self._canonical_category(changes["category"])}
        if "category" in changes and not self._categories.exists(changes["category"]):
            raise errors.CategoryNotFound(f"Category '{changes['category']}' not found")

        before = {field: getattr(product, field) for field in changes}
        try:
            self._apply(product, changes)
        except ValueError as exc:
            raise errors.ValidationError(str(exc)) from exc
        after = {field: getattr(product, field) for field in changes}
        self._push(Operation(OperationKind.UPDATE, code, before, after, f"Update product {code} ({', '.join(changes)})"))
        return product

    def delete(self, code: int) -> Product:
        """Lo saca de todas las estructuras. ProductNotFound. Apila una Operation DELETE y llama a on_change."""
        product = self._find(code)
        self._remove(product)
        self._push(Operation(OperationKind.DELETE, code, product.to_dict(), None, f"Delete product {code} ({product.name})"))
        return product

    def restock(self, code: int, quantity: int) -> Product:
        """Suma unidades. quantity tiene que ser un int > 0 (si no, ValidationError). Apila una Operation STOCK."""
        if not _is_int(quantity) or quantity <= 0:
            raise errors.ValidationError("quantity must be an integer greater than 0")
        product = self._find(code)
        before = product.stock
        product.stock += quantity
        self._push(Operation(OperationKind.STOCK, code, {"stock": before}, {"stock": product.stock}, f"Restock {code}: +{quantity}"))
        return product

    def adjust_stock(self, code: int, delta: int, reason: str) -> Product:
        """Corrige el stock (roturas, conteo de inventario...). delta puede ser negativo.

        - delta tiene que ser un int distinto de 0 y reason un str no vacío (ValidationError).
        - Si el stock quedaría por debajo de 0 -> InsufficientStock y no cambia nada.
        - Apila una Operation STOCK (la descripción incluye el motivo) y llama a on_change.
        """
        if not _is_int(delta) or delta == 0:
            raise errors.ValidationError("delta must be a non-zero integer")
        if not isinstance(reason, str) or not reason.strip():
            raise errors.ValidationError("reason must be a non-empty string")
        product = self._find(code)
        if product.stock + delta < 0:
            raise errors.InsufficientStock(f"Stock of {code} would be {product.stock + delta}")
        before = product.stock
        product.stock += delta
        self._push(Operation(OperationKind.STOCK, code, {"stock": before}, {"stock": product.stock}, f"Adjust {code}: {delta:+d} ({reason.strip()})"))
        return product

    def change_stock(self, code: int, delta: int) -> Product:
        """Lo usa OrderService para reservar/devolver stock. NO se puede deshacer y NO llama a on_change.

        ProductNotFound (los inactivos también se encuentran). InsufficientStock si quedaría por debajo de 0.
        """
        product = self._find(code)
        if product.stock + delta < 0:
            raise errors.InsufficientStock(f"Not enough stock of {code}: {product.stock} available")
        product.stock += delta
        return product

    def undo(self) -> Operation:
        """Revierte la operación más reciente y la devuelve. NothingToUndo si la pila está vacía.

        Si revertir falla (por ejemplo, ahora el stock es muy bajo), lanzar el error y
        dejar la operación en la pila. Revertir NO apila una operación nueva.
        """
        if self._undo.is_empty():
            raise errors.NothingToUndo("Nothing to undo")
        # peek y no pop: si revertir falla, la operación tiene que quedar en la pila.
        operation = self._undo.peek()
        if operation.kind is OperationKind.ADD:
            self._remove(self._find(operation.code))
        elif operation.kind is OperationKind.DELETE:
            product = Product.from_dict(operation.before)
            if self._by_code.contains(product.code):
                raise errors.DuplicateCode(f"Product code {product.code} already exists")
            self._ensure_category(product.category)
            self._insert(product)
        elif operation.kind is OperationKind.UPDATE:
            product = self._find(operation.code)
            # Solo se revierten los campos que siguen como los dejó esta operación: si algo
            # que no se deshace (un ajuste de precios por categoría) los cambió después, se respeta.
            to_restore = {
                field: value
                for field, value in operation.before.items()
                if getattr(product, field) == operation.after[field]
            }
            if "category" in to_restore:
                self._ensure_category(to_restore["category"])
            self._apply(product, to_restore)
        elif operation.kind is OperationKind.STOCK:
            # Se revierte la DIFERENCIA sobre el stock actual: si en el medio hubo
            # ventas (change_stock), no se pierden.
            product = self._find(operation.code)
            delta = operation.before["stock"] - operation.after["stock"]
            if product.stock + delta < 0:
                raise errors.InsufficientStock(f"Cannot undo: stock of {product.code} would be {product.stock + delta}")
            product.stock += delta
        self._undo.pop()
        if self._on_change is not None:
            self._on_change()
        return operation

    def undo_history(self) -> list[Operation]:
        """Operaciones pendientes de deshacer, la más reciente primero."""
        return self._undo.to_list()

    # ======================================================================
    # Integración con los otros flujos
    # ======================================================================
    def category_renamed(self, old_path: str, new_path: str) -> None:
        """Lo llama CategoryService después de renombrar: actualiza las rutas guardadas para deshacer.

        Sin esto, deshacer una baja o un cambio de categoría intentaría volver a una ruta que ya
        no existe, fallaría siempre y dejaría bloqueada toda la pila.
        """
        prefix = old_path + "/"
        for operation in self._undo.to_list():
            for snapshot in (operation.before, operation.after):
                category = snapshot.get("category") if snapshot else None
                if category == old_path:
                    snapshot["category"] = new_path
                elif isinstance(category, str) and category.startswith(prefix):
                    snapshot["category"] = new_path + "/" + category[len(prefix):]

    def return_stock_to_deleted(self, code: int, quantity: int) -> None:
        """Lo llama OrderService al cancelar un pedido de un producto que ya se borró.

        El stock no tiene a dónde volver, así que se suma a la copia guardada para deshacer
        la baja: si después se deshace, el producto vuelve con el stock correcto.
        """
        for operation in self._undo.to_list():  # la más reciente primero
            if operation.kind is OperationKind.DELETE and operation.code == code:
                operation.before["stock"] += quantity
                return

    # ======================================================================
    # FLUJO 2 — ayudantes internos
    # ======================================================================
    def _find(self, code: int) -> Product:
        """El producto con ese código (también inactivo). ProductNotFound si no está."""
        product, _ = self._by_code.search(code)  # search devuelve (valor, comparaciones)
        if product is None:
            raise errors.ProductNotFound(f"Product {code} not found")
        return product

    def _ensure_category(self, path: str) -> None:
        """Al deshacer, la categoría original puede haberse borrado: se vuelve a crear."""
        if not self._categories.exists(path):
            self._categories.add_path(path)

    @staticmethod
    def _canonical_category(path: Any) -> Any:
        """" Grocery /  Drinks " -> "Grocery/Drinks", así el producto queda con la misma ruta que el árbol."""
        if not isinstance(path, str):
            return path  # lo rechaza la validación de Product
        try:
            segments = split_path(path)
        except ValueError as exc:
            raise errors.ValidationError(str(exc)) from exc
        return "/".join(segments) if segments else path

    def _check_can_insert(self, product: Product) -> None:
        if self._by_code.contains(product.code):
            raise errors.DuplicateCode(f"Product code {product.code} already exists")
        if not self._categories.exists(product.category):
            raise errors.CategoryNotFound(f"Category '{product.category}' not found")

    def _insert(self, product: Product) -> None:
        """Lo agrega a las cuatro estructuras."""
        self._list.append(product)
        self._by_code.insert(product.code, product)
        self._by_name.insert((product.name.lower(), product.code), product)
        self._categories.add_item(product.category, product)

    def _remove(self, product: Product) -> None:
        """Lo saca de las cuatro estructuras."""
        self._list.remove(product.code)
        self._by_code.delete(product.code)
        self._by_name.delete((product.name.lower(), product.code))
        self._categories.remove_item(product.category, product)

    def _apply(self, product: Product, changes: dict[str, Any]) -> None:
        """Aplica `changes` y resincroniza las claves (nombre y categoría).

        Si algún valor es inválido, el setter lanza ValueError y se vuelve atrás lo ya
        aplicado, así que el producto queda como estaba.
        """
        old_name, old_category = product.name, product.category
        previous = {field: getattr(product, field) for field in changes}
        try:
            for field, value in changes.items():
                setattr(product, field, value)
        except ValueError:
            for field, value in previous.items():
                setattr(product, field, value)
            raise
        if product.name != old_name:
            self._by_name.delete((old_name.lower(), product.code))
            self._by_name.insert((product.name.lower(), product.code), product)
        if product.category != old_category:
            self._categories.remove_item(old_category, product)
            self._categories.add_item(product.category, product)

    def _push(self, operation: Operation) -> None:
        """Apila la operación para poder deshacerla y avisa que hubo un cambio."""
        self._undo.push(operation)
        if self._on_change is not None:
            self._on_change()

    # ======================================================================
    # FLUJO 1 — consultas
    # ======================================================================
    def list_products(self, sort: str = "code", include_inactive: bool = False) -> list[Product]:
        """Productos en el inorden del BST: sort="code" usa _by_code y sort="name" usa _by_name."""
        if sort == 'code':
            products = self._by_code.inorder()
        elif sort == 'name':
            products = self._by_name.inorder()
        else:
            raise ValidationError(f'Criterio de orden invalido: {sort}')
        
        if not include_inactive:
            products = [p for p in products if p.active]
            
        return products

    def get(self, code: int, include_inactive: bool = False) -> Product:
        """Busca el código en _by_code. ProductNotFound si no está, o si está inactivo y no se pidió include_inactive."""
        product, _ = self._by_code.search(code)
        if product is None:
            raise ProductNotFound(f'Producto {code} no encontrado')
        
        if not product.active and not include_inactive:
            raise ProductNotFound(f'Producto {code} inactivo')
        
        return product
        

    def search(self, name: str | None = None, brand: str | None = None) -> tuple[list[Product], int]:
        """Búsqueda secuencial en _list. Devuelve (resultados activos en el orden de la lista, comparaciones)."""
        name_empty = not name or not name.strip()
        brand_empty = not brand or not brand.strip()
        
        if name_empty and brand_empty:
            raise ValidationError('Debe proporcionar al menos un criterio de busqueda')
        
        if not name_empty and brand_empty:
            results, comparisons = self._list.search_by_name(name.strip())
        elif name_empty and not brand_empty:
            results, comparisons = self._list.search_by_brand(brand.strip())
        else:
            res_name, comp_name = self._list.search_by_name(name.strip())
            res_brand, comp_brand = self._list.search_by_brand(brand.strip())
            # Intersección recorriendo las dos listas de resultados (sin set, por RNF-01).
            # Las dos vienen en el orden de la lista, así que el resultado también.
            results = []
            for product in res_name:
                for match in res_brand:
                    if match is product:
                        results.append(product)
                        break
            comparisons = comp_name + comp_brand
            
        active_results = [p for p in results if p.active]
        return (active_results, comparisons)

    def compare_search(self, code: int) -> dict[str, Any]:
        """Busca el mismo código en la lista y en el BST (los inactivos cuentan como encontrados)."""
        prod_list, list_comps = self._list.find_by_code(code)
        prod_tree, tree_comps = self._by_code.search(code)
        
        return {
            'code': code,
            'found': prod_tree is not None,
            'list_comparisons': list_comps,
            'tree_comparisons': tree_comps,
        }
    def tree_heights(self) -> dict[str, int]:
        """{"by_code": _by_code.height(), "by_name": _by_name.height()} (lo usan los reportes)."""
        return {
            'by_code': self._by_code.height(),
            "by_name": self._by_name.height(),
        }
