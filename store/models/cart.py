"""Carrito de compras — FLUJO 4 (carrito y pedidos).

Agrupa lo que el cliente quiere comprar antes de hacer el pedido. La consola lo
usa para armar el pedido paso a paso, y OrderService lo usa para juntar códigos
repetidos ([(50, 1), (50, 2)] -> una sola línea de 3 unidades).
Tests: tests/unit/test_cart.py

Guardamos las líneas en una lista de pares [código, cantidad] en el orden en que
se agregó cada código. Buscar un código es una búsqueda secuencial O(n), que
alcanza de sobra porque un carrito tiene pocas líneas, y nos da el orden de
inserción gratis (lo pide `lines()`).
"""


class Cart:
    def __init__(self) -> None:
        self._lines: list[list[int]] = []  # cada elemento es [código, cantidad]

    def _find(self, code: int) -> int:
        """Posición de la línea de `code` en self._lines, o -1 si no está (búsqueda secuencial)."""
        for index in range(len(self._lines)):
            if self._lines[index][0] == code:
                return index
        return -1

    def add(self, code: int, quantity: int = 1) -> None:
        """Agrega unidades de un producto. Si el código ya está en el carrito, suma a su cantidad.

        ValueError si quantity no es un int > 0.
        """
        if isinstance(quantity, bool) or not isinstance(quantity, int) or quantity <= 0:
            raise ValueError("quantity must be an integer greater than 0")
        index = self._find(code)
        if index == -1:
            self._lines.append([code, quantity])
        else:
            self._lines[index][1] += quantity

    def remove(self, code: int) -> bool:
        """Saca la línea de `code`. False si no estaba en el carrito."""
        index = self._find(code)
        if index == -1:
            return False
        self._lines.pop(index)
        return True

    def lines(self) -> list[tuple[int, int]]:
        """[(código, cantidad), ...] en el orden en que se agregó cada código por primera vez."""
        return [(code, quantity) for code, quantity in self._lines]

    def clear(self) -> None:
        self._lines = []

    def is_empty(self) -> bool:
        return len(self._lines) == 0

    def __len__(self) -> int:
        """Cantidad de productos distintos (líneas), no de unidades."""
        return len(self._lines)
