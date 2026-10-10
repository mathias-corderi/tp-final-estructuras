"""Product administration endpoints — FLOW 2. Require X-Admin-Token (already wired).

Tip: for PATCH use `body.model_dump(exclude_unset=True)` to get only the fields sent.
Tests: tests/api/test_products_admin_api.py
"""

from typing import Literal

from fastapi import APIRouter, Depends, Response

from store.api.deps import get_container, require_admin
from store.api.schemas.products import (
    OperationOut,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    RestockIn,
    StockAdjustmentIn,
    UndoOut,
)
from store.container import Container

router = APIRouter(prefix="/admin", tags=["admin: products"], dependencies=[Depends(require_admin)])


@router.get("/products", response_model=list[ProductOut])
def list_all_products(
    sort: Literal["code", "name"] = "code",
    c: Container = Depends(get_container),
):
    """Every product, INCLUDING inactive ones, sorted by code or name."""
    raise NotImplementedError("Flow 2: GET /admin/products")


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(body: ProductCreate, c: Container = Depends(get_container)):
    """Add a product. 409 duplicate code, 404 unknown category, 422 invalid data."""
    raise NotImplementedError("Flow 2: POST /admin/products")


@router.patch("/products/{code}", response_model=ProductOut)
def update_product(code: int, body: ProductUpdate, c: Container = Depends(get_container)):
    """Change some fields (name, brand, price, category, min_stock, discount_percent, active).

    404 unknown product or category, 422 empty body or invalid value (nothing changes).
    """
    raise NotImplementedError("Flow 2: PATCH /admin/products/{code}")


@router.delete("/products/{code}", status_code=204, response_class=Response)
def delete_product(code: int, c: Container = Depends(get_container)):
    """Remove a product from every structure. 404 if missing. Returns no body."""
    raise NotImplementedError("Flow 2: DELETE /admin/products/{code}")


@router.post("/products/{code}/restock", response_model=ProductOut)
def restock_product(code: int, body: RestockIn, c: Container = Depends(get_container)):
    """Add `quantity` units to the stock."""
    raise NotImplementedError("Flow 2: POST /admin/products/{code}/restock")


@router.post("/products/{code}/stock-adjustment", response_model=ProductOut)
def adjust_stock(code: int, body: StockAdjustmentIn, c: Container = Depends(get_container)):
    """Correct the stock by `delta` (e.g. -2 broken units). 409 if it would go below 0."""
    raise NotImplementedError("Flow 2: POST /admin/products/{code}/stock-adjustment")


@router.post("/undo", response_model=UndoOut)
def undo_last_operation(c: Container = Depends(get_container)):
    """Revert the last catalog operation (stack). 409 if there is nothing to undo."""
    raise NotImplementedError("Flow 2: POST /admin/undo")


@router.get("/undo/history", response_model=list[OperationOut])
def undo_history(c: Container = Depends(get_container)):
    """Operations that can still be undone, most recent first."""
    raise NotImplementedError("Flow 2: GET /admin/undo/history")
