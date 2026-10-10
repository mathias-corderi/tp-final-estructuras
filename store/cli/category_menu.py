"""Console options for categories — FLOW 3."""

from store.cli import prompts  # noqa: F401  (helpers you will need)
from store.container import Container


def browse_categories(c: Container) -> None:
    """"Explorar por categorías": print the tree indented by level with product counts
    (like NodoCategoria.mostrar in the TP), then ask for a path and list its products."""
    raise NotImplementedError("Flow 3: browse_categories (console)")


def manage_categories(c: Container) -> None:
    """Submenu: 1) create  2) rename  3) delete."""
    raise NotImplementedError("Flow 3: manage_categories (console)")


def price_adjustment(c: Container) -> None:
    """Ask for a path and a percent, show how many products will change, confirm, apply."""
    raise NotImplementedError("Flow 3: price_adjustment (console)")
