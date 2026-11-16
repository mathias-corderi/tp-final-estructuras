"""Endpoints de reportes y exportación — FLUJO 5. Requieren X-Admin-Token (ya está conectado).
Tests: tests/api/test_reports_api.py
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse

from store.api.deps import get_container, require_admin
from store.api.schemas.products import ProductOut
from store.api.schemas.reports import (
    BestSellerOut,
    CategoriesReportOut,
    SearchesReportOut,
    SummaryOut,
)
from store.container import Container

router = APIRouter(prefix="/admin", tags=["admin: reports"], dependencies=[Depends(require_admin)])


@router.get("/reports/summary", response_model=SummaryOut)
def sales_summary(c: Container = Depends(get_container)):
    """Facturación, pedidos por estado, ticket promedio y valor del inventario."""
    return c.reports.summary()


@router.get("/reports/best-sellers", response_model=list[BestSellerOut])
def best_sellers(limit: int = Query(default=10, ge=1), c: Container = Depends(get_container)):
    """Productos ordenados por unidades vendidas en pedidos completados."""
    return c.reports.best_sellers(limit)


@router.get("/reports/low-stock", response_model=list[ProductOut])
def low_stock(c: Container = Depends(get_container)):
    """Productos activos con stock en el mínimo o por debajo: lo que hay que reponer."""
    return c.reports.low_stock()


@router.get("/reports/categories", response_model=CategoriesReportOut)
def categories_report(c: Container = Depends(get_container)):
    """Productos y valor de stock por categoría, más la profundidad del árbol y la altura de los BST."""
    return c.reports.categories()


@router.get("/reports/searches", response_model=SearchesReportOut)
def searches_report(c: Container = Depends(get_container)):
    """Últimas búsquedas de los clientes y los términos más buscados."""
    return c.reports.searches()


@router.get("/export/catalog", response_class=PlainTextResponse)
def export_catalog(c: Container = Depends(get_container)):
    """El catálogo ordenado por nombre, en texto plano."""
    return c.reports.export_catalog()
