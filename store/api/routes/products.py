"""Endpoints públicos del catálogo — FLUJO 1 (navegación y búsqueda del catálogo).

Cómo escribir el cuerpo de una ruta: tomá lo que necesites de `c` (el Container),
llamá al servicio y devolvé el objeto del dominio (FastAPI lo convierte con el
response_model). No atrapes StoreError: app.py lo convierte en 404/409/422.
El docstring de cada ruta se muestra en /docs.
El orden de declaración importa: /search y /compare-search tienen que quedar arriba de /{code}.
Tests: tests/api/test_catalog_api.py
"""

from typing import Literal

from fastapi import APIRouter, Depends, Query

from store.api.deps import get_container
from store.api.schemas.products import CompareSearchOut, ProductOut, SearchOut
from store.container import Container

router = APIRouter(prefix="/products", tags=["catalog"])


@router.get("", response_model=list[ProductOut])
def list_products(
    sort: Literal["code", "name"] = "code",
    c: Container = Depends(get_container),
):
    """Productos activos ordenados por código o por nombre (recorrido inorden del BST)."""
    raise NotImplementedError("Flow 1: GET /products")


@router.get("/search", response_model=SearchOut)
def search_products(
    name: str | None = Query(default=None, description="Parte del nombre, sin distinguir mayúsculas"),
    brand: str | None = Query(default=None, description="Parte de la marca, sin distinguir mayúsculas"),
    c: Container = Depends(get_container),
):
    """Búsqueda secuencial en la lista de productos, devolviendo cuántas comparaciones hizo.

    Al menos un criterio (si no, 422). Si llegan los dos, los productos tienen que cumplir ambos.
    Cada criterio recibido se registra en el historial de búsquedas: c.search_history.record(name)
    y después c.search_history.record(brand).
    """
    raise NotImplementedError("Flow 1: GET /products/search")


@router.get("/compare-search", response_model=CompareSearchOut)
def compare_search(code: int, c: Container = Depends(get_container)):
    """Busca el mismo código en la lista y en el BST y devuelve las comparaciones de cada uno."""
    raise NotImplementedError("Flow 1: GET /products/compare-search")


@router.get("/{code}", response_model=ProductOut)
def get_product(code: int, c: Container = Depends(get_container)):
    """Un producto activo, buscado con el BST. 404 si no existe o está inactivo."""
    raise NotImplementedError("Flow 1: GET /products/{code}")
