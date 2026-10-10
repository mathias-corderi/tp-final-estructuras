"""Aplicación FastAPI. Código compartido — ya implementado.

Se levanta con:  uvicorn store.api.app:app --reload     (documentación en http://127.0.0.1:8000/docs)
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from store.api.routes import (
    admin_categories,
    admin_orders,
    admin_products,
    admin_reports,
    admin_settings,
    categories,
    orders,
    products,
)
from store.errors import StoreError

DESCRIPTION = """
API de la tienda — TP Final Estructuras de Datos.

Los endpoints públicos son para los clientes. Todo endpoint `/admin/*` requiere el
header `X-Admin-Token` (variable de entorno `STORE_ADMIN_TOKEN`, por defecto `change-me`).
"""


def create_app() -> FastAPI:
    app = FastAPI(title="Store API", version="0.1.0", description=DESCRIPTION)

    for module in (
        products,
        categories,
        orders,
        admin_products,
        admin_categories,
        admin_orders,
        admin_reports,
        admin_settings,
    ):
        app.include_router(module.router)

    @app.exception_handler(StoreError)
    async def store_error_handler(request: Request, exc: StoreError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(NotImplementedError)
    async def not_implemented_handler(request: Request, exc: NotImplementedError) -> JSONResponse:
        return JSONResponse(status_code=501, content={"detail": f"Not implemented yet: {exc}"})

    return app


app = create_app()
