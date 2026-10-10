"""Shopping cart — FLOW 4 (cart and orders).

Groups what a customer wants to buy before placing the order. The console uses
it to build the order step by step, and OrderService uses it to merge repeated
codes ([(50, 1), (50, 2)] -> one line of 3 units).
Tests: tests/unit/test_cart.py
"""


class Cart:
    def __init__(self) -> None:
        raise NotImplementedError("Flow 4: Cart.__init__")

    def add(self, code: int, quantity: int = 1) -> None:
        """Add units of a product. If the code is already in the cart, add to its quantity.

        ValueError if quantity is not an int > 0.
        """
        raise NotImplementedError("Flow 4: Cart.add")

    def remove(self, code: int) -> bool:
        """Remove the line for `code`. False if it wasn't in the cart."""
        raise NotImplementedError("Flow 4: Cart.remove")

    def lines(self) -> list[tuple[int, int]]:
        """[(code, quantity), ...] in the order the codes were first added."""
        raise NotImplementedError("Flow 4: Cart.lines")

    def clear(self) -> None:
        raise NotImplementedError("Flow 4: Cart.clear")

    def is_empty(self) -> bool:
        raise NotImplementedError("Flow 4: Cart.is_empty")

    def __len__(self) -> int:
        """Number of distinct products (lines), not units."""
        raise NotImplementedError("Flow 4: Cart.__len__")
