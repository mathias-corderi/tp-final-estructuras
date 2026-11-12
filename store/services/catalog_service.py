from typing import Any, Callable, Iterable

from store.models.product import Product
from store.models.settings import StoreSettings
from store.services.undo import Operation, OperationKind
from store.structures.category_tree import CategoryTree
from store.structures.stack import Stack
from store.structures.product_list import ProductList
from store.structures.bst import BinarySearchTree
from store.errors import (
    DuplicateCode,
    CategoryNotFound,
    ValidationError,
    ProductNotFound,
    InsufficientStock,
    NothingToUndo,
)


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

    def _trigger_change(self) -> None:
        if self._on_change is not None:
            self._on_change()

    # ======================================================================
    # FLUJO 2 — administración
    # ======================================================================
    def load(self, products: Iterable[Product]) -> None:
        """Inserta los productos leídos del archivo: sin registro para deshacer y sin on_change."""
        for product in products:
            if self._by_code.search(product.code) is not None:
                raise DuplicateCode(f"El código {product.code} ya existe.")
            if not self._categories.node(product.category):
                raise CategoryNotFound(f"La categoría '{product.category}' no existe.")
            
            self._list.append(product)
            self._by_code.insert(product.code, product)
            self._by_name.insert((product.name.lower(), product.code), product)
            self._categories.node(product.category).items.append(product)

    def all_products(self) -> list[Product]:
        """Todos los productos (también los inactivos) en el orden de la lista."""
        return self._list.to_list()

    def add(self, data: dict[str, Any]) -> Product:
        """Crea un producto a partir de un dict con los campos del constructor de Product."""
        try:
            if "min_stock" not in data or data["min_stock"] is None:
                data["min_stock"] = self._settings.default_min_stock
            
            # El constructor de Product valida los tipos de datos (lanza ValueError)
            product = Product(**data)
        except ValueError as e:
            raise ValidationError(str(e))
        except TypeError as e:
            raise ValidationError(f"Faltan campos o hay campos extra: {e}")

        if self._by_code.search(product.code) is not None:
            raise DuplicateCode(f"El código {product.code} ya existe.")
        
        cat_node = self._categories.node(product.category)
        if not cat_node:
            raise CategoryNotFound(f"La categoría '{product.category}' no existe.")

        self._list.append(product)
        self._by_code.insert(product.code, product)
        self._by_name.insert((product.name.lower(), product.code), product)
        cat_node.items.append(product)

        op = Operation(
            kind=OperationKind.ADD,
            code=product.code,
            before=None,
            after=product.to_dict(),
            description=f"Agregado producto {product.code} ({product.name})"
        )
        self._undo.push(op)
        self._trigger_change()
        
        return product

    def update(self, code: int, changes: dict[str, Any]) -> Product:
        """Cambia algunos campos de un producto (solo UPDATABLE_FIELDS; code y stock no se cambian acá)."""
        if not changes:
            raise ValidationError("No se enviaron campos para modificar.")
        
        for key in changes:
            if key not in self.UPDATABLE_FIELDS:
                raise ValidationError(f"El campo '{key}' no se puede modificar por esta vía.")

        node = self._by_code.search(code)
        if not node:
            raise ProductNotFound(f"Producto {code} no encontrado.")
        product = node.value

        if "category" in changes and changes["category"] != product.category:
            if not self._categories.node(changes["category"]):
                raise CategoryNotFound(f"La categoría '{changes['category']}' no existe.")

        before_state = {k: getattr(product, k) for k in changes.keys()}
        old_name = product.name
        old_category = product.category

        # Intentamos aplicar los cambios (Product lanza ValueError si algo es inválido)
        try:
            for k, v in changes.items():
                setattr(product, k, v)
        except ValueError as e:
            # Si falla, revertimos lo que hayamos llegado a cambiar y lanzamos el error
            for k, v in before_state.items():
                setattr(product, k, v)
            raise ValidationError(str(e))

        # Si cambió el nombre, hay que sacarlo y volver a meterlo en el árbol _by_name
        if old_name != product.name:
            self._by_name.delete((old_name.lower(), product.code))
            self._by_name.insert((product.name.lower(), product.code), product)

        # Si cambió la categoría, hay que moverlo de lista en CategoryTree
        if old_category != product.category:
            self._categories.node(old_category).items.remove(product)
            self._categories.node(product.category).items.append(product)

        after_state = {k: getattr(product, k) for k in changes.keys()}
        
        op = Operation(
            kind=OperationKind.UPDATE,
            code=product.code,
            before=before_state,
            after=after_state,
            description=f"Modificado producto {product.code}"
        )
        self._undo.push(op)
        self._trigger_change()
        
        return product

    def delete(self, code: int) -> Product:
        """Lo saca de todas las estructuras."""
        node = self._by_code.search(code)
        if not node:
            raise ProductNotFound(f"Producto {code} no encontrado.")
        product = node.value
        
        before_state = product.to_dict()

        self._list.remove(code)
        self._by_code.delete(code)
        self._by_name.delete((product.name.lower(), product.code))
        self._categories.node(product.category).items.remove(product)

        op = Operation(
            kind=OperationKind.DELETE,
            code=code,
            before=before_state,
            after=None,
            description=f"Eliminado producto {code}"
        )
        self._undo.push(op)
        self._trigger_change()
        
        return product

    def restock(self, code: int, quantity: int) -> Product:
        """Suma unidades. quantity tiene que ser un int > 0."""
        if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
            raise ValidationError("La cantidad a sumar debe ser un entero positivo.")
            
        node = self._by_code.search(code)
        if not node:
            raise ProductNotFound(f"Producto {code} no encontrado.")
        product = node.value

        old_stock = product.stock
        product.stock += quantity
        
        op = Operation(
            kind=OperationKind.STOCK,
            code=code,
            before={"stock": old_stock},
            after={"stock": product.stock},
            description=f"Ingresaron {quantity} unidades"
        )
        self._undo.push(op)
        self._trigger_change()
        
        return product

    def adjust_stock(self, code: int, delta: int, reason: str) -> Product:
        """Corrige el stock (roturas, conteo de inventario...)."""
        if not isinstance(delta, int) or isinstance(delta, bool) or delta == 0:
            raise ValidationError("El delta debe ser un entero distinto de cero.")
        if not isinstance(reason, str) or not reason.strip():
            raise ValidationError("Debe proveer un motivo (str no vacío) para el ajuste.")
            
        node = self._by_code.search(code)
        if not node:
            raise ProductNotFound(f"Producto {code} no encontrado.")
        product = node.value

        if product.stock + delta < 0:
            raise InsufficientStock(f"El ajuste dejaría el stock en negativo ({product.stock + delta}).")

        old_stock = product.stock
        product.stock += delta
        
        op = Operation(
            kind=OperationKind.STOCK,
            code=code,
            before={"stock": old_stock},
            after={"stock": product.stock},
            description=reason.strip()
        )
        self._undo.push(op)
        self._trigger_change()
        
        return product

    def change_stock(self, code: int, delta: int) -> Product:
        """Lo usa OrderService para reservar/devolver stock. NO se puede deshacer y NO llama a on_change."""
        node = self._by_code.search(code)
        if not node:
            raise ProductNotFound(f"Producto {code} no encontrado.")
        product = node.value

        if product.stock + delta < 0:
            raise InsufficientStock(f"No hay stock suficiente. Actual: {product.stock}.")

        product.stock += delta
        return product

    def undo(self) -> Operation:
        """Revierte la operación más reciente y la devuelve."""
        if self._undo.is_empty():
            raise NothingToUndo("No hay operaciones para deshacer.")
            
        op = self._undo.peek()

        if op.kind == OperationKind.ADD:
            # Revertir un ADD es hacer un DELETE, pero sin registrarlo ni llamar on_change acá adentro
            # Usamos un try/except por si falla al buscarlo
            try:
                node = self._by_code.search(op.code)
                if not node: raise ProductNotFound("")
                p = node.value
                self._list.remove(op.code)
                self._by_code.delete(op.code)
                self._by_name.delete((p.name.lower(), p.code))
                self._categories.node(p.category).items.remove(p)
            except Exception as e:
                raise e
                
        elif op.kind == OperationKind.DELETE:
            # Revertir un DELETE es volver a crearlo
            try:
                p = Product.from_dict(op.before)
                self._list.append(p)
                self._by_code.insert(p.code, p)
                self._by_name.insert((p.name.lower(), p.code), p)
                self._categories.node(p.category).items.append(p)
            except Exception as e:
                raise e
                
        elif op.kind == OperationKind.UPDATE:
            # Volver a los campos viejos
            node = self._by_code.search(op.code)
            if not node:
                raise ProductNotFound("No se pudo deshacer porque el producto ya no existe.")
            p = node.value
            
            old_name = p.name
            old_cat = p.category
            
            for k, v in op.before.items():
                setattr(p, k, v)
                
            if old_name != p.name:
                self._by_name.delete((old_name.lower(), op.code))
                self._by_name.insert((p.name.lower(), p.code), p)
            if old_cat != p.category:
                self._categories.node(old_cat).items.remove(p)
                self._categories.node(p.category).items.append(p)
                
        elif op.kind == OperationKind.STOCK:
            node = self._by_code.search(op.code)
            if not node:
                raise ProductNotFound("No se pudo deshacer porque el producto ya no existe.")
            p = node.value
            
            # Validamos que al revertir (ej. sacando el stock que ingresó) no quede negativo
            if op.before["stock"] < 0:
                raise InsufficientStock("No se puede deshacer porque dejaría el stock en negativo.")
                
            p.stock = op.before["stock"]

        # Si llegamos acá es porque el "revertir" funcionó sin tirar errores
        self._undo.pop()
        self._trigger_change()
        return op

    def undo_history(self) -> list[Operation]:
        """Operaciones pendientes de deshacer, la más reciente primero."""
        return self._undo.to_list()

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