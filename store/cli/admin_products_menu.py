"""Console options for product administration — FLOW 2.

Same rules as the API: call container.catalog, let StoreError propagate
(menu.py prints it).
"""

from store.cli import prompts  # noqa: F401  (helpers you will need)
from store.container import Container


def list_all_products(c: Container) -> None:
    """Print every product, inactive ones included, sorted by code."""
    raise NotImplementedError("Flow 2: list_all_products (console)")


def add_product(c: Container) -> None:
    """Ask for each field (min_stock and discount optional) and create the product."""
    raise NotImplementedError("Flow 2: add_product (console)")


def edit_product(c: Container) -> None:
    """Ask for a code, show the product, ask each field with blank = keep, apply only the changes."""
    raise NotImplementedError("Flow 2: edit_product (console)")


def delete_product(c: Container) -> None:
    """Ask for a code, show the product and confirm before deleting."""
    raise NotImplementedError("Flow 2: delete_product (console)")


def manage_stock(c: Container) -> None:
    """Submenu: 1) restock (quantity)  2) adjust (delta + reason)."""
    raise NotImplementedError("Flow 2: manage_stock (console)")


def undo_last(c: Container) -> None:
    """Show what will be undone (top of the undo history), confirm, undo."""
    raise NotImplementedError("Flow 2: undo_last (console)")
