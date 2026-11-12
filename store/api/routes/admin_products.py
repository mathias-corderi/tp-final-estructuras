from typing import Literal

from fastapi import APIRouter, Depends, HTTPException

from store.api.deps import get_container, require_admin
from store.errors import (
    DuplicateCode,
    CategoryNotFound,
    ValidationError,
    ProductNotFound,
    InsufficientStock,
    NothingToUndo,
)
from store.container import Container

router = APIRouter(prefix="/admin", tags=["Admin: products"], dependencies=[Depends(require_admin)])


@router.get("/products", response_model=list[dict])
def list_products(
    sort: Literal["code", "name"] = "code",
    container: Container = Depends(get_container),
):
    """Todos los productos, INCLUIDOS los inactivos, ordenados por código o por nombre."""
    try:
        products = container.catalog.list_products(sort=sort, include_inactive=True)
        return [p.to_dict() for p in products]
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/products", response_model=dict, status_code=201)
def create_product(body: dict, container: Container = Depends(get_container)):
    """Da de alta un producto. 409 código duplicado, 404 categoría inexistente, 422 datos inválidos."""
    try:
        product = container.catalog.add(body)
        return product.to_dict()
    except DuplicateCode as e:
        raise HTTPException(status_code=409, detail=str(e))
    except CategoryNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.patch("/products/{code}", response_model=dict)
def update_product(code: int, body: dict, container: Container = Depends(get_container)):
    """Cambia algunos campos (name, brand, price, category, min_stock, discount_percent, active)."""
    try:
        product = container.catalog.update(code, body)
        return product.to_dict()
    except ProductNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except CategoryNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/products/{code}", status_code=204)
def delete_product(code: int, container: Container = Depends(get_container)):
    """Da de baja un producto. 404 si no existe. 204 no devuelve body."""
    try:
        container.catalog.delete(code)
    except ProductNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/products/{code}/restock", response_model=dict)
def restock(code: int, body: dict, container: Container = Depends(get_container)):
    """Suma `quantity` unidades al stock."""
    quantity = body.get("quantity")
    try:
        product = container.catalog.restock(code, quantity)
        return product.to_dict()
    except ProductNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/products/{code}/stock-adjustment", response_model=dict)
def adjust_stock(code: int, body: dict, container: Container = Depends(get_container)):
    """Corrige el stock (ej. rotura). 409 si quedaría por debajo de 0."""
    delta = body.get("delta")
    reason = body.get("reason")
    try:
        product = container.catalog.adjust_stock(code, delta, reason)
        return product.to_dict()
    except ProductNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InsufficientStock as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/undo", response_model=dict)
def undo(container: Container = Depends(get_container)):
    """Revierte la última operación del catálogo (pila). 409 si no hay nada para deshacer."""
    try:
        op = container.catalog.undo()
        return op.to_dict()
    except NothingToUndo as e:
        raise HTTPException(status_code=409, detail=str(e))
    except (ProductNotFound, InsufficientStock) as e:
        # Si al revertir falla por otra regla de negocio, lo tratamos como conflicto
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/undo/history", response_model=list[dict])
def undo_history(container: Container = Depends(get_container)):
    """Operaciones que todavía se pueden deshacer, la más reciente primero."""
    ops = container.catalog.undo_history()
    return [op.to_dict() for op in ops]