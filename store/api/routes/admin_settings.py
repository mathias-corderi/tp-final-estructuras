"""Endpoints de configuración de la tienda — FLUJO 5. Requieren X-Admin-Token (ya está conectado).
Tests: tests/api/test_settings_api.py
"""

from fastapi import APIRouter, Depends

from store.api.deps import get_container, require_admin
from store.api.schemas.reports import SettingsOut, SettingsUpdate
from store.container import Container

router = APIRouter(prefix="/admin/settings", tags=["admin: settings"], dependencies=[Depends(require_admin)])


@router.get("", response_model=SettingsOut)
def get_settings(c: Container = Depends(get_container)):
    """Configuración actual de la tienda."""
    raise NotImplementedError("Flow 5: GET /admin/settings")


@router.patch("", response_model=SettingsOut)
def update_settings(body: SettingsUpdate, c: Container = Depends(get_container)):
    """Cambia algunos valores (todo o nada). 422 body vacío o valor inválido."""
    raise NotImplementedError("Flow 5: PATCH /admin/settings")
