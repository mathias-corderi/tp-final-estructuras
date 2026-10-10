"""Request/response shapes for products (Flows 1 and 2). Part of the contract — already implemented.

Output models use from_attributes=True, so a route can return the domain
object (a Product, an Operation) and FastAPI reads its properties.
"""

from pydantic import BaseModel, ConfigDict, Field


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: int
    name: str
    brand: str
    price: float
    final_price: float
    stock: int
    category: str
    min_stock: int
    discount_percent: float
    active: bool


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: int = Field(gt=0)
    name: str = Field(min_length=1)
    brand: str = Field(min_length=1)
    price: float = Field(gt=0)
    stock: int = Field(default=0, ge=0)
    category: str = Field(min_length=1)
    min_stock: int | None = Field(default=None, ge=0, description="Defaults to the store's default_min_stock")
    discount_percent: float = Field(default=0, ge=0, le=90)
    active: bool = True


class ProductUpdate(BaseModel):
    """Only the fields sent are changed (use model_dump(exclude_unset=True)). `code` and `stock` can't be changed here."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    brand: str | None = None
    price: float | None = Field(default=None, gt=0)
    category: str | None = None
    min_stock: int | None = Field(default=None, ge=0)
    discount_percent: float | None = Field(default=None, ge=0, le=90)
    active: bool | None = None


class RestockIn(BaseModel):
    quantity: int = Field(gt=0)


class StockAdjustmentIn(BaseModel):
    delta: int = Field(description="Units to add (positive) or remove (negative); not 0")
    reason: str = Field(min_length=1)


class SearchOut(BaseModel):
    results: list[ProductOut]
    comparisons: int


class CompareSearchOut(BaseModel):
    code: int
    found: bool
    list_comparisons: int
    tree_comparisons: int


class OperationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: str
    code: int
    description: str


class UndoOut(BaseModel):
    undone: OperationOut
