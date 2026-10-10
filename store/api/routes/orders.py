"""Endpoints públicos del carrito y los pedidos — FLUJO 4.
Tests: tests/api/test_orders_api.py
"""

from fastapi import APIRouter, Depends

from store.api.deps import get_container
from store.api.schemas.orders import OrderIn, OrderOut, QuoteIn, QuoteOut
from store.container import Container

router = APIRouter(tags=["orders"])


@router.post("/cart/quote", response_model=QuoteOut)
def quote_cart(body: QuoteIn, c: Container = Depends(get_container)):
    """Cotiza un carrito sin comprar: líneas con descuentos aplicados, total y lo que no está disponible."""
    raise NotImplementedError("Flow 4: POST /cart/quote")


@router.post("/orders", response_model=OrderOut, status_code=201)
def place_order(body: OrderIn, c: Container = Depends(get_container)):
    """Comprar: crea un pedido PENDING y reserva su stock. 409 falta stock, 404 producto inexistente."""
    raise NotImplementedError("Flow 4: POST /orders")


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, c: Container = Depends(get_container)):
    """Estado del pedido, para que el cliente lo siga. 404 si no existe."""
    raise NotImplementedError("Flow 4: GET /orders/{order_id}")
