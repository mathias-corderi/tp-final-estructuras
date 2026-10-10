"""Endpoints de administración de categorías — FLUJO 3. Requieren X-Admin-Token (ya está conectado).
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
    """Crea una categoría y los padres que falten. 409 si ya existe, 422 ruta inválida."""
    raise NotImplementedError("Flow 3: POST /admin/categories")


@router.patch("", response_model=CategoryNodeOut)
def rename_category(body: CategoryRename, c: Container = Depends(get_container)):
    """Renombra una categoría; se actualiza la `category` de sus productos. 404 / 409 hermano con ese nombre / 422."""
    raise NotImplementedError("Flow 3: PATCH /admin/categories")


@router.delete("", status_code=204, response_class=Response)
def delete_category(path: str = Query(), c: Container = Depends(get_container)):
    """Elimina una categoría VACÍA. 409 si tiene productos o subcategorías, 404 si no existe."""
    raise NotImplementedError("Flow 3: DELETE /admin/categories")


@router.post("/price-adjustment", response_model=PriceAdjustmentOut)
def adjust_category_prices(body: PriceAdjustmentIn, c: Container = Depends(get_container)):
    """Cambia en `percent` el precio de todos los productos del subárbol. Devuelve los productos actualizados."""
    raise NotImplementedError("Flow 3: POST /admin/categories/price-adjustment")
