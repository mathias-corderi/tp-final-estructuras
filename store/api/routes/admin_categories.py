"""Category administration endpoints — FLOW 3. Require X-Admin-Token (already wired).
Tests: tests/api/test_categories_api.py
"""

from fastapi import APIRouter, Depends, Query, Response

from store.api.deps import get_container, require_admin
from store.api.schemas.categories import (
    CategoryCreate,
    CategoryNodeOut,
    CategoryRename,
    PriceAdjustmentIn,
    PriceAdjustmentOut,
)
from store.container import Container

router = APIRouter(
    prefix="/admin/categories", tags=["admin: categories"], dependencies=[Depends(require_admin)]
)


@router.post("", response_model=CategoryNodeOut, status_code=201)
def create_category(body: CategoryCreate, c: Container = Depends(get_container)):
    """Create a category, plus any missing parent. 409 if it exists, 422 invalid path."""
    raise NotImplementedError("Flow 3: POST /admin/categories")


@router.patch("", response_model=CategoryNodeOut)
def rename_category(body: CategoryRename, c: Container = Depends(get_container)):
    """Rename a category; its products' `category` paths are updated. 404 / 409 sibling exists / 422."""
    raise NotImplementedError("Flow 3: PATCH /admin/categories")


@router.delete("", status_code=204, response_class=Response)
def delete_category(path: str = Query(), c: Container = Depends(get_container)):
    """Delete an EMPTY category. 409 if it has products or subcategories, 404 if missing."""
    raise NotImplementedError("Flow 3: DELETE /admin/categories")


@router.post("/price-adjustment", response_model=PriceAdjustmentOut)
def adjust_category_prices(body: PriceAdjustmentIn, c: Container = Depends(get_container)):
    """Change by `percent` the price of every product in the category subtree. Returns the updated products."""
    raise NotImplementedError("Flow 3: POST /admin/categories/price-adjustment")
