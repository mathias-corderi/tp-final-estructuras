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


def _is_int(value: Any) -> bool:
    """True para un int de verdad: en Python bool es subclase de int, así que hay que excluirlo a mano."""
    return isinstance(value, int) and not isinstance(value, bool)


class StoreSettings:
    FIELDS = ("store_name", "currency", "default_min_stock", "search_history_size")

    def __init__(
        self,
        store_name: str = "My Store",
        currency: str = "ARS",
        default_min_stock: int = 5,
        search_history_size: int = 10,
    ) -> None:
        # Se asigna por los setters para que el constructor valide igual que una modificación.
        self.store_name = store_name
        self.currency = currency
        self.default_min_stock = default_min_stock
        self.search_history_size = search_history_size

    @property
    def store_name(self) -> str:
        return self._store_name

    @store_name.setter
    def store_name(self, value: str) -> None:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("store_name must be a non-empty string")
        self._store_name = value.strip()

    @property
    def currency(self) -> str:
        return self._currency

    @currency.setter
    def currency(self, value: str) -> None:
        # isascii() deja afuera letras como "ß", que al pasar a mayúsculas cambian de largo.
        if not isinstance(value, str) or len(value) != 3 or not (value.isascii() and value.isalpha()):
            raise ValueError("currency must be exactly 3 letters")
        self._currency = value.upper()

    @property
    def default_min_stock(self) -> int:
        return self._default_min_stock

    @default_min_stock.setter
    def default_min_stock(self, value: int) -> None:
        if not _is_int(value) or value < 0:
            raise ValueError("default_min_stock must be an integer >= 0")
        self._default_min_stock = value

    @property
    def search_history_size(self) -> int:
        return self._search_history_size

    @search_history_size.setter
    def search_history_size(self, value: int) -> None:
        if not _is_int(value) or not 1 <= value <= 100:
            raise ValueError("search_history_size must be an integer between 1 and 100")
        self._search_history_size = value

    def update(self, **changes: Any) -> None:
        """Cambia varios campos a la vez, *todo o nada*.

        Campo desconocido -> ValueError. Si algún valor es inválido, lanza ValueError
        y deja TODOS los campos como estaban (validar todo antes de asignar nada).
        """
        for field in changes:
            if field not in self.FIELDS:
                raise ValueError(f"Unknown setting: {field}")
        # Se valida sobre una copia: si algo está mal falla acá, sin haber tocado self.
        validated = StoreSettings(**{**self.to_dict(), **changes})
        for field in self.FIELDS:
            setattr(self, field, getattr(validated, field))

    def to_dict(self) -> dict[str, Any]:
        """Claves: los cuatro FIELDS."""
        return {field: getattr(self, field) for field in self.FIELDS}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StoreSettings":
        """Las claves que falten toman los valores por defecto del constructor."""
        return cls(**{field: data[field] for field in cls.FIELDS if field in data})
