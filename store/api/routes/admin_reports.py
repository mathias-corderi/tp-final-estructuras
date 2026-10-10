"""Reports and export endpoints — FLOW 5. Require X-Admin-Token (already wired).
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
    """Revenue, orders by status, average ticket and inventory value."""
    raise NotImplementedError("Flow 5: GET /admin/reports/summary")


@router.get("/reports/best-sellers", response_model=list[BestSellerOut])
def best_sellers(limit: int = Query(default=10, ge=1), c: Container = Depends(get_container)):
    """Products ranked by units sold in completed orders."""
    raise NotImplementedError("Flow 5: GET /admin/reports/best-sellers")


@router.get("/reports/low-stock", response_model=list[ProductOut])
def low_stock(c: Container = Depends(get_container)):
    """Active products at or below their minimum stock: what to restock."""
    raise NotImplementedError("Flow 5: GET /admin/reports/low-stock")


@router.get("/reports/categories", response_model=CategoriesReportOut)
def categories_report(c: Container = Depends(get_container)):
    """Products and stock value per category, plus tree depth and BST heights."""
    raise NotImplementedError("Flow 5: GET /admin/reports/categories")


@router.get("/reports/searches", response_model=SearchesReportOut)
def searches_report(c: Container = Depends(get_container)):
    """Recent customer searches and the most searched terms."""
    raise NotImplementedError("Flow 5: GET /admin/reports/searches")


@router.get("/export/catalog", response_class=PlainTextResponse)
def export_catalog(c: Container = Depends(get_container)):
    """The catalog sorted by name as plain text."""
    raise NotImplementedError("Flow 5: GET /admin/export/catalog")
