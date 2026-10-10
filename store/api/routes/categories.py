"""Endpoints públicos de categorías — FLUJO 3.
Tests: tests/api/test_categories_api.py
"""

from fastapi import APIRouter, Depends, Query

from store.api.deps import get_container
from store.api.schemas.categories import CategoryNodeOut
from store.api.schemas.products import ProductOut
from store.container import Container

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=CategoryNodeOut)
def get_category_tree(c: Container = Depends(get_container)):
    """El árbol de categorías completo, anidado, con la cantidad de productos activos debajo de cada nodo."""
    raise NotImplementedError("Flow 3: GET /categories")


@router.get("/products", response_model=list[ProductOut])
def products_in_category(
    path: str = Query(examples=["Grocery/Drinks"]),
    include_subcategories: bool = True,
    c: Container = Depends(get_container),
):
    """Productos activos de una categoría (y sus subcategorías, en preorden). 404 si la ruta no existe."""
    raise NotImplementedError("Flow 3: GET /categories/products")
