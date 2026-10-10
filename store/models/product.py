"""Producto — FLUJO 2 (administración de productos).

La clase central del dominio. Todos los atributos son privados (`self._price`)
y se exponen con @property; los setters validan y lanzan ValueError si el dato
es inválido, dejando el valor anterior sin cambios.

Reglas:
  code              int > 0, solo lectura (sin setter)
  name, brand       str no vacío, se guarda sin espacios en los extremos
  price             int o float > 0, se guarda como float
  stock             int >= 0
  category          str no vacío, sin espacios en los extremos (una ruta como "Grocery/Drinks")
  min_stock         int >= 0 (con stock menor o igual a esto, el producto está en "stock bajo")
  discount_percent  int o float entre 0 y 90 inclusive, se guarda como float
  active            bool (los productos inactivos no se muestran a los clientes)
`bool` no cuenta como int/float válido acá (True no es un precio).

Tests: tests/unit/test_product.py
"""

from typing import Any


class Product:
    def __init__(
        self,
        code: int,
        name: str,
        brand: str,
        price: float,
        stock: int,
        category: str,
        min_stock: int = 5,
        discount_percent: float = 0.0,
        active: bool = True,
    ) -> None:
        raise NotImplementedError("Flow 2: Product.__init__")

    # --- propiedades -----------------------------------------------------------
    @property
    def code(self) -> int:
        raise NotImplementedError("Flow 2: Product.code")

    @property
    def name(self) -> str:
        raise NotImplementedError("Flow 2: Product.name")

    @name.setter
    def name(self, value: str) -> None:
        raise NotImplementedError("Flow 2: Product.name setter")

    @property
    def brand(self) -> str:
        raise NotImplementedError("Flow 2: Product.brand")

    @brand.setter
    def brand(self, value: str) -> None:
        raise NotImplementedError("Flow 2: Product.brand setter")

    @property
    def price(self) -> float:
        raise NotImplementedError("Flow 2: Product.price")

    @price.setter
    def price(self, value: float) -> None:
        raise NotImplementedError("Flow 2: Product.price setter")

    @property
    def stock(self) -> int:
        raise NotImplementedError("Flow 2: Product.stock")

    @stock.setter
    def stock(self, value: int) -> None:
        raise NotImplementedError("Flow 2: Product.stock setter")

    @property
    def category(self) -> str:
        raise NotImplementedError("Flow 2: Product.category")

    @category.setter
    def category(self, value: str) -> None:
        raise NotImplementedError("Flow 2: Product.category setter")

    @property
    def min_stock(self) -> int:
        raise NotImplementedError("Flow 2: Product.min_stock")

    @min_stock.setter
    def min_stock(self, value: int) -> None:
        raise NotImplementedError("Flow 2: Product.min_stock setter")

    @property
    def discount_percent(self) -> float:
        raise NotImplementedError("Flow 2: Product.discount_percent")

    @discount_percent.setter
    def discount_percent(self, value: float) -> None:
        raise NotImplementedError("Flow 2: Product.discount_percent setter")

    @property
    def active(self) -> bool:
        raise NotImplementedError("Flow 2: Product.active")

    @active.setter
    def active(self, value: bool) -> None:
        raise NotImplementedError("Flow 2: Product.active setter")

    @property
    def final_price(self) -> float:
        """Precio con el descuento aplicado, redondeado a 2 decimales. 1000 con 15 % -> 850.0"""
        raise NotImplementedError("Flow 2: Product.final_price")

    # --- serialización ---------------------------------------------------------
    def to_dict(self) -> dict[str, Any]:
        """Claves: code, name, brand, price, stock, category, min_stock, discount_percent, active.

        (final_price NO va: es un valor calculado, no se guarda.)
        """
        raise NotImplementedError("Flow 2: Product.to_dict")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Product":
        """Inversa de to_dict. min_stock, discount_percent y active son opcionales
        (toman los valores por defecto del constructor). Claves extra como final_price se ignoran."""
        raise NotImplementedError("Flow 2: Product.from_dict")

    # --- identidad -------------------------------------------------------------
    def __eq__(self, other: object) -> bool:
        """Dos productos son iguales si ambos son Product y tienen el mismo código."""
        raise NotImplementedError("Flow 2: Product.__eq__")

    def __hash__(self) -> int:
        raise NotImplementedError("Flow 2: Product.__hash__")

    def __repr__(self) -> str:
        return f"Product(code={self.code!r}, name={self.name!r})"
