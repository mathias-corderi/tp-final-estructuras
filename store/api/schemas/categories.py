"""Request/response shapes for categories (Flow 3). Part of the contract — already implemented."""

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
    percent: float = Field(ge=-90, le=500, description="Not 0. 10 = +10 %, -15 = -15 %")


class PriceAdjustmentOut(BaseModel):
    updated: list[ProductOut]
