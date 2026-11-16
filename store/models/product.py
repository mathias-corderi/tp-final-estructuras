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
        # El código es de solo lectura, lo validamos y asignamos directamente acá
        if not isinstance(code, int) or isinstance(code, bool) or code <= 0:
            raise ValueError("code must be an integer greater than 0")
        self._code = code
        
        # El resto usa los setters para aprovechar la validación
        self.name = name
        self.brand = brand
        self.price = price
        self.stock = stock
        self.category = category
        self.min_stock = min_stock
        self.discount_percent = discount_percent
        self.active = active

    # --- propiedades -----------------------------------------------------------
    @property
    def code(self) -> int:
        return self._code

    @property
    def name(self) -> str:
        return self._name

    @name.setter
    def name(self, value: str) -> None:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("name must be a non-empty string")
        self._name = value.strip()

    @property
    def brand(self) -> str:
        return self._brand

    @brand.setter
    def brand(self, value: str) -> None:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("brand must be a non-empty string")
        self._brand = value.strip()

    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float) -> None:
        if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
            raise ValueError("price must be a number greater than 0")
        self._price = float(value)

    @property
    def stock(self) -> int:
        return self._stock

    @stock.setter
    def stock(self, value: int) -> None:
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise ValueError("stock must be an integer >= 0")
        self._stock = value

    @property
    def category(self) -> str:
        return self._category

    @category.setter
    def category(self, value: str) -> None:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("category must be a non-empty string")
        self._category = value.strip()

    @property
    def min_stock(self) -> int:
        return self._min_stock

    @min_stock.setter
    def min_stock(self, value: int) -> None:
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise ValueError("min_stock must be an integer >= 0")
        self._min_stock = value

    @property
    def discount_percent(self) -> float:
        return self._discount_percent

    @discount_percent.setter
    def discount_percent(self, value: float) -> None:
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not (0 <= value <= 90):
            raise ValueError("discount_percent must be a number between 0 and 90")
        self._discount_percent = float(value)

    @property
    def active(self) -> bool:
        return self._active

    @active.setter
    def active(self, value: bool) -> None:
        if not isinstance(value, bool):
            raise ValueError("active must be a boolean")
        self._active = value

    @property
    def final_price(self) -> float:
        """Precio con el descuento aplicado, redondeado a 2 decimales. 1000 con 15 % -> 850.0"""
        descuento = self._price * (self._discount_percent / 100.0)
        return round(self._price - descuento, 2)

    # --- serialización ---------------------------------------------------------
    def to_dict(self) -> dict[str, Any]:
        """Claves: code, name, brand, price, stock, category, min_stock, discount_percent, active.

        (final_price NO va: es un valor calculado, no se guarda.)
        """
        return {
            "code": self.code,
            "name": self.name,
            "brand": self.brand,
            "price": self.price,
            "stock": self.stock,
            "category": self.category,
            "min_stock": self.min_stock,
            "discount_percent": self.discount_percent,
            "active": self.active,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Product":
        """Inversa de to_dict. min_stock, discount_percent y active son opcionales
        (toman los valores por defecto del constructor). Claves extra como final_price se ignoran."""
        return cls(
            code=data["code"],
            name=data["name"],
            brand=data["brand"],
            price=data["price"],
            stock=data["stock"],
            category=data["category"],
            min_stock=data.get("min_stock", 5),
            discount_percent=data.get("discount_percent", 0.0),
            active=data.get("active", True),
        )

    # --- identidad -------------------------------------------------------------
    def __eq__(self, other: object) -> bool:
        """Dos productos son iguales si ambos son Product y tienen el mismo código."""
        if not isinstance(other, Product):
            return False
        return self.code == other.code

    def __hash__(self) -> int:
        return hash(self.code)

    def __repr__(self) -> str:
        return f"Product(code={self.code!r}, name={self.name!r})"