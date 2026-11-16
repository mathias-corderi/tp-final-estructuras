"""Opciones de consola de administración de productos — FLUJO 2.

Mismas reglas que la API: llamar a container.catalog y dejar que StoreError se
propague (menu.py lo imprime).
"""

from store.cli import prompts
from store.container import Container


def _show_product(product) -> None:
    prompts.print_products([product])


def list_all_products(c: Container) -> None:
    """Imprime todos los productos, incluidos los inactivos, ordenados por código."""
    prompts.print_products(c.catalog.list_products(sort="code", include_inactive=True))


def add_product(c: Container) -> None:
    """Pide cada campo (min_stock y descuento opcionales) y crea el producto."""
    data = {
        "code": prompts.ask_int("Code", minimum=1),
        "name": prompts.ask_text("Name"),
        "brand": prompts.ask_text("Brand"),
        "price": prompts.ask_float("Price"),
        "stock": prompts.ask_int("Initial stock", minimum=0),
        "category": prompts.ask_text("Category (e.g. Grocery/Drinks)"),
    }
    # En blanco = usar el default de la tienda (min_stock) o 0 (descuento).
    min_stock = prompts.ask_int(f"Min stock [{c.settings.default_min_stock}]", minimum=0, optional=True)
    if min_stock is not None:
        data["min_stock"] = min_stock
    discount = prompts.ask_float("Discount % [0]", minimum=0, optional=True)
    if discount is not None:
        data["discount_percent"] = discount

    product = c.catalog.add(data)
    print(f"  Product {product.code} ({product.name}) created.")


def edit_product(c: Container) -> None:
    """Pide un código, muestra el producto, pide cada campo (en blanco = mantener) y aplica solo los cambios."""
    code = prompts.ask_int("Product code", minimum=1)
    product = c.catalog.get(code, include_inactive=True)  # ProductNotFound si no existe
    _show_product(product)
    print("  Leave a value blank to keep it.")

    answers = {
        "name": prompts.ask_text(f"Name [{product.name}]", optional=True),
        "brand": prompts.ask_text(f"Brand [{product.brand}]", optional=True),
        "price": prompts.ask_float(f"Price [{product.price:.2f}]", optional=True),
        "category": prompts.ask_text(f"Category [{product.category}]", optional=True),
        "min_stock": prompts.ask_int(f"Min stock [{product.min_stock}]", minimum=0, optional=True),
        "discount_percent": prompts.ask_float(f"Discount % [{product.discount_percent:g}]", minimum=0, optional=True),
    }
    changes = {field: value for field, value in answers.items() if value is not None}
    active = prompts.ask_text(f"Active? (y/n) [{'y' if product.active else 'n'}]", optional=True)
    if active is not None and active.lower() in ("y", "n"):
        changes["active"] = active.lower() == "y"

    if not changes:
        print("  No changes.")
        return
    c.catalog.update(code, changes)
    print("  Product updated.")


def delete_product(c: Container) -> None:
    """Pide un código, muestra el producto y pide confirmación antes de borrarlo."""
    code = prompts.ask_int("Product code", minimum=1)
    product = c.catalog.get(code, include_inactive=True)  # ProductNotFound si no existe
    _show_product(product)
    if prompts.confirm(f"Delete product {product.code} ({product.name})?"):
        c.catalog.delete(code)
        print("  Product deleted.")
    else:
        print("  Cancelled.")


def manage_stock(c: Container) -> None:
    """Submenú: 1) reponer (cantidad)  2) ajustar (delta + motivo)."""
    print("  1. Restock")
    print("  2. Adjust stock (breakage, inventory count...)")
    option = input("Option: ").strip()
    if option not in ("1", "2"):
        print("  Invalid option.")
        return

    code = prompts.ask_int("Product code", minimum=1)
    if option == "1":
        product = c.catalog.restock(code, prompts.ask_int("Units to add", minimum=1))
    else:
        delta = prompts.ask_int("Units to add (positive) or remove (negative)")
        reason = prompts.ask_text("Reason")
        product = c.catalog.adjust_stock(code, delta, reason)
    print(f"  Stock of {product.code} is now {product.stock}.")


def undo_last(c: Container) -> None:
    """Muestra qué se va a deshacer (el tope del historial), pide confirmación y deshace."""
    history = c.catalog.undo_history()
    if not history:
        print("  Nothing to undo.")
        return
    print(f"  Last operation: {history[0].description}")
    if prompts.confirm("Undo it?"):
        operation = c.catalog.undo()
        print(f"  Undone: {operation.description}")
    else:
        print("  Cancelled.")
