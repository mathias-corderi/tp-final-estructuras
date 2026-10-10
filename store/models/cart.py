"""Carrito de compras — FLUJO 4 (carrito y pedidos).

Agrupa lo que el cliente quiere comprar antes de hacer el pedido. La consola lo
usa para armar el pedido paso a paso, y OrderService lo usa para juntar códigos
repetidos ([(50, 1), (50, 2)] -> una sola línea de 3 unidades).
Tests: tests/unit/test_cart.py
"""


class Cart:
    def __init__(self) -> None:
        raise NotImplementedError("Flow 4: Cart.__init__")

    def add(self, code: int, quantity: int = 1) -> None:
        """Agrega unidades de un producto. Si el código ya está en el carrito, suma a su cantidad.

        ValueError si quantity no es un int > 0.
        """
        raise NotImplementedError("Flow 4: Cart.add")

    def remove(self, code: int) -> bool:
        """Saca la línea de `code`. False si no estaba en el carrito."""
        raise NotImplementedError("Flow 4: Cart.remove")

    def lines(self) -> list[tuple[int, int]]:
        """[(código, cantidad), ...] en el orden en que se agregó cada código por primera vez."""
        raise NotImplementedError("Flow 4: Cart.lines")

    def clear(self) -> None:
        raise NotImplementedError("Flow 4: Cart.clear")

    def is_empty(self) -> bool:
        raise NotImplementedError("Flow 4: Cart.is_empty")

    def __len__(self) -> int:
        """Cantidad de productos distintos (líneas), no de unidades."""
        raise NotImplementedError("Flow 4: Cart.__len__")
