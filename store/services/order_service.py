"""Servicio de pedidos — FLUJO 4 (carrito y pedidos).

Vida de un pedido:
    el cliente lo hace      -> PENDING (stock reservado, pedido encolado)
    el dueño lo completa    -> COMPLETED (siempre el pendiente MÁS VIEJO: cola FIFO)
    el dueño lo cancela     -> CANCELLED (se devuelve el stock y sale de la cola)

Guardar todos los pedidos en una lista (por id ascendente) y los pendientes
TAMBIÉN en una Queue (store/structures/linked_queue.py). Los ids empiezan en 1
y nunca se repiten. Los cambios de stock pasan por catalog.change_stock(code, delta).

Estructuras:
  self._orders   list[Order]   todos los pedidos. Como los ids se asignan en orden
                               creciente, la lista queda ordenada por id sin hacer
                               nada, y `get` puede usar búsqueda binaria: O(log n).
  self._pending  Queue[Order]  solo los PENDING, en orden de llegada. El dueño
                               atiende con dequeue (O(1)); cancelar usa
                               remove_first (O(n), saca uno del medio).
Las dos estructuras guardan los MISMOS objetos Order (referencias).
"""

from typing import Any, Callable, Iterable

from store.errors import (
    InsufficientStock,
    InvalidOrderState,
    NoPendingOrders,
    OrderNotFound,
    ProductNotFound,
    ValidationError,
)
from store.models.cart import Cart
from store.models.order import Order, OrderItem, OrderStatus
from store.services.catalog_service import CatalogService
from store.structures.linked_queue import Queue


