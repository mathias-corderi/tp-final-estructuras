"""Store settings service — FLOW 5 (reports, settings and persistence)."""

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
        """Apply `changes` (all or nothing) and persist.

        - Empty `changes`, unknown field or invalid value -> errors.ValidationError.
        - If search_history_size changed, resize the search history too.
        - Call on_change() after a successful update.
        """
        raise NotImplementedError("Flow 5: SettingsService.update")
