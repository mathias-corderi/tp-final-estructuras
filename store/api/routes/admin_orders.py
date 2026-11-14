"""Endpoints de administración de pedidos — FLUJO 4. Requieren X-Admin-Token (ya está conectado).
Tests: tests/api/test_orders_api.py
"""

from fastapi import APIRouter, Depends

from store.api.deps import get_container, require_admin
from store.api.schemas.orders import OrderOut
from store.container import Container
from store.models.order import OrderStatus

router = APIRouter(prefix="/admin/orders", tags=["admin: orders"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[OrderOut])
def list_orders(status: OrderStatus | None = None, c: Container = Depends(get_container)):
    """Todos los pedidos (por id ascendente), opcionalmente filtrados por estado."""
    return c.orders.list_orders(status.value if status is not None else None)


@router.post("/next/complete", response_model=OrderOut)
def complete_next_order(c: Container = Depends(get_container)):
    """Completa el pedido pendiente MÁS VIEJO (cola). 409 si no hay pendientes."""
    return c.orders.complete_next()


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, c: Container = Depends(get_container)):
    """Cancela un pedido pendiente y devuelve su stock. 404 no existe, 409 no está pendiente."""
    return c.orders.cancel(order_id)
