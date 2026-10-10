"""Public catalog endpoints — FLOW 1 (catalog browsing and search).

How to write a route body: get what you need from `c` (the Container), call
the service, and return the domain object (FastAPI converts it with the
response_model). Don't catch StoreError: app.py turns it into 404/409/422.
The docstring of each route is shown in /docs.
Declaration order matters: /search and /compare-search must stay above /{code}.
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
    """Active products sorted by code or name (BST inorder traversal)."""
    raise NotImplementedError("Flow 1: GET /products")


@router.get("/search", response_model=SearchOut)
def search_products(
    name: str | None = Query(default=None, description="Substring of the name, case-insensitive"),
    brand: str | None = Query(default=None, description="Substring of the brand, case-insensitive"),
    c: Container = Depends(get_container),
):
    """Sequential search over the product list, returning how many comparisons it took.

    At least one criterion (422 otherwise). If both are given, products must match both.
    Every criterion received is recorded in the search history: c.search_history.record(name),
    then c.search_history.record(brand).
    """
    raise NotImplementedError("Flow 1: GET /products/search")


@router.get("/compare-search", response_model=CompareSearchOut)
def compare_search(code: int, c: Container = Depends(get_container)):
    """Look the same code up in the list and in the BST and report both comparison counts."""
    raise NotImplementedError("Flow 1: GET /products/compare-search")


@router.get("/{code}", response_model=ProductOut)
def get_product(code: int, c: Container = Depends(get_container)):
    """One active product, found through the BST. 404 if missing or inactive."""
    raise NotImplementedError("Flow 1: GET /products/{code}")
