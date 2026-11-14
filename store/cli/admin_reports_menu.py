"""Opciones de consola de reportes, exportación y configuración — FLUJO 5."""

from store import config
from store.cli import prompts
from store.container import Container


def _print_summary(c: Container) -> None:
    summary = c.reports.summary()
    currency = c.settings_service.get().currency
    orders = summary["orders"]
    print(f"  Revenue:         {currency} {summary['revenue']:.2f}")
    print(f"  Orders:          {orders['pending']} pending, {orders['completed']} completed, {orders['cancelled']} cancelled")
    print(f"  Average ticket:  {currency} {summary['average_ticket']:.2f}")
    print(f"  Inventory value: {currency} {summary['inventory_value']:.2f}")
    print(f"  Products:        {summary['product_count']}")


def _print_best_sellers(c: Container) -> None:
    ranking = c.reports.best_sellers()
    if not ranking:
        print("  (no sales yet)")
        return
    print(f"  {'CODE':>6}  {'NAME':<32} {'UNITS':>6} {'REVENUE':>12}")
    for entry in ranking:
        print(f"  {entry['code']:>6}  {entry['name'][:32]:<32} {entry['units_sold']:>6} {entry['revenue']:>12.2f}")


def _print_low_stock(c: Container) -> None:
    prompts.print_products(c.reports.low_stock())


def _print_categories(c: Container) -> None:
    report = c.reports.categories()
    print(f"  Category tree depth: {report['tree_depth']}")
    print(f"  BST height by code: {report['bst_height_by_code']}")
    print(f"  BST height by name: {report['bst_height_by_name']}")
    print()
    print(f"  {'CATEGORY':<36} {'PRODUCTS':>8} {'STOCK VALUE':>14}")
    for entry in report["categories"]:
        print(f"  {entry['path'][:36]:<36} {entry['product_count']:>8} {entry['stock_value']:>14.2f}")


def _print_searches(c: Container) -> None:
    report = c.reports.searches()
    if not report["recent"]:
        print("  (no searches yet)")
        return
    print(f"  Recent: {', '.join(report['recent'])}")
    print("  Most searched:")
    for entry in report["top_terms"]:
        print(f"  {entry['count']:>6}  {entry['term']}")


REPORTS = (
    ("1", "Sales summary", _print_summary),
    ("2", "Best sellers", _print_best_sellers),
    ("3", "Low stock", _print_low_stock),
    ("4", "Categories and structures", _print_categories),
    ("5", "Customer searches", _print_searches),
    ("0", "Back", None),
)


def show_reports(c: Container) -> None:
    """Submenú: resumen, más vendidos, stock bajo, categorías (con profundidad del árbol y altura de los BST), búsquedas."""
    while True:
        prompts.title("Reports & statistics")
        for key, label, _ in REPORTS:
            print(f" {key:>2}. {label}")
        choice = input("Option: ").strip()
        selected = next((entry for entry in REPORTS if entry[0] == choice), None)
        if selected is None:
            print("Invalid option.")
            continue
        report = selected[2]
        if report is None:
            return
        print()
        report(c)
        prompts.pause()


def export_catalog(c: Container) -> None:
    """Escribe c.reports.export_catalog() en exports/catalog.txt (creando la carpeta) e imprime la ruta."""
    target = config.EXPORTS_DIR / "catalog.txt"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(c.reports.export_catalog(), encoding="utf-8")
    print(f"  Catalog exported to {target}")


def edit_settings(c: Container) -> None:
    """Muestra la configuración actual, pide cada valor (en blanco = mantener) y aplica los cambios."""
    current = c.settings_service.get()
    print("  Leave a value blank to keep it.")
    answers = {
        "store_name": prompts.ask_text(f"Store name [{current.store_name}]", optional=True),
        "currency": prompts.ask_text(f"Currency [{current.currency}]", optional=True),
        "default_min_stock": prompts.ask_int(f"Default min stock [{current.default_min_stock}]", minimum=0, optional=True),
        "search_history_size": prompts.ask_int(f"Search history size [{current.search_history_size}]", minimum=1, optional=True),
    }
    changes = {field: value for field, value in answers.items() if value is not None}
    if not changes:
        print("  No changes.")
        return
    c.settings_service.update(changes)
    print("  Settings updated.")
