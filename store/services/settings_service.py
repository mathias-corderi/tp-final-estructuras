"""Servicio de configuración de la tienda — FLUJO 5 (reportes, configuración y persistencia)."""

from typing import Any, Callable

from store.models.settings import StoreSettings
from store.services.search_history import SearchHistory


class SettingsService:
    def __init__(
        self,
        settings: StoreSettings,
        search_history: SearchHistory,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        raise NotImplementedError("Flow 5: SettingsService.__init__")

    def get(self) -> StoreSettings:
        raise NotImplementedError("Flow 5: SettingsService.get")

    def update(self, changes: dict[str, Any]) -> StoreSettings:
        """Aplica `changes` (todo o nada) y guarda.

        - `changes` vacío, campo desconocido o valor inválido -> errors.ValidationError.
        - Si cambió search_history_size, también hay que redimensionar el historial.
        - Llamar a on_change() después de un cambio exitoso.
        """
        raise NotImplementedError("Flow 5: SettingsService.update")
