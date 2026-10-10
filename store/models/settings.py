"""Store settings — FLOW 5 (reports, settings and persistence).

What the owner can configure about the store itself.

  store_name           non-empty str, stored stripped
  currency             3 letters, stored uppercase ("usd" -> "USD")
  default_min_stock    int >= 0, used when a product is created without min_stock
  search_history_size  int between 1 and 100, how many searches are remembered
ValueError on bad data (`bool` is not a valid int).
Tests: tests/unit/test_settings_model.py
"""

from typing import Any


class StoreSettings:
    FIELDS = ("store_name", "currency", "default_min_stock", "search_history_size")

    def __init__(
        self,
        store_name: str = "My Store",
        currency: str = "ARS",
        default_min_stock: int = 5,
        search_history_size: int = 10,
    ) -> None:
        raise NotImplementedError("Flow 5: StoreSettings.__init__")

    @property
    def store_name(self) -> str:
        raise NotImplementedError("Flow 5: StoreSettings.store_name")

    @store_name.setter
    def store_name(self, value: str) -> None:
        raise NotImplementedError("Flow 5: StoreSettings.store_name setter")

    @property
    def currency(self) -> str:
        raise NotImplementedError("Flow 5: StoreSettings.currency")

    @currency.setter
    def currency(self, value: str) -> None:
        raise NotImplementedError("Flow 5: StoreSettings.currency setter")

    @property
    def default_min_stock(self) -> int:
        raise NotImplementedError("Flow 5: StoreSettings.default_min_stock")

    @default_min_stock.setter
    def default_min_stock(self, value: int) -> None:
        raise NotImplementedError("Flow 5: StoreSettings.default_min_stock setter")

    @property
    def search_history_size(self) -> int:
        raise NotImplementedError("Flow 5: StoreSettings.search_history_size")

    @search_history_size.setter
    def search_history_size(self, value: int) -> None:
        raise NotImplementedError("Flow 5: StoreSettings.search_history_size setter")

    def update(self, **changes: Any) -> None:
        """Change several fields at once, *all or nothing*.

        Unknown field -> ValueError. If any value is invalid, raise ValueError and
        leave EVERY field unchanged (validate everything before assigning anything).
        """
        raise NotImplementedError("Flow 5: StoreSettings.update")

    def to_dict(self) -> dict[str, Any]:
        """Keys: the four FIELDS."""
        raise NotImplementedError("Flow 5: StoreSettings.to_dict")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StoreSettings":
        """Missing keys take the constructor defaults."""
        raise NotImplementedError("Flow 5: StoreSettings.from_dict")
