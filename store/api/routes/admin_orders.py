"""Order administration endpoints — FLOW 4. Require X-Admin-Token (already wired).
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
    """Every order (id ascending), optionally filtered by status."""
    raise NotImplementedError("Flow 4: GET /admin/orders")


@router.post("/next/complete", response_model=OrderOut)
def complete_next_order(c: Container = Depends(get_container)):
    """Complete the OLDEST pending order (queue). 409 if there are no pending orders."""
    raise NotImplementedError("Flow 4: POST /admin/orders/next/complete")


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, c: Container = Depends(get_container)):
    """Cancel a pending order and give its stock back. 404 missing, 409 not pending."""
    raise NotImplementedError("Flow 4: POST /admin/orders/{order_id}/cancel")
