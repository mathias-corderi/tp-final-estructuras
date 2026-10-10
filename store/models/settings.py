"""Configuración de la tienda — FLUJO 5 (reportes, configuración y persistencia).

Lo que el dueño puede configurar de la tienda.

  store_name           str no vacío, sin espacios en los extremos
  currency             3 letras, se guarda en mayúsculas ("usd" -> "USD")
  default_min_stock    int >= 0, se usa cuando se crea un producto sin min_stock
  search_history_size  int entre 1 y 100, cuántas búsquedas se recuerdan
ValueError si algún dato es inválido (`bool` no cuenta como int válido).
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
        """Cambia varios campos a la vez, *todo o nada*.

        Campo desconocido -> ValueError. Si algún valor es inválido, lanza ValueError
        y deja TODOS los campos como estaban (validar todo antes de asignar nada).
        """
        raise NotImplementedError("Flow 5: StoreSettings.update")

    def to_dict(self) -> dict[str, Any]:
        """Claves: los cuatro FIELDS."""
        raise NotImplementedError("Flow 5: StoreSettings.to_dict")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StoreSettings":
        """Las claves que falten toman los valores por defecto del constructor."""
        raise NotImplementedError("Flow 5: StoreSettings.from_dict")
