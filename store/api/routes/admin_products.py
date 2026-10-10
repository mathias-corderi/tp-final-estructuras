"""Endpoints de administración de productos — FLUJO 2. Requieren X-Admin-Token (ya está conectado).

Tip: en el PATCH usá `body.model_dump(exclude_unset=True)` para obtener solo los campos enviados.
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
    """Todos los productos, INCLUIDOS los inactivos, ordenados por código o por nombre."""
    raise NotImplementedError("Flow 2: GET /admin/products")


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(body: ProductCreate, c: Container = Depends(get_container)):
    """Da de alta un producto. 409 código duplicado, 404 categoría inexistente, 422 datos inválidos."""
    raise NotImplementedError("Flow 2: POST /admin/products")


@router.patch("/products/{code}", response_model=ProductOut)
def update_product(code: int, body: ProductUpdate, c: Container = Depends(get_container)):
    """Cambia algunos campos (name, brand, price, category, min_stock, discount_percent, active).

    404 producto o categoría inexistente, 422 body vacío o valor inválido (no cambia nada).
    """
    raise NotImplementedError("Flow 2: PATCH /admin/products/{code}")


@router.delete("/products/{code}", status_code=204, response_class=Response)
def delete_product(code: int, c: Container = Depends(get_container)):
    """Saca el producto de todas las estructuras. 404 si no existe. No devuelve body."""
    raise NotImplementedError("Flow 2: DELETE /admin/products/{code}")


@router.post("/products/{code}/restock", response_model=ProductOut)
def restock_product(code: int, body: RestockIn, c: Container = Depends(get_container)):
    """Suma `quantity` unidades al stock."""
    raise NotImplementedError("Flow 2: POST /admin/products/{code}/restock")


@router.post("/products/{code}/stock-adjustment", response_model=ProductOut)
def adjust_stock(code: int, body: StockAdjustmentIn, c: Container = Depends(get_container)):
    """Corrige el stock en `delta` (por ejemplo -2 unidades rotas). 409 si quedaría por debajo de 0."""
    raise NotImplementedError("Flow 2: POST /admin/products/{code}/stock-adjustment")


@router.post("/undo", response_model=UndoOut)
def undo_last_operation(c: Container = Depends(get_container)):
    """Revierte la última operación del catálogo (pila). 409 si no hay nada para deshacer."""
    raise NotImplementedError("Flow 2: POST /admin/undo")


@router.get("/undo/history", response_model=list[OperationOut])
def undo_history(c: Container = Depends(get_container)):
    """Operaciones que todavía se pueden deshacer, la más reciente primero."""
    raise NotImplementedError("Flow 2: GET /admin/undo/history")
