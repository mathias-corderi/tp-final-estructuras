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
            raise ValueError("El código debe ser un número entero mayor a 0.")
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
            raise ValueError("El nombre no puede estar vacío.")
        self._name = value.strip()

    @property
    def brand(self) -> str:
        return self._brand

    @brand.setter
    def brand(self, value: str) -> None:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("La marca no puede estar vacía.")
        self._brand = value.strip()

    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float) -> None:
        if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
            raise ValueError("El precio debe ser un número mayor a 0.")
        self._price = float(value)

    @property
    def stock(self) -> int:
        return self._stock

    @stock.setter
    def stock(self, value: int) -> None:
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise ValueError("El stock debe ser un entero mayor o igual a 0.")
        self._stock = value

    @property
    def category(self) -> str:
        return self._category

    @category.setter
    def category(self, value: str) -> None:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("La categoría no puede estar vacía.")
        self._category = value.strip()

    @property
    def min_stock(self) -> int:
        return self._min_stock

    @min_stock.setter
    def min_stock(self, value: int) -> None:
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise ValueError("El stock mínimo debe ser un entero mayor o igual a 0.")
        self._min_stock = value

    @property
    def discount_percent(self) -> float:
        return self._discount_percent

    @discount_percent.setter
    def discount_percent(self, value: float) -> None:
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not (0 <= value <= 90):
            raise ValueError("El descuento debe ser un número entre 0 y 90.")
        self._discount_percent = float(value)

    @property
    def active(self) -> bool:
        return self._active

    @active.setter
    def active(self, value: bool) -> None:
        if not isinstance(value, bool):
            raise ValueError("Active debe ser un booleano (True o False).")
        self._active = value

    @property
    def final_price(self) -> float:
        """Precio con el descuento aplicado, redondeado a 2 decimales. 1000 con 15 % -> 850.0"""
        descuento = self._price * (self._discount_percent / 100.0)
        return round(self._price - descuento, 2)

    # --- serialización ---------------------------------------------------------
    def to_dict(self) -> dict[str, Any]:
        """Claves: code, name, brand, price, stock, category, min_stock, discount_percent, active."""
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
        """Inversa de to_dict. min_stock, discount_percent y active son opcionales."""
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
