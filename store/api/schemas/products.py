"""Formas de request/response de productos (Flujos 1 y 2). Parte del contrato — ya implementado.

Los modelos de salida usan from_attributes=True, así una ruta puede devolver el
objeto del dominio (un Product, una Operation) y FastAPI lee sus propiedades.
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
    min_stock: int | None = Field(default=None, ge=0, description="Por defecto, el default_min_stock de la tienda")
    discount_percent: float = Field(default=0, ge=0, le=90)
    active: bool = True


class ProductUpdate(BaseModel):
    """Solo cambian los campos enviados (usar model_dump(exclude_unset=True)). `code` y `stock` no se cambian acá."""

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
    delta: int = Field(description="Unidades a sumar (positivo) o restar (negativo); distinto de 0")
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