class OrderService:
    def __init__(self, catalog: CatalogService, on_change: Callable[[], None] | None = None) -> None:
        self._catalog = catalog
        self._on_change = on_change
        self._orders: list[Order] = []
        self._pending = Queue()
        self._next_id = 1

    def _changed(self) -> None:
        if self._on_change is not None:
            self._on_change()

    # --- carga y consulta ----------------------------------------------------
    def load(self, orders: Iterable[Order]) -> None:
        """Restaura los pedidos desde el archivo (sin on_change).

        Vuelve a encolar los pendientes en orden de id y sigue numerando después del id más alto.
        """
        # Ordenamos por id con inserción, por si el archivo los trae desordenados.
        loaded: list[Order] = []
        for order in orders:
            position = len(loaded)
            while position > 0 and loaded[position - 1].id > order.id:
                position -= 1
            loaded.insert(position, order)

        self._orders = loaded
        self._pending = Queue()
        self._next_id = 1
        for order in self._orders:
            if order.status is OrderStatus.PENDING:
                self._pending.enqueue(order)
            if order.id >= self._next_id:
                self._next_id = order.id + 1

    def all_orders(self) -> list[Order]:
        """Todos los pedidos, por id ascendente."""
        return list(self._orders)

    # --- carrito -------------------------------------------------------------
    @staticmethod
    def _merge(items: Iterable[tuple[int, int]]) -> list[tuple[int, int]]:
        """Junta los códigos repetidos usando un Cart. quantity <= 0 -> ValidationError."""
        cart = Cart()
        for code, quantity in items:
            try:
                cart.add(code, quantity)
            except ValueError as exc:
                raise ValidationError(f"Invalid quantity for product {code}: {quantity}") from exc
        return cart.lines()

    def quote(self, items: Iterable[tuple[int, int]]) -> dict[str, Any]:
        """Cotiza un carrito SIN cambiar nada. `items` = [(código, cantidad), ...]; los códigos repetidos se suman.

        {
          "lines": [{"code", "name", "quantity", "unit_price", "subtotal"}, ...],   # las disponibles
          "total": 5000.0,                                                         # suma de las líneas
          "unavailable": [{"code", "requested", "available", "reason"}, ...]
        }
        reason = "not_found" (no existe o está inactivo, available 0) o "insufficient_stock".
        unit_price = product.final_price. quantity <= 0 -> ValidationError.
        """
        lines: list[dict[str, Any]] = []
        unavailable: list[dict[str, Any]] = []
        total = 0.0

        for code, quantity in self._merge(items):
            try:
                product = self._catalog.get(code)  # los inactivos dan ProductNotFound
            except ProductNotFound:
                unavailable.append({"code": code, "requested": quantity, "available": 0, "reason": "not_found"})
                continue
            if product.stock < quantity:
                unavailable.append(
                    {"code": code, "requested": quantity, "available": product.stock, "reason": "insufficient_stock"}
                )
                continue
            line = OrderItem(product.code, product.name, quantity, product.final_price)
            lines.append(line.to_dict())
            total += line.subtotal

        return {"lines": lines, "total": round(total, 2), "unavailable": unavailable}

    # --- compra --------------------------------------------------------------
    def place_order(self, customer_name: str, items: Iterable[tuple[int, int]]) -> Order:
        """Crea un pedido PENDING, reserva su stock y lo encola.

        - customer_name en blanco, sin items o quantity <= 0 -> ValidationError.
        - Producto inexistente o inactivo -> ProductNotFound.
        - Si a cualquier línea le falta stock -> InsufficientStock, y NO se toca ningún stock
          (revisar todas las líneas antes de reservar nada).
        - OrderItem.unit_price = product.final_price en este momento. Llamar a on_change.
        """
        if not isinstance(customer_name, str) or not customer_name.strip():
            raise ValidationError("Customer name is required")
        merged = self._merge(items)
        if not merged:
            raise ValidationError("The order needs at least one item")

        # 1) Validar TODAS las líneas antes de tocar el stock.
        order_items: list[OrderItem] = []
        for code, quantity in merged:
            product = self._catalog.get(code)  # ProductNotFound si no existe o está inactivo
            if product.stock < quantity:
                raise InsufficientStock(
                    f"Not enough stock for product {code}: requested {quantity}, available {product.stock}"
                )
            order_items.append(OrderItem(product.code, product.name, quantity, product.final_price))

        # 2) Reservar. Si algo fallara a mitad de camino, devolvemos lo ya reservado.
        reserved: list[OrderItem] = []
        try:
            for item in order_items:
                self._catalog.change_stock(item.code, -item.quantity)
                reserved.append(item)
        except Exception:
            for item in reserved:
                self._catalog.change_stock(item.code, item.quantity)
            raise

        # 3) Registrar el pedido en la lista y en la cola de pendientes.
        order = Order(self._next_id, customer_name, order_items)
        self._next_id += 1
        self._orders.append(order)
        self._pending.enqueue(order)
        self._changed()
        return order

    # --- seguimiento ---------------------------------------------------------
    def get(self, order_id: int) -> Order:
        """OrderNotFound si no existe.

        Búsqueda binaria sobre self._orders (está ordenada por id).
        """
        low, high = 0, len(self._orders) - 1
        while low <= high:
            middle = (low + high) // 2
            current = self._orders[middle]
            if current.id == order_id:
                return current
            if current.id < order_id:
                low = middle + 1
            else:
                high = middle - 1
        raise OrderNotFound(f"Order {order_id} not found")

    def list_orders(self, status: str | None = None) -> list[Order]:
        """Todos los pedidos (por id ascendente), o solo los que tienen `status`. Estado inválido -> ValidationError."""
        if status is None:
            return self.all_orders()
        try:
            wanted = OrderStatus(status)
        except ValueError as exc:
            raise ValidationError(f"Invalid order status: {status}") from exc
        return [order for order in self._orders if order.status is wanted]

    def pending_count(self) -> int:
        return len(self._pending)

    # --- administración ------------------------------------------------------
    def complete_next(self) -> Order:
        """Desencola el pedido pendiente más viejo y lo marca COMPLETED. NoPendingOrders si no hay. on_change."""
        if self._pending.is_empty():
            raise NoPendingOrders("There are no pending orders")
        order = self._pending.dequeue()
        order.status = OrderStatus.COMPLETED  # el stock ya se había reservado al comprar
        self._changed()
        return order

    def cancel(self, order_id: int) -> Order:
        """Cancela un pedido PENDING: lo saca de la cola y devuelve su stock.

        OrderNotFound; si no está pendiente -> InvalidOrderState. Si mientras tanto
        se borró un producto, se saltea su stock. Llamar a on_change.
        """
        order = self.get(order_id)
        if order.status is not OrderStatus.PENDING:
            raise InvalidOrderState(f"Order {order_id} is {order.status.value}, only pending orders can be cancelled")

        self._pending.remove_first(lambda queued: queued.id == order_id)
        for item in order.items:
            try:
                self._catalog.change_stock(item.code, item.quantity)
            except ProductNotFound:
                # El producto se borró del catálogo: el stock queda guardado por si se deshace la baja.
                self._catalog.return_stock_to_deleted(item.code, item.quantity)
        order.status = OrderStatus.CANCELLED
        self._changed()
        return order
