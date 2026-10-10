"""Opciones de consola de administración de productos — FLUJO 2.

Mismas reglas que la API: llamar a container.catalog y dejar que StoreError se
propague (menu.py lo imprime).
"""

from store.cli import prompts  # noqa: F401  (funciones que vas a necesitar)
from store.container import Container


def list_all_products(c: Container) -> None:
    """Imprime todos los productos, incluidos los inactivos, ordenados por código."""
    raise NotImplementedError("Flow 2: list_all_products (console)")


def add_product(c: Container) -> None:
    """Pide cada campo (min_stock y descuento opcionales) y crea el producto."""
    raise NotImplementedError("Flow 2: add_product (console)")


def edit_product(c: Container) -> None:
    """Pide un código, muestra el producto, pide cada campo (en blanco = mantener) y aplica solo los cambios."""
    raise NotImplementedError("Flow 2: edit_product (console)")


def delete_product(c: Container) -> None:
    """Pide un código, muestra el producto y pide confirmación antes de borrarlo."""
    raise NotImplementedError("Flow 2: delete_product (console)")


def manage_stock(c: Container) -> None:
    """Submenú: 1) reponer (cantidad)  2) ajustar (delta + motivo)."""
    raise NotImplementedError("Flow 2: manage_stock (console)")


def undo_last(c: Container) -> None:
    """Muestra qué se va a deshacer (el tope del historial), pide confirmación y deshace."""
    raise NotImplementedError("Flow 2: undo_last (console)")
