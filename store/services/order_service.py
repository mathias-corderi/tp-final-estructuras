"""Servicio de pedidos — FLUJO 4 (carrito y pedidos).

Vida de un pedido:
    el cliente lo hace      -> PENDING (stock reservado, pedido encolado)
    el dueño lo completa    -> COMPLETED (siempre el pendiente MÁS VIEJO: cola FIFO)
    el dueño lo cancela     -> CANCELLED (se devuelve el stock y sale de la cola)

Guardar todos los pedidos en una lista (por id ascendente) y los pendientes
TAMBIÉN en una Queue (store/structures/linked_queue.py). Los ids empiezan en 1
y nunca se repiten. Los cambios de stock pasan por catalog.change_stock(code, delta).
"""

from typing import Any, Callable, Iterable

from store.models.order import Order
from store.services.catalog_service import CatalogService


class OrderService:
    def __init__(self, catalog: CatalogService, on_change: Callable[[], None] | None = None) -> None:
        raise NotImplementedError("Flow 4: OrderService.__init__")

    def load(self, orders: Iterable[Order]) -> None:
        """Restaura los pedidos desde el archivo (sin on_change).

        Vuelve a encolar los pendientes en orden de id y sigue numerando después del id más alto.
        """
        raise NotImplementedError("Flow 4: OrderService.load")

    def all_orders(self) -> list[Order]:
        """Todos los pedidos, por id ascendente."""
        raise NotImplementedError("Flow 4: OrderService.all_orders")

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
        raise NotImplementedError("Flow 4: OrderService.quote")

    def place_order(self, customer_name: str, items: Iterable[tuple[int, int]]) -> Order:
        """Crea un pedido PENDING, reserva su stock y lo encola.

        - customer_name en blanco, sin items o quantity <= 0 -> ValidationError.
        - Producto inexistente o inactivo -> ProductNotFound.
        - Si a cualquier línea le falta stock -> InsufficientStock, y NO se toca ningún stock
          (revisar todas las líneas antes de reservar nada).
        - OrderItem.unit_price = product.final_price en este momento. Llamar a on_change.
        """
        raise NotImplementedError("Flow 4: OrderService.place_order")

    def get(self, order_id: int) -> Order:
        """OrderNotFound si no existe."""
        raise NotImplementedError("Flow 4: OrderService.get")

    def list_orders(self, status: str | None = None) -> list[Order]:
        """Todos los pedidos (por id ascendente), o solo los que tienen `status`. Estado inválido -> ValidationError."""
        raise NotImplementedError("Flow 4: OrderService.list_orders")

    def pending_count(self) -> int:
        raise NotImplementedError("Flow 4: OrderService.pending_count")

    def complete_next(self) -> Order:
        """Desencola el pedido pendiente más viejo y lo marca COMPLETED. NoPendingOrders si no hay. on_change."""
        raise NotImplementedError("Flow 4: OrderService.complete_next")

    def cancel(self, order_id: int) -> Order:
        """Cancela un pedido PENDING: lo saca de la cola y devuelve su stock.

        OrderNotFound; si no está pendiente -> InvalidOrderState. Si mientras tanto
        se borró un producto, se saltea su stock. Llamar a on_change.
        """
        raise NotImplementedError("Flow 4: OrderService.cancel")
