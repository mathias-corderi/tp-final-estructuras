"""Order service — FLOW 4 (cart and orders).

Life of an order:
    customer places it  -> PENDING (stock reserved, order enqueued)
    owner completes it  -> COMPLETED (always the OLDEST pending one: FIFO queue)
    owner cancels it    -> CANCELLED (stock returned, removed from the queue)

Keep every order in a list (id ascending) and the pending ones ALSO in a
Queue (store/structures/linked_queue.py). Ids start at 1 and never repeat.
Stock changes go through catalog.change_stock(code, delta).
"""

from typing import Any, Callable, Iterable

from store.models.order import Order
from store.services.catalog_service import CatalogService


class OrderService:
    def __init__(self, catalog: CatalogService, on_change: Callable[[], None] | None = None) -> None:
        raise NotImplementedError("Flow 4: OrderService.__init__")

    def load(self, orders: Iterable[Order]) -> None:
        """Restore orders from storage (no on_change).

        Re-enqueue the pending ones in id order and continue ids after the highest one.
        """
        raise NotImplementedError("Flow 4: OrderService.load")

    def all_orders(self) -> list[Order]:
        """Every order, id ascending."""
        raise NotImplementedError("Flow 4: OrderService.all_orders")

    def quote(self, items: Iterable[tuple[int, int]]) -> dict[str, Any]:
        """Price a cart WITHOUT changing anything. `items` = [(code, quantity), ...]; repeated codes merge.

        {
          "lines": [{"code", "name", "quantity", "unit_price", "subtotal"}, ...],   # available ones
          "total": 5000.0,                                                         # sum of lines
          "unavailable": [{"code", "requested", "available", "reason"}, ...]
        }
        reason = "not_found" (missing or inactive, available 0) or "insufficient_stock".
        unit_price = product.final_price. quantity <= 0 -> ValidationError.
        """
        raise NotImplementedError("Flow 4: OrderService.quote")

    def place_order(self, customer_name: str, items: Iterable[tuple[int, int]]) -> Order:
        """Create a PENDING order, reserve its stock and enqueue it.

        - Blank customer_name, no items or quantity <= 0 -> ValidationError.
        - Missing or inactive product -> ProductNotFound.
        - Any line without enough stock -> InsufficientStock, and NO stock is touched
          (check every line before reserving anything).
        - OrderItem.unit_price = product.final_price at this moment. Call on_change.
        """
        raise NotImplementedError("Flow 4: OrderService.place_order")

    def get(self, order_id: int) -> Order:
        """OrderNotFound if missing."""
        raise NotImplementedError("Flow 4: OrderService.get")

    def list_orders(self, status: str | None = None) -> list[Order]:
        """All orders (id ascending), or only those with `status`. Invalid status -> ValidationError."""
        raise NotImplementedError("Flow 4: OrderService.list_orders")

    def pending_count(self) -> int:
        raise NotImplementedError("Flow 4: OrderService.pending_count")

    def complete_next(self) -> Order:
        """Dequeue the oldest pending order and mark it COMPLETED. NoPendingOrders if none. on_change."""
        raise NotImplementedError("Flow 4: OrderService.complete_next")

    def cancel(self, order_id: int) -> Order:
        """Cancel a PENDING order: remove it from the queue and give its stock back.

        OrderNotFound; not pending -> InvalidOrderState. If a product was deleted
        meanwhile, skip its stock. Call on_change.
        """
        raise NotImplementedError("Flow 4: OrderService.cancel")
