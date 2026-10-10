"""Formas de response de reportes y configuración (Flujo 5). Parte del contrato — ya implementado."""

from pydantic import BaseModel, ConfigDict, Field


class OrderCountsOut(BaseModel):
    pending: int
    completed: int
    cancelled: int


class SummaryOut(BaseModel):
    revenue: float
    orders: OrderCountsOut
    average_ticket: float
    inventory_value: float
    product_count: int


class BestSellerOut(BaseModel):
    code: int
    name: str
    units_sold: int
    revenue: float


class CategoryStatsOut(BaseModel):
    path: str
    product_count: int
    stock_value: float


class CategoriesReportOut(BaseModel):
    tree_depth: int
    bst_height_by_code: int
    bst_height_by_name: int
    categories: list[CategoryStatsOut]


class TermCountOut(BaseModel):
    term: str
    count: int


class SearchesReportOut(BaseModel):
    recent: list[str]
    top_terms: list[TermCountOut]


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    store_name: str
    currency: str
    default_min_stock: int
    search_history_size: int


class SettingsUpdate(BaseModel):
    """Solo cambian los campos enviados (model_dump(exclude_unset=True))."""

    model_config = ConfigDict(extra="forbid")

    store_name: str | None = Field(default=None, min_length=1)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    default_min_stock: int | None = Field(default=None, ge=0)
    search_history_size: int | None = Field(default=None, ge=1, le=100)
