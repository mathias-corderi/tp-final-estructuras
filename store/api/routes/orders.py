"""Public cart and order endpoints — FLOW 4.
Tests: tests/api/test_orders_api.py
"""

from fastapi import APIRouter, Depends

from store.api.deps import get_container
from store.api.schemas.orders import OrderIn, OrderOut, QuoteIn, QuoteOut
from store.container import Container

router = APIRouter(tags=["orders"])


@router.post("/cart/quote", response_model=QuoteOut)
def quote_cart(body: QuoteIn, c: Container = Depends(get_container)):
    """Price a cart without buying: lines with discounts applied, total, and what is unavailable."""
    raise NotImplementedError("Flow 4: POST /cart/quote")


@router.post("/orders", response_model=OrderOut, status_code=201)
def place_order(body: OrderIn, c: Container = Depends(get_container)):
    """Buy: creates a PENDING order and reserves its stock. 409 not enough stock, 404 unknown product."""
    raise NotImplementedError("Flow 4: POST /orders")


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, c: Container = Depends(get_container)):
    """Order status, so the customer can track it. 404 if missing."""
    raise NotImplementedError("Flow 4: GET /orders/{order_id}")
