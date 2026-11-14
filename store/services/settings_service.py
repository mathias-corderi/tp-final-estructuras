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
        previous = self._settings.to_dict()
        try:
            self._settings.update(**changes)
        except ValueError as exc:
            raise errors.ValidationError(str(exc)) from exc

        if self._on_change is not None:
            try:
                self._on_change()
            except BaseException:
                # Si no se pudo guardar, se vuelve atrás para que la memoria coincida con el archivo.
                self._settings.update(**previous)
                raise

        # El historial se achica recién después de guardar bien, porque descartar
        # búsquedas no se puede deshacer. Si el archivo quedó con más términos que el
        # nuevo tamaño no importa: al cargar, la cola acotada se queda con los últimos.
        if "search_history_size" in changes:
            self._search_history.resize(self._settings.search_history_size)
        return self._settings
