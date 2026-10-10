"""Opciones de consola de categorías — FLUJO 3."""

from store.cli import prompts  # noqa: F401  (funciones que vas a necesitar)
from store.container import Container


def browse_categories(c: Container) -> None:
    """"Explorar por categorías": imprime el árbol indentado por nivel con la cantidad de productos
    (como NodoCategoria.mostrar de la consigna), después pide una ruta y lista sus productos."""
    raise NotImplementedError("Flow 3: browse_categories (console)")


def manage_categories(c: Container) -> None:
    """Submenú: 1) crear  2) renombrar  3) borrar."""
    raise NotImplementedError("Flow 3: manage_categories (console)")


def price_adjustment(c: Container) -> None:
    """Pide una ruta y un porcentaje, muestra cuántos productos van a cambiar, pide confirmación y aplica."""
    raise NotImplementedError("Flow 3: price_adjustment (console)")
