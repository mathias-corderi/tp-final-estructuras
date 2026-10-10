"""Formas de request/response de categorías (Flujo 3). Parte del contrato — ya implementado."""

from pydantic import BaseModel, Field

from store.api.schemas.products import ProductOut


class CategoryNodeOut(BaseModel):
    name: str
    path: str
    product_count: int
    children: list["CategoryNodeOut"] = []


class CategoryCreate(BaseModel):
    path: str = Field(min_length=1, examples=["Electronics/Phones/Android"])


class CategoryRename(BaseModel):
    path: str = Field(examples=["Grocery/Snacks"])
    new_name: str = Field(min_length=1, examples=["Treats"])


class PriceAdjustmentIn(BaseModel):
    path: str = Field(examples=["Grocery/Drinks"])
    percent: float = Field(ge=-90, le=500, description="Distinto de 0. 10 = +10 %, -15 = -15 %")


class PriceAdjustmentOut(BaseModel):
    updated: list[ProductOut]
