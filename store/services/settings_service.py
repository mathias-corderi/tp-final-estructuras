"""Servicio de configuración de la tienda — FLUJO 5 (reportes, configuración y persistencia)."""

from typing import Any, Callable

from store import errors
from store.models.settings import StoreSettings
from store.services.search_history import SearchHistory


class SettingsService:
    def __init__(
        self,
        settings: StoreSettings,
        search_history: SearchHistory,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        self._settings = settings
        self._search_history = search_history
        self._on_change = on_change

    def get(self) -> StoreSettings:
        return self._settings

    def update(self, changes: dict[str, Any]) -> StoreSettings:
        """Aplica `changes` (todo o nada) y guarda.

        - `changes` vacío, campo desconocido o valor inválido -> errors.ValidationError.
        - Si cambió search_history_size, también hay que redimensionar el historial.
        - Llamar a on_change() después de un cambio exitoso.
        """
        if not changes:
            raise errors.ValidationError("No settings to change")
        try:
            self._settings.update(**changes)
        except ValueError as exc:
            raise errors.ValidationError(str(exc)) from exc

        if "search_history_size" in changes:
            self._search_history.resize(self._settings.search_history_size)
        if self._on_change is not None:
            self._on_change()
        return self._settings
