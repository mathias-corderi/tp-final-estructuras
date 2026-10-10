"""Request/response shapes for the cart and orders (Flow 4). Part of the contract — already implemented."""

from pydantic import BaseModel, ConfigDict, Field

from store.models.order import OrderStatus


class CartItemIn(BaseModel):
    code: int
    quantity: int = Field(gt=0)


class QuoteIn(BaseModel):
    items: list[CartItemIn] = Field(min_length=1)

    def as_tuples(self) -> list[tuple[int, int]]:
        return [(item.code, item.quantity) for item in self.items]


class QuoteLineOut(BaseModel):
    code: int
    name: str
    quantity: int
    unit_price: float
    subtotal: float


class UnavailableOut(BaseModel):
    code: int
    requested: int
    available: int
    reason: str


class QuoteOut(BaseModel):
    lines: list[QuoteLineOut]
    total: float
    unavailable: list[UnavailableOut]


class OrderIn(QuoteIn):
    customer_name: str = Field(min_length=1)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: int
    name: str
    quantity: int
    unit_price: float
    subtotal: float


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_name: str
    status: OrderStatus
    created_at: str
    items: list[OrderItemOut]
    total: float
