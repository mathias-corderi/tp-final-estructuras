"""Console options for the cart and orders — FLOW 4."""

from store.cli import prompts  # noqa: F401  (helpers you will need)
from store.container import Container


def shopping_cart(c: Container) -> None:
    """Build a Cart interactively: add code + quantity, remove, show quote (c.orders.quote),
    and finally ask the customer's name and place the order. Print the order id."""
    raise NotImplementedError("Flow 4: shopping_cart (console)")


def track_order(c: Container) -> None:
    """Ask for an order id and print its status, items and total."""
    raise NotImplementedError("Flow 4: track_order (console)")


def manage_orders(c: Container) -> None:
    """Admin submenu: 1) list (optionally by status)  2) complete next pending  3) cancel by id.
    Also show how many orders are waiting in the queue."""
    raise NotImplementedError("Flow 4: manage_orders (console)")
