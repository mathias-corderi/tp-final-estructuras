"""Console options for reports, export and settings — FLOW 5."""

from store import config  # noqa: F401  (config.EXPORTS_DIR is where exports go)
from store.cli import prompts  # noqa: F401  (helpers you will need)
from store.container import Container


def show_reports(c: Container) -> None:
    """Submenu: summary, best sellers, low stock, categories (with tree depth and BST heights), searches."""
    raise NotImplementedError("Flow 5: show_reports (console)")


def export_catalog(c: Container) -> None:
    """Write c.reports.export_catalog() to exports/catalog.txt (create the folder) and print the path."""
    raise NotImplementedError("Flow 5: export_catalog (console)")


def edit_settings(c: Container) -> None:
    """Show the current settings, ask each one with blank = keep, apply the changes."""
    raise NotImplementedError("Flow 5: edit_settings (console)")
