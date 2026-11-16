"""Opciones de consola de categorías — FLUJO 3."""

from typing import Any

from store.cli import prompts
from store.container import Container


def _print_tree(node: dict[str, Any], level: int = 0) -> None:
    """Imprime el nodo indentado según su nivel, con la cantidad de productos (como NodoCategoria.mostrar)."""
    print(f"  {'    ' * level}{node['name']} ({node['product_count']})")
    for child in node["children"]:
        _print_tree(child, level + 1)


def browse_categories(c: Container) -> None:
    """"Explorar por categorías": imprime el árbol indentado por nivel con la cantidad de productos
    (como NodoCategoria.mostrar de la consigna), después pide una ruta y lista sus productos."""
    _print_tree(c.categories.tree())
    print()
    path = prompts.ask_text("Category path to list, e.g. Grocery/Drinks (blank = all)", optional=True) or ""
    prompts.print_products(c.categories.products(path))


def manage_categories(c: Container) -> None:
    """Submenú: 1) crear  2) renombrar  3) borrar."""
    while True:
        prompts.title("Manage categories")
        print("  1. Create category (missing parents are created too)")
        print("  2. Rename category")
        print("  3. Delete category (must be empty)")
        print("  0. Back")
        choice = input("Option: ").strip()

        if choice == "1":
            path = prompts.ask_text("New category path, e.g. Electronics/Phones")
            node = c.categories.create(path)
            print(f"  Category '{node['path']}' created.")
        elif choice == "2":
            path = prompts.ask_text("Category path to rename")
            new_name = prompts.ask_text("New name (just the last segment)")
            node = c.categories.rename(path, new_name)
            print(f"  Renamed. Now it is '{node['path']}' and its products were updated.")
        elif choice == "3":
            path = prompts.ask_text("Category path to delete")
            if prompts.confirm(f"Delete category '{path}'?"):
                c.categories.delete(path)
                print("  Category deleted.")
            else:
                print("  Cancelled.")
        elif choice == "0":
            return
        else:
            print("Invalid option.")


def price_adjustment(c: Container) -> None:
    """Pide una ruta y un porcentaje, muestra cuántos productos van a cambiar, pide confirmación y aplica."""
    path = prompts.ask_text("Category path (e.g. Grocery/Drinks)")
    percent = prompts.ask_float("Percent (10 = +10 %, -15 = -15 %)")
    if percent == 0 or not -90 <= percent <= 500:
        print("  The percent must be between -90 and 500 and different from 0.")
        return

    total = c.categories.count_products(path)  # CategoryNotFound si la ruta no existe
    if total == 0:
        print("  That category has no products.")
        return
    if not prompts.confirm(f"Change the price of {total} product(s) in '{path}' by {percent:+g} %?"):
        print("  Cancelled.")
        return

    updated = c.categories.adjust_prices(path, percent)
    print(f"  {len(updated)} product(s) updated (this cannot be undone):")
    prompts.print_products(updated)
