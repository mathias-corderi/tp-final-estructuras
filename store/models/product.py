"""Product — FLOW 2 (product administration).

The core domain class. Every attribute is private (`self._price`) and exposed
through @property; setters validate and raise ValueError on bad data, leaving
the old value untouched.

Rules:
  code              int > 0, read-only (no setter)
  name, brand       non-empty str, stored stripped
  price             int or float > 0, stored as float
  stock             int >= 0
  category          non-empty str, stored stripped (a category path such as "Grocery/Drinks")
  min_stock         int >= 0 (below or at this level the product is "low stock")
  discount_percent  int or float between 0 and 90 inclusive, stored as float
  active            bool (inactive products are hidden from customers)
`bool` is not a valid int/float here (True is not a price).

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

    # --- properties ------------------------------------------------------------
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
        """Price with the discount applied, rounded to 2 decimals. 1000 with 15 % -> 850.0"""
        raise NotImplementedError("Flow 2: Product.final_price")

    # --- serialization ---------------------------------------------------------
    def to_dict(self) -> dict[str, Any]:
        """Keys: code, name, brand, price, stock, category, min_stock, discount_percent, active.

        (final_price is NOT included: it's derived, not stored.)
        """
        raise NotImplementedError("Flow 2: Product.to_dict")

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Product":
        """Inverse of to_dict. min_stock, discount_percent and active are optional
        (constructor defaults). Extra keys such as final_price are ignored."""
        raise NotImplementedError("Flow 2: Product.from_dict")

    # --- identity --------------------------------------------------------------
    def __eq__(self, other: object) -> bool:
        """Two products are equal when both are Products with the same code."""
        raise NotImplementedError("Flow 2: Product.__eq__")

    def __hash__(self) -> int:
        raise NotImplementedError("Flow 2: Product.__hash__")

    def __repr__(self) -> str:
        return f"Product(code={self.code!r}, name={self.name!r})"
