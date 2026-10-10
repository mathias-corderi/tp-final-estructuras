"""Opciones de consola de reportes, exportación y configuración — FLUJO 5."""

from store import config  # noqa: F401  (config.EXPORTS_DIR es donde van las exportaciones)
from store.cli import prompts  # noqa: F401  (funciones que vas a necesitar)
from store.container import Container


def show_reports(c: Container) -> None:
    """Submenú: resumen, más vendidos, stock bajo, categorías (con profundidad del árbol y altura de los BST), búsquedas."""
    raise NotImplementedError("Flow 5: show_reports (console)")


def export_catalog(c: Container) -> None:
    """Escribe c.reports.export_catalog() en exports/catalog.txt (creando la carpeta) e imprime la ruta."""
    raise NotImplementedError("Flow 5: export_catalog (console)")


def edit_settings(c: Container) -> None:
    """Muestra la configuración actual, pide cada valor (en blanco = mantener) y aplica los cambios."""
    raise NotImplementedError("Flow 5: edit_settings (console)")
